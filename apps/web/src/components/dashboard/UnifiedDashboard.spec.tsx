import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UnifiedDashboard } from './UnifiedDashboard'
import { ActionCenterCard } from '@/components/intelligence/ActionCenterCard'
import { api, usersApi } from '@/lib/api'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/dashboard' }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))
jest.mock('@/components/layout', () => ({ Footer: () => null }))
jest.mock('@/components/intelligence', () => jest.requireActual('@/components/intelligence/ActionCenterCard'))
jest.mock('@/lib/api', () => ({ api: { get: jest.fn() }, usersApi: { getActivity: jest.fn() }, authApi: { logout: jest.fn() } }))

function descendants(node: React.ReactNode): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(descendants)
  if (!React.isValidElement(node)) return []
  return [node, ...descendants(node.props.children)]
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
const get = api.get as jest.Mock

describe('UnifiedDashboard → live Operational Action Center', () => {
  let values: any[]
  let refs: any[]
  let stateIndex: number
  let refIndex: number
  let effects: React.EffectCallback[]
  let cleanup: ReturnType<React.EffectCallback>
  let responses: Record<string, unknown>
  const originalWindow = global.window
  const originalStorage = global.localStorage

  function render(props: Parameters<typeof UnifiedDashboard>[0] = {}) {
    stateIndex = 0; refIndex = 0; effects = []
    return UnifiedDashboard(props)
  }
  function card(tree: React.ReactElement) {
    return descendants(tree).find((element) => element.type === ActionCenterCard)!
  }
  async function load(props: Parameters<typeof UnifiedDashboard>[0] = {}) {
    render(props)
    effects[0]() // hydrate the session first
    render(props)
    cleanup = effects[1]()
    await flush()
    return card(render(props))
  }

  beforeEach(() => {
    values = []; refs = []; cleanup = undefined
    jest.resetAllMocks()
    Object.defineProperty(global, 'window', { configurable: true, value: { addEventListener: jest.fn(), removeEventListener: jest.fn() } })
    Object.defineProperty(global, 'localStorage', { configurable: true, value: { getItem: jest.fn(() => JSON.stringify({ role: 'truck_driver' })) } })
    jest.spyOn(React, 'useState').mockImplementation(((initial: any) => {
      const index = stateIndex++
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
      return [values[index], (next: any) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    }) as any)
    jest.spyOn(React, 'useRef').mockImplementation(((initial: any) => {
      const index = refIndex++
      if (!(index in refs)) refs[index] = { current: initial }
      return refs[index]
    }) as any)
    jest.spyOn(React, 'useMemo').mockImplementation((factory) => factory())
    jest.spyOn(React, 'useCallback').mockImplementation((callback) => callback)
    jest.spyOn(React, 'useEffect').mockImplementation((callback) => { effects.push(callback) })
    ;(usersApi.getActivity as jest.Mock).mockResolvedValue({ data: [] })
    responses = {
      '/subscriptions/status': { status: 'active', hasPremiumAccess: true, expiresAt: '2099-01-01' },
      '/notifications': { notifications: [], unreadCount: 0 },
      '/bookings/my-bookings': [],
      '/loads/my-loads': [],
      '/trucks/my-trucks': [{ id: 't-1', registrationNumber: 'TN01AB1234', verificationStatus: 'Verified' }],
      '/users/documents': { documents: [
        { id: 'rc', truckId: 't-1', type: 'RC', verificationStatus: 'Verified' },
        { id: 'ins', truckId: 't-1', type: 'Insurance', verificationStatus: 'Verified' },
      ], totalCount: 2 },
      // This search result is someone else's lorry, never the shipper's KYC.
      '/search/trucks?lat=19.0760&lng=72.8777&radius=100': [{ id: 'nearby', verificationStatus: 'Pending', documents: [] }],
    }
    get.mockImplementation((url: string) => Promise.resolve({ data: responses[url] }))
  })

  afterEach(() => {
    if (cleanup) cleanup()
    jest.restoreAllMocks()
    Object.defineProperty(global, 'window', { configurable: true, value: originalWindow })
    Object.defineProperty(global, 'localStorage', { configurable: true, value: originalStorage })
  })

  it('starts with a skeleton, waits for the stored role and renders the healthy driver empty state', async () => {
    expect(card(render()).props.loading).toBe(true)
    expect(get).not.toHaveBeenCalled()
    const panel = await load()
    expect(renderToStaticMarkup(panel)).toContain('No urgent actions')
    expect(panel.props.tasks).toEqual([])
    const urls = get.mock.calls.map(([url]) => url)
    expect(urls).toContain('/trucks/my-trucks')
    expect(urls).not.toContain('/loads/my-loads')
    expect(urls.filter((url) => url === '/subscriptions/status')).toHaveLength(1)
  })

  it('derives shipper payments, E-Way Bill, open loads and failed WhatsApp tasks from API data only', async () => {
    responses['/loads/my-loads'] = [{ id: 'l-1', status: 'Open', _count: { bookings: 0 } }]
    responses['/bookings/my-bookings'] = [
      { id: 'b-1', status: 'Confirmed', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: '30000', ewayBillNumber: null, ewayBillStatus: 'Pending', whatsappTriggerStatus: 'Failed' },
      { id: 'b-2', status: 'Completed', advanceConfirmed: true, balanceConfirmed: false, agreedPrice: '40000' },
    ]
    responses['/notifications'] = { notifications: [{ id: 'n-1', channel: 'whatsapp', providerStatus: 'failed' }] }
    const panel = await load({ roleOverride: 'factory_owner' })
    expect(panel.props.tasks.map((task: any) => task.id)).toEqual([
      'advance-pending-b-1', 'eway-missing-b-1', 'balance-pending-b-2', 'whatsapp-failed-b-1', 'whatsapp-delivery-failed', 'open-loads-match',
    ])
    expect(panel.props.unavailableSources).toEqual([])
    expect(renderToStaticMarkup(panel)).toContain('₹15,000')
    const urls = get.mock.calls.map(([url]) => url)
    expect(urls).not.toContain('/trucks/my-trucks')
    expect(urls).not.toContain('/users/documents')
  })

  it('does not synthesize fleet registration or subscription work on API failure', async () => {
    get.mockRejectedValue(new Error('offline'))
    const panel = await load({ roleOverride: 'truck_driver' })
    expect(panel.props.tasks).toEqual([])
    expect(panel.props.loading).toBe(false)
    const html = renderToStaticMarkup(panel)
    expect(html).toContain('Action data unavailable')
    expect(html).not.toContain('No urgent actions')
    expect(html).not.toContain('Register Your First Lorry')
  })

  it('keeps malformed fleet rows out of both the dashboard lists and task derivation', async () => {
    responses['/trucks/my-trucks'] = [null]
    const panel = await load({ roleOverride: 'truck_driver' })
    expect(panel.props.tasks).toEqual([])
    expect(panel.props.unavailableSources).toContain('Fleet')
    expect(renderToStaticMarkup(panel)).toContain('Action data unavailable')
  })

  it('opens both marketplace sides for the transporter workspace', async () => {
    responses['/loads/my-loads'] = [{ id: 'l-1', status: 'Open', _count: { bookings: 0 } }]
    const panel = await load({ roleOverride: 'transporter' })
    const urls = get.mock.calls.map(([url]) => url)
    // One workspace: own freight posts and own truck listings together…
    expect(urls).toContain('/loads/my-loads')
    expect(urls).toContain('/trucks/my-trucks')
    expect(urls).toContain('/users/documents')
    // …and the fleet panel reads the transporter's own trucks, never a nearby
    // search result that happens to belong to someone else.
    expect(urls).not.toContain('/search/trucks?lat=19.0760&lng=72.8777&radius=100')
    expect(panel.props.tasks.map((task: any) => task.id)).toContain('open-loads-match')
    expect(panel.props.unavailableSources).toEqual([])
  })

  it('refreshes from the API and clears resolved actions', async () => {
    responses['/bookings/my-bookings'] = [{ id: 'b-1', status: 'Completed', advanceConfirmed: true, balanceConfirmed: false, agreedPrice: 30000 }]
    const panel = await load({ roleOverride: 'factory_owner' })
    expect(panel.props.tasks.map((task: any) => task.id)).toEqual(['balance-pending-b-1'])
    responses['/bookings/my-bookings'] = [{ id: 'b-1', status: 'Completed', advanceConfirmed: true, balanceConfirmed: true, agreedPrice: 30000 }]
    await panel.props.onRetry()
    const refreshed = card(render({ roleOverride: 'factory_owner' }))
    expect(refreshed.props.tasks).toEqual([])
    expect(renderToStaticMarkup(refreshed)).toContain('No urgent actions')
  })
})
