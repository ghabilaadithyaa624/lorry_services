import { api } from '@/lib/api'
import { fetchOperationalSnapshot } from './actionCenterData'
import { deriveDashboardActionTasks, getActionCenterUnavailableSources } from './actionCenterEngine'

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }))
const get = api.get as jest.Mock

const responses: Record<string, unknown> = {
  '/subscriptions/status': { status: 'active', hasPremiumAccess: true, expiresAt: '2099-01-01T00:00:00Z' },
  '/notifications': { notifications: [], unreadCount: 0 },
  '/bookings/my-bookings': [],
  '/loads/my-loads': [],
  '/trucks/my-trucks': [{ id: 't-1', registrationNumber: 'TN01AB1234', verificationStatus: 'Verified' }],
  '/users/documents': { documents: [
    { id: 'rc', truckId: 't-1', type: 'RC', verificationStatus: 'Verified' },
    { id: 'ins', truckId: 't-1', type: 'Insurance', verificationStatus: 'Verified' },
  ], totalCount: 2 },
  '/admin/stats': { pendingDocuments: 2, expiredTrials: 0 },
}

describe('fetchOperationalSnapshot', () => {
  beforeEach(() => {
    get.mockReset().mockImplementation((url: string) => Promise.resolve({ data: responses[url] }))
  })

  it('requests factory-owner work only and fetches entitlement once', async () => {
    const snapshot = await fetchOperationalSnapshot('factory_owner')
    expect(get.mock.calls.map(([url]) => url)).toEqual([
      '/subscriptions/status', '/notifications', '/bookings/my-bookings', '/loads/my-loads',
    ])
    expect(snapshot.trucks).toBeUndefined()
    expect(snapshot.documents).toBeUndefined()
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual([])
  })

  it('preserves driver document/notification envelopes for the REST adapter', async () => {
    const snapshot = await fetchOperationalSnapshot('truck_driver')
    expect(get.mock.calls.map(([url]) => url)).toEqual([
      '/subscriptions/status', '/notifications', '/bookings/my-bookings', '/trucks/my-trucks', '/users/documents',
    ])
    expect(snapshot.documents).toBe(responses['/users/documents'])
    expect(snapshot.loads).toBeUndefined()
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual([])
  })

  it('fetches both marketplace sides for transporters', async () => {
    const snapshot = await fetchOperationalSnapshot('transporter')
    expect(get.mock.calls.map(([url]) => url)).toEqual([
      '/subscriptions/status', '/notifications', '/bookings/my-bookings',
      '/trucks/my-trucks', '/users/documents', '/loads/my-loads',
    ])
    // Own listings and own fleet arrive together — one workspace, both sides.
    expect(snapshot.loads).toEqual([])
    expect(snapshot.trucks).toEqual(responses['/trucks/my-trucks'])
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toEqual([])
  })

  it('restricts admin requests to real moderation aggregates', async () => {
    const snapshot = await fetchOperationalSnapshot('admin')
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][0]).toBe('/admin/stats')
    expect(deriveDashboardActionTasks(snapshot).map((task) => task.id)).toEqual(['admin-kyc-queue'])
  })

  it('omits failed sources without discarding real work from successful sources', async () => {
    get.mockImplementation((url: string) => url === '/loads/my-loads'
      ? Promise.resolve({ data: [{ id: 'l-1', status: 'Open', _count: { bookings: 0 } }] })
      : Promise.reject(new Error('offline')))
    const snapshot = await fetchOperationalSnapshot('factory_owner')
    expect(snapshot.bookings).toBeUndefined()
    expect(snapshot.entitlement).toBeUndefined()
    expect(snapshot.notifications).toBeUndefined()
    expect(deriveDashboardActionTasks(snapshot).map((task) => task.id)).toEqual(['open-loads-match'])
    expect(getActionCenterUnavailableSources(snapshot)).toHaveLength(3)
  })

  it('does not substitute an empty fleet, expired pass or sample task on complete failure', async () => {
    get.mockRejectedValue(new Error('offline'))
    const snapshot = await fetchOperationalSnapshot('truck_driver')
    expect(deriveDashboardActionTasks(snapshot)).toEqual([])
    expect(getActionCenterUnavailableSources(snapshot)).toHaveLength(5)
  })

  it('passes cancellation to every request', async () => {
    const { signal } = new AbortController()
    await fetchOperationalSnapshot('truck_driver', signal)
    expect(get.mock.calls.every(([, config]) => config.signal === signal)).toBe(true)
  })
})
