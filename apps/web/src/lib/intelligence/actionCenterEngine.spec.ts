import {
  deriveDashboardActionTasks,
  mapEntitlement,
  getActionCenterUnavailableSources,
  summarizeOperationalTasks,
} from './actionCenterEngine'

/**
 * These specs cover the web adapter: real REST payloads (`/trucks/my-trucks`,
 * `/bookings/my-bookings`, `/users/documents`, `/notifications`,
 * `/subscriptions/status`, `/admin/stats`) → Operational Action Center tasks.
 */
describe('deriveDashboardActionTasks (web adapter)', () => {
  const now = new Date('2026-09-04T00:00:00.000Z')

  it('returns no tasks when nothing has loaded yet — never sample data', () => {
    expect(deriveDashboardActionTasks({ role: 'factory_owner' })).toEqual([])
    expect(deriveDashboardActionTasks({ role: 'truck_driver' })).toEqual([])
    expect(deriveDashboardActionTasks({ role: 'admin' })).toEqual([])
  })

  it('normalizes legacy role labels from cached sessions', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'load_owner',
      loads: [{ id: 'l-1', status: 'Open', tonnageRequired: 12, loadingAddress: 'Coimbatore' }],
    })

    expect(tasks.map((t) => t.id)).toEqual(['open-loads-match'])
  })

  it('derives the full shipper task set from live API payloads', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'factory_owner',
      loads: [
        { id: 'l-1', status: 'Open', tonnageRequired: 12, loadingAddress: 'Coimbatore' },
        { id: 'l-2', status: 'Matched', tonnageRequired: 9, loadingAddress: 'Erode' },
      ],
      bookings: [
        {
          id: 'bk-advance',
          status: 'Pending',
          advanceConfirmed: false,
          balanceConfirmed: false,
          agreedPrice: '30000',
          load: { loadingAddress: 'Erode, TN', unloadingAddress: 'Kochi, KL' },
        },
        {
          id: 'bk-eway',
          status: 'InTransit',
          ewayBillNumber: null,
          ewayBillStatus: 'Pending',
          advanceConfirmed: true,
          balanceConfirmed: false,
          agreedPrice: 42000,
          load: { loadingAddress: 'Hosur, TN', unloadingAddress: 'Pune, MH' },
        },
        {
          id: 'bk-balance',
          status: 'Completed',
          advanceConfirmed: true,
          balanceConfirmed: false,
          agreedPrice: 50000,
        },
      ],
      entitlement: { status: 'expired', hasPremiumAccess: false, expiresAt: '2026-08-01' },
      now,
    })

    const ids = tasks.map((t) => t.id)
    expect(ids).toContain('advance-pending-bk-advance')
    expect(ids).toContain('eway-missing-bk-eway')
    expect(ids).toContain('balance-pending-bk-balance')
    expect(ids).toContain('open-loads-match')
    expect(ids).toContain('sub-expired')

    // Urgency ordering is preserved for the card.
    expect(tasks[tasks.length - 1].id).toBe('open-loads-match')
    // Prices arriving as strings from Prisma Decimal are still formatted.
    expect(tasks.find((t) => t.id === 'advance-pending-bk-advance')?.title).toBe(
      'Loading Advance Due: ₹15,000'
    )
  })

  it('derives fleet compliance tasks from /trucks/my-trucks and /users/documents', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'truck_driver',
      trucks: [
        { id: 'tr-1', registrationNumber: 'TN-38-Z-9090', verificationStatus: 'Pending' },
        { id: 'tr-2', registrationNumber: 'KA-05-M-1212', verificationStatus: 'Verified' },
      ],
      documents: [
        { id: 'd-1', truckId: 'tr-1', type: 'RC', verificationStatus: 'Pending' },
        { id: 'd-2', truckId: 'tr-2', type: 'RC', verificationStatus: 'Verified' },
        { id: 'd-3', truckId: 'tr-2', type: 'Insurance', verificationStatus: 'Verified' },
      ],
    })

    const ids = tasks.map((t) => t.id)
    expect(ids).toContain('kyc-pending-tr-1')
    expect(ids).toContain('doc-unverified-d-1')
    expect(ids).toContain('doc-missing-insurance-tr-1')
    // A fully verified vehicle produces no compliance noise.
    expect(ids.filter((id) => id.endsWith('tr-2'))).toEqual([])
  })

  it('surfaces failed WhatsApp triggers from the notification feed', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'truck_driver',
      notifications: [
        { id: 'n-1', channel: 'whatsapp', providerStatus: 'Failed', title: 'New match' },
        { id: 'n-2', channel: 'whatsapp', providerStatus: 'Delivered' },
      ],
    })

    expect(tasks.map((t) => t.id)).toEqual(['whatsapp-delivery-failed'])
  })

  it('derives the admin moderation queue from /admin/stats', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'admin',
      adminStats: { pendingDocuments: 3, expiredTrials: 2 },
    })

    expect(tasks.map((t) => t.id)).toEqual(['admin-kyc-queue', 'admin-expired-trials'])
    expect(tasks[0].actionUrl).toBe('/admin/kyc')
  })

  it('caps the task list when the surface asks for a compact view', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'factory_owner',
      loads: [{ id: 'l-1', status: 'Open', tonnageRequired: 12, loadingAddress: 'Salem' }],
      bookings: [
        { id: 'bk-1', status: 'Pending', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 10000 },
      ],
      maxTasks: 1,
    })

    expect(tasks).toHaveLength(1)
    expect(tasks[0].urgency).toBe('HIGH')
  })

  it('summarizes tasks for navbar counters', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'factory_owner',
      loads: [{ id: 'l-1', status: 'Open', tonnageRequired: 12, loadingAddress: 'Salem' }],
      bookings: [
        { id: 'bk-1', status: 'Pending', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 10000 },
      ],
    })

    expect(summarizeOperationalTasks(tasks)).toEqual({ total: 2, high: 1, medium: 0, low: 1 })
  })
})

