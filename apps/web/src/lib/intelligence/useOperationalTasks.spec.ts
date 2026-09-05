import React from 'react'
import { useOperationalTasks } from './useOperationalTasks'
import { fetchOperationalSnapshot } from './actionCenterData'
import type { DashboardActionCenterSnapshot } from './actionCenterEngine'

jest.mock('./actionCenterData', () => ({ fetchOperationalSnapshot: jest.fn() }))
const fetchSnapshot = fetchOperationalSnapshot as jest.Mock
const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
const clearSnapshot: DashboardActionCenterSnapshot = {
  role: 'factory_owner',
  loads: [],
  bookings: [],
  notifications: { notifications: [] },
  entitlement: { status: 'active', hasPremiumAccess: true, expiresAt: '2099-01-01' },
}

describe('useOperationalTasks live-data lifecycle', () => {
  let values: any[]
  let refs: any[]
  let stateIndex: number
  let refIndex: number
  let effects: React.EffectCallback[]
  let cleanup: ReturnType<React.EffectCallback>
  const originalWindow = global.window
  const originalStorage = global.localStorage

  function render(options: Parameters<typeof useOperationalTasks>[0] = { role: 'factory_owner' }) {
    stateIndex = 0
    refIndex = 0
    effects = []
    return useOperationalTasks({ refreshIntervalMs: 0, ...options })
  }
  function startFetch() { cleanup = effects[1]() }

  beforeEach(() => {
    values = []
    refs = []
    cleanup = undefined
    jest.resetAllMocks()
    Object.defineProperty(global, 'window', { configurable: true, value: { addEventListener: jest.fn(), removeEventListener: jest.fn() } })
    Object.defineProperty(global, 'localStorage', { configurable: true, value: { getItem: jest.fn(() => JSON.stringify({ role: 'truck_owner' })) } })
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
    fetchSnapshot.mockResolvedValue(clearSnapshot)
  })

  afterEach(() => {
    if (cleanup) cleanup()
    jest.restoreAllMocks()
    Object.defineProperty(global, 'window', { configurable: true, value: originalWindow })
    Object.defineProperty(global, 'localStorage', { configurable: true, value: originalStorage })
  })

  it('is loading until the first cycle settles and exposes a real empty result', async () => {
    expect(render()).toMatchObject({ loading: true, loaded: false, tasks: [] })
    startFetch()
    await flush()
    expect(render()).toMatchObject({ loading: false, loaded: true, tasks: [], unavailableSources: [] })
  })

  it('waits for a cached role and normalizes it before requesting data', async () => {
    render({})
    startFetch()
    expect(fetchSnapshot).not.toHaveBeenCalled()
    effects[0]()
    render({})
    startFetch()
    expect(fetchSnapshot).toHaveBeenCalledWith('truck_driver', expect.any(AbortSignal))
    await flush()
  })

  it('clears resolved tasks on refresh and does not retain stale work after a failed cycle', async () => {
    fetchSnapshot.mockResolvedValueOnce({ ...clearSnapshot, loads: [{ id: 'l-1', status: 'Open' }] })
    render(); startFetch(); await flush()
    expect(render().tasks.map((task) => task.id)).toEqual(['open-loads-match'])
    await render().refresh()
    expect(render().tasks).toEqual([])
    fetchSnapshot.mockRejectedValueOnce(new Error('offline'))
    await render().refresh()
    expect(render()).toMatchObject({ loaded: true, loading: false, tasks: [] })
    expect(render().unavailableSources).toContain('Loads')
  })

  it('aborts a role’s previous request and ignores its late response', async () => {
    let resolveOld!: (snapshot: DashboardActionCenterSnapshot) => void
    fetchSnapshot.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    render(); startFetch()
    const oldSignal: AbortSignal = fetchSnapshot.mock.calls[0][1]
    if (cleanup) cleanup()
    const options = { role: 'truck_driver' }
    expect(render(options)).toMatchObject({ tasks: [], loaded: false, loading: true })
    fetchSnapshot.mockResolvedValueOnce({ ...clearSnapshot, role: 'truck_driver', trucks: [{ id: 't-1', registrationNumber: 'TN01AB1234', verificationStatus: 'Pending', documents: [] }] })
    startFetch(); await flush()
    expect(oldSignal.aborted).toBe(true)
    const driverIds = render(options).tasks.map((task) => task.id)
    expect(driverIds).toContain('kyc-pending-t-1')
    resolveOld({ ...clearSnapshot, loads: [{ id: 'old-load', status: 'Open' }] })
    await flush()
    expect(render(options).tasks.map((task) => task.id)).toEqual(driverIds)
  })

  it('does not fetch or leak previously loaded tasks when disabled', async () => {
    fetchSnapshot.mockResolvedValueOnce({ ...clearSnapshot, loads: [{ id: 'l-1', status: 'Open' }] })
    render(); startFetch(); await flush()
    if (cleanup) cleanup()
    expect(render({ enabled: false, role: 'factory_owner' })).toMatchObject({ tasks: [], loaded: false, loading: false })
    startFetch()
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
  })

  it('refreshes on browser focus and removes the listener when unmounted', async () => {
    render(); startFetch(); await flush()
    const add = window.addEventListener as jest.Mock
    const callback = add.mock.calls.find(([event]) => event === 'focus')![1]
    callback(); await flush()
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    if (cleanup) cleanup()
    cleanup = undefined
    expect(window.removeEventListener).toHaveBeenCalledWith('focus', callback)
  })
})
