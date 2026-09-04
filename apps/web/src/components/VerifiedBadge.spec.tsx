import React from 'react'
import { VerifiedBadge } from './VerifiedBadge'

/**
 * VerifiedBadge is a pure function component, so we invoke it directly
 * (with a stubbed React dispatcher) and assert on the produced element tree —
 * the same lightweight pattern used by AddressAutocomplete.spec.tsx.
 */
function renderWithStubbedDispatcher(props: Record<string, unknown>) {
  const mockDispatcher = {
    readContext: jest.fn(),
    useCallback: (fn: any) => fn,
    useContext: jest.fn(),
    useEffect: jest.fn(),
    useImperativeHandle: jest.fn(),
    useLayoutEffect: jest.fn(),
    useMemo: (fn: any) => fn(),
    useReducer: jest.fn(),
    useRef: (initial: any) => ({ current: initial }),
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, jest.fn()],
    useDebugValue: jest.fn(),
    useDeferredValue: (value: any) => value,
    useTransition: () => [false, jest.fn()],
    useId: () => 'test-id-1',
  }

  const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
  const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
  ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

  try {
    return VerifiedBadge(props as any)
  } finally {
    ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
  }
}

function collectText(element: any): string {
  if (element == null || typeof element === 'boolean') return ''
  if (typeof element === 'string' || typeof element === 'number') return String(element)
  if (Array.isArray(element)) return element.map(collectText).join('')
  if (element.props?.children) return collectText(element.props.children)
  return ''
}

describe('VerifiedBadge component', () => {
  it('shows the Vahan Verified label when verified', () => {
    const element = renderWithStubbedDispatcher({ verified: true, source: 'vahan' })
    expect(collectText(element)).toContain('Vahan Verified')
    expect(element.props.title).toContain('Vahan (mParivahan)')
  })

  it('shows a pending state when not verified', () => {
    const element = renderWithStubbedDispatcher({ verified: false })
    expect(collectText(element)).toContain('Verification Pending')
    expect(element.props.title).toContain('pending')
  })

  it('renders the rejected tone with explicit override', () => {
    const element = renderWithStubbedDispatcher({ verified: false, tone: 'rejected' })
    expect(collectText(element)).toContain('Verification Rejected')
  })

  it('renders the action_required tone with explicit override', () => {
    const element = renderWithStubbedDispatcher({ verified: false, tone: 'action_required' })
    expect(collectText(element)).toContain('Action Required')
  })

  it('applies dark variant styling', () => {
    const light = renderWithStubbedDispatcher({ verified: true, variant: 'light' })
    const dark = renderWithStubbedDispatcher({ verified: true, variant: 'dark' })
    expect(String(dark.props.className)).toContain('bg-emerald-950/60')
    expect(String(light.props.className)).toContain('bg-emerald-50')
  })

  it('surfaces the validation date in the tooltip', () => {
    const element = renderWithStubbedDispatcher({
      verified: true,
      validatedAt: '2026-09-01T00:00:00.000Z',
    })
    expect(element.props.title).toContain('2026')
  })
})