describe('mapEntitlement', () => {
  it('maps an active free trial to a trial entitlement', () => {
    expect(
      mapEntitlement({
        status: 'trial',
        hasSubscription: true,
        hasPremiumAccess: true,
        isTrialActive: true,
        trialEndsAt: '2026-09-10T00:00:00.000Z',
        trialDaysRemaining: 6,
        plan: 'free_trial',
      })
    ).toEqual({
      hasSubscription: true,
      subscription: {
        isActive: true,
        status: 'trial',
        plan: 'free_trial',
        isTrial: true,
        expiresAt: '2026-09-10T00:00:00.000Z',
        daysRemaining: 6,
      },
    })
  })

  it('maps a lapsed entitlement to an expired subscription', () => {
    const { subscription, hasSubscription } = mapEntitlement({
      status: 'expired',
      hasPremiumAccess: false,
      expiresAt: '2026-01-01T00:00:00.000Z',
    })

    expect(hasSubscription).toBe(false)
    expect(subscription?.isActive).toBe(false)
    expect(subscription?.status).toBe('expired')
  })

  it('returns an empty mapping when the endpoint has not answered', () => {
    expect(mapEntitlement(null)).toEqual({})
  })
})

describe('real dashboard response shapes and partial failure', () => {
  const now = '2026-09-05T00:00:00Z'
  const healthy = {
    role: 'truck_driver',
    now,
    trucks: [{ id: 't-1', registrationNumber: 'TN01AB1234', verificationStatus: 'Verified' }],
    documents: {
      documents: [
        { id: 'rc-1', truckId: 't-1', type: 'RC', verificationStatus: 'Verified' },
        { id: 'ins-1', truckId: 't-1', type: 'Insurance', verificationStatus: 'Verified' },
      ],
      totalCount: 2,
      verifiedCount: 2,
      pendingCount: 0,
      rejectedCount: 0,
    },
    bookings: [],
    notifications: { notifications: [], unreadCount: 0 },
    entitlement: { status: 'active', hasPremiumAccess: true, expiresAt: '2026-12-05T00:00:00Z' },
  }

  it('reads the documents envelope instead of generating false missing-document tasks', () => {
    expect(deriveDashboardActionTasks(healthy)).toEqual([])
    expect(getActionCenterUnavailableSources(healthy)).toEqual([])
  })

  it('surfaces pending and rejected documents from the real envelope', () => {
    const tasks = deriveDashboardActionTasks({
      ...healthy,
      trucks: [{ ...healthy.trucks[0], verificationStatus: 'Rejected' }],
      documents: { documents: [
        { ...healthy.documents.documents[0], verificationStatus: 'Pending' },
        { ...healthy.documents.documents[1], verificationStatus: 'Rejected' },
      ] },
    })
    expect(tasks.map((task) => task.id)).toEqual(['kyc-rejected-t-1', 'doc-rejected-ins-1', 'doc-unverified-rc-1'])
  })

  it('does not confuse nearby truck search results with the factory owner’s fleet', () => {
    const snapshot = { ...healthy, role: 'factory_owner', trucks: [{ id: 'nearby', verificationStatus: 'Rejected', documents: [] }], loads: [] }
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources({ ...snapshot, documents: undefined })).toEqual([])
  })

  it.each([undefined, null, {}, { trucks: [] }, [null], [{}]])('does not fabricate a fleet-empty task from unavailable/malformed trucks: %p', (trucks) => {
    const snapshot = { ...healthy, trucks }
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toContain('Fleet')
  })

  it('distinguishes an explicitly empty fleet from a failed fleet request', () => {
    expect(deriveDashboardActionTasks({ ...healthy, trucks: [] }).map((task) => task.id)).toEqual(['fleet-empty'])
    expect(getActionCenterUnavailableSources({ ...healthy, trucks: [], documents: undefined })).toEqual([])
  })

  it('uses embedded truck documents when the signed-document endpoint fails', () => {
    const snapshot = { ...healthy, trucks: [{ ...healthy.trucks[0], documents: healthy.documents.documents }], documents: undefined }
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual([])
  })

  it('reports unavailable documents without inventing missing RC/insurance', () => {
    const snapshot = { ...healthy, documents: { message: 'Unavailable' } }
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual(['Vehicle documents'])
  })

  it('keeps valid work when other sources fail', () => {
    const snapshot = { role: 'factory_owner', entitlement: null, bookings: null, loads: [{ id: 'l-1', status: 'Open', _count: { bookings: 0 } }] }
    expect(deriveDashboardActionTasks(snapshot).map((task) => task.id)).toEqual(['open-loads-match'])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual(['Subscription', 'Trips', 'WhatsApp alerts'])
  })

  it('reads failed WhatsApp delivery from the envelope, not the unread count', () => {
    const tasks = deriveDashboardActionTasks({
      ...healthy,
      notifications: { unreadCount: 20, notifications: [
        { id: 'failed', channel: 'whatsapp', providerStatus: 'failed', read: true },
        { id: 'skipped', channel: 'whatsapp', providerStatus: 'skipped', read: false },
        { id: 'sent', channel: 'whatsapp', providerStatus: 'sent', read: false },
      ] },
    })
    expect(tasks.map((task) => task.id)).toEqual(['whatsapp-delivery-failed'])
    expect(tasks[0].title).toBe('1 WhatsApp Alert Not Delivered')
  })

  it('uses load booking counts and related bookings to exclude already-matched loads', () => {
    const tasks = deriveDashboardActionTasks({
      role: 'factory_owner',
      loads: [{ id: 'l-1', status: 'Open', _count: { bookings: 1 } }],
      bookings: [{ id: 'b-1', loadId: 'l-1', status: 'Confirmed', advanceConfirmed: true, ewayBillNumber: '123456789012' }],
    })
    expect(tasks).toEqual([])
  })

  it('does not invent payments or compliance on partial booking records', () => {
    expect(deriveDashboardActionTasks({ role: 'factory_owner', bookings: [{ id: 'b-1', status: 'Confirmed' }] })).toEqual([])
  })

  it('does not default an unknown or unresolved role to factory owner', () => {
    for (const role of [undefined, null, 'unknown']) {
      expect(deriveDashboardActionTasks({ ...healthy, role, entitlement: { status: 'expired' } })).toEqual([])
    }
  })

  it('maps active trials with no paid subscription and expired trials correctly', () => {
    const trial = { status: 'trial', hasSubscription: false, hasPremiumAccess: true, isTrialActive: true, plan: null, expiresAt: null, trialEndsAt: '2026-09-10T00:00:00Z', trialDaysRemaining: 5 }
    const [expiring] = deriveDashboardActionTasks({ ...healthy, entitlement: trial })
    expect(expiring.id).toBe('sub-expiring')
    expect(expiring.title).toBe('Free Trial Ends in 5 Days')
    const [expired] = deriveDashboardActionTasks({ ...healthy, entitlement: { ...trial, status: 'expired', hasPremiumAccess: false, isTrialActive: false, trialEndsAt: '2026-09-01T00:00:00Z', upgradeReason: 'trial_expired' } })
    expect(expired.id).toBe('sub-expired')
    expect(expired.title).toBe('Free Trial Expired')
  })

  it('does not mark a trial expired merely because the paid-subscription flag is false', () => {
    const { subscription, hasSubscription } = mapEntitlement({ hasSubscription: false, isTrialActive: true })
    expect(hasSubscription).toBe(true)
    expect(subscription?.status).toBe('trial')
  })

  it.each([undefined, null, {}, { status: 'unknown' }])('does not turn an unknown entitlement into an expiry: %p', (entitlement) => {
    expect(mapEntitlement(entitlement)).toEqual({})
    expect(deriveDashboardActionTasks({ ...healthy, entitlement })).toEqual([])
    expect(getActionCenterUnavailableSources({ ...healthy, entitlement })).toContain('Subscription')
  })

  it('admin tasks only use moderation signals and no consumer subscription/fleet upsells', () => {
    const snapshot = { ...healthy, role: 'admin', trucks: [], entitlement: { status: 'expired' }, loads: [{ id: 'l-1', status: 'Open' }], adminStats: { pendingDocuments: 1, expiredTrials: 0 } }
    expect(deriveDashboardActionTasks(snapshot).map((task) => task.id)).toEqual(['admin-kyc-queue'])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources({ ...snapshot, adminStats: undefined })).toEqual(['Moderation queues'])
  })
})
