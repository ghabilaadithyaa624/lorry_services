import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReturnLoadsPanel } from './ReturnLoadsPanel'
import { matchesApi } from '@/lib/api'
import { returnLoadsFixture } from '@/test/fixtures/returnLoads'

jest.mock('@/lib/api', () => ({ matchesApi: { getReturnLoads: jest.fn() } }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))

const trucks = [
  { id: 'pending-truck', registrationNumber: 'TN01AA0001', verificationStatus: 'Pending' },
  { id: 'truck-1', registrationNumber: 'KA01AB1234', verificationStatus: 'Verified' },
]

function descendants(node: React.ReactNode): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(descendants)
  if (!React.isValidElement(node)) return []
  return [node, ...descendants(node.props.children)]
}

// A small hook harness follows this repo's component-test convention; effects
// are explicitly started/cleaned up so cancellation and late responses are tested.
describe('ReturnLoadsPanel', () => {
  let values: any[]
  let stateIndex: number
  let effect: React.EffectCallback
  let cleanup: ReturnType<React.EffectCallback>
  const getReturnLoads = matchesApi.getReturnLoads as jest.Mock
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

  function render(fleet = trucks) {
    stateIndex = 0
    return ReturnLoadsPanel({ trucks: fleet })
  }
  function startEffect() { cleanup = effect() }

  beforeEach(() => {
    values = []
    cleanup = undefined
    jest.resetAllMocks()
    jest.spyOn(React, 'useState').mockImplementation(((initial: any) => {
      const index = stateIndex++
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
      return [values[index], (next: any) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    }) as any)
    jest.spyOn(React, 'useEffect').mockImplementation((callback) => { effect = callback })
    getReturnLoads.mockResolvedValue({ data: returnLoadsFixture() })
  })
  afterEach(() => { if (cleanup) cleanup(); jest.restoreAllMocks() })

  it('does not request recommendations for an empty fleet', () => {
    const html = renderToStaticMarkup(render([]))
    startEffect()
    expect(html).toContain('Register a truck')
    expect(getReturnLoads).not.toHaveBeenCalled()
  })

  it('selects an owned verified truck and exposes loading then the server-ranked results', async () => {
    const initial = render()
    expect(renderToStaticMarkup(initial)).toContain('Scanning open loads within 50 km')
    startEffect()
    expect(getReturnLoads).toHaveBeenCalledWith('truck-1', { radius: 50, limit: 3 }, expect.any(AbortSignal))
    await flush()
    const html = renderToStaticMarkup(render())
    expect(html).toContain('Bengaluru hub')
    expect(html).toContain('94.5/100')
    expect(html).toContain('8.0 km to pickup')
    expect(html).toContain('Why this rank?')
    expect(html).toContain('href="/subscription"')
    expect(html).not.toContain('tel:')
  })

  it('shows phone links only when the API explicitly unlocks them', async () => {
    const result = returnLoadsFixture({ contactUnlocked: true })
    result.opportunities[0].contact = { locked: false, name: 'Test Shipper', phone: '+919000000002' }
    getReturnLoads.mockResolvedValueOnce({ data: result })
    render(); startEffect(); await flush()
    const html = renderToStaticMarkup(render())
    expect(html).toContain('tel:+919000000002')
    expect(html).toContain('Test Shipper')
    expect(html).not.toContain('Subscribe to unlock')
  })

  it('distinguishes no eligible loads from missing location and discovery failure', async () => {
    getReturnLoads.mockResolvedValueOnce({ data: returnLoadsFixture({ opportunities: [] }) })
    render(); startEffect(); await flush()
    expect(renderToStaticMarkup(render())).toContain('No nearby return loads right now')
    if (cleanup) cleanup()

    const unresolved = returnLoadsFixture({ opportunities: [] })
    unresolved.anchor.source = 'unresolved'
    getReturnLoads.mockResolvedValueOnce({ data: unresolved })
    startEffect(); await flush()
    expect(renderToStaticMarkup(render())).toContain('Vehicle location needed')
    if (cleanup) cleanup()

    getReturnLoads.mockRejectedValueOnce(new Error('offline'))
    startEffect(); await flush()
    const html = renderToStaticMarkup(render())
    expect(html).toContain('could not be loaded')
    expect(html).toContain('Try again')
    expect(html).not.toContain('No nearby return loads right now')
  })

  it('changes the requested radius and clears old results while the new request loads', async () => {
    render(); startEffect(); await flush()
    const tree = render()
    const select = descendants(tree).find((node) => node.props['aria-label'] === 'Return-load pickup radius')!
    expect(descendants(select).filter((node) => node.type === 'option').map((node) => node.props.value)).toEqual([10, 25, 50])
    select.props.onChange({ target: { value: '25' } })
    if (cleanup) cleanup()
    const updated = render()
    expect(renderToStaticMarkup(updated)).not.toContain('94.5/100')
    startEffect()
    expect(getReturnLoads).toHaveBeenLastCalledWith('truck-1', { radius: 25, limit: 3 }, expect.any(AbortSignal))
    await flush()
  })

  it('aborts the previous truck request and ignores a late result, including its contacts', async () => {
    let resolveOld!: (value: unknown) => void
    let resolveNew!: (value: unknown) => void
    getReturnLoads.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    getReturnLoads.mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve }))
    const tree = render(); startEffect()
    const oldSignal: AbortSignal = getReturnLoads.mock.calls[0][2]
    descendants(tree).find((node) => node.props['aria-label'] === 'Truck for return loads')!
      .props.onChange({ target: { value: 'pending-truck' } })
    if (cleanup) cleanup()
    render(); startEffect()
    expect(oldSignal.aborted).toBe(true)
    expect(getReturnLoads).toHaveBeenLastCalledWith('pending-truck', { radius: 50, limit: 3 }, expect.any(AbortSignal))
    const oldData = returnLoadsFixture()
    oldData.opportunities[0].contact = { locked: false, name: 'Old contact', phone: '+919000000009' }
    resolveOld({ data: oldData }); await flush()
    expect(renderToStaticMarkup(render())).not.toContain('Old contact')
    resolveNew({ data: returnLoadsFixture({ opportunities: [] }) }); await flush()
    expect(renderToStaticMarkup(render())).toContain('No nearby return loads right now')
  })

  it('shows body and budget warnings instead of presenting mismatches as guaranteed work', async () => {
    const result = returnLoadsFixture()
    result.opportunities[0].bodyTypeCompatible = false
    result.opportunities[0].budgetFit = false
    getReturnLoads.mockResolvedValueOnce({ data: result })
    render(); startEffect(); await flush()
    const html = renderToStaticMarkup(render())
    expect(html).toContain('Body type mismatch.')
    expect(html).toContain('Budget below benchmark.')
    expect(html).toContain('Subject to shipper confirmation.')
  })
})
