import {
  deriveDashboardActionTasks,
  mapEntitlement,
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
