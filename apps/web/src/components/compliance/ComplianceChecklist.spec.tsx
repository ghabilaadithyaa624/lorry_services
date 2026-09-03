import React from 'react'
import { ComplianceChecklist, ComplianceItemRow, FastagStatusControl, ValidateRCButton } from './ComplianceChecklist'
import type { ComplianceChecklist as Checklist } from '@/lib/api'

/**
 * The checklist components are pure function components — invoke them directly
 * with a stubbed React dispatcher and assert on the element tree.
 */
function renderWithStubbedDispatcher(render: () => any) {
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
    return render()
  } finally {
    ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
  }
}

function collectText(element: any): string {
  const rendered = renderTree(element)
  return collectTextOf(rendered)
}

/** Recursively invoke nested function components (a one-level React renderer). */
function renderTree(el: any, depth = 0): any {
  if (depth > 8 || el == null || typeof el === 'boolean') return el
  if (typeof el === 'string' || typeof el === 'number') return el
  if (Array.isArray(el)) return el.map((e) => renderTree(e, depth + 1))
  if (typeof el.type === 'function') {
    return renderTree(el.type(el.props), depth + 1)
  }
  if (el.props?.children !== undefined) {
    return { ...el, props: { ...el.props, children: renderTree(el.props.children, depth + 1) } }
  }
  return el
}

function collectTextOf(element: any): string {
  if (element == null || typeof element === 'boolean') return ''
  if (typeof element === 'string' || typeof element === 'number') return String(element)
  if (Array.isArray(element)) return element.map(collectTextOf).join('')
  if (element.props?.children !== undefined) return collectTextOf(element.props.children)
  return ''
}

const compliantChecklist: Checklist = {
  scope: 'booking',
  scopeId: 'bk-1',
  registrationNumber: 'MH12QW8842',
  overall: 'compliant',
  checkedAt: '2026-09-03T00:00:00.000Z',
  items: [
    {
      key: 'rc_vahan',
      label: 'RC verified via Vahan',
      status: 'compliant',
      detail: 'Registration is ACTIVE in Vahan records · Tata LPT 3118',
      source: 'vahan_api',
      verifiedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      key: 'eway_bill',
      label: 'E-Way Bill',
      status: 'compliant',
      detail: 'E-Way Bill #381234567890 is active until 2026-09-05.',
      source: 'booking',
      expiresAt: '2026-09-05T00:00:00.000Z',
    },
    {
      key: 'fastag',
      label: 'FASTag status',
      status: 'action_required',
      detail: 'FASTag balance is low — recharge now.',
      source: 'manual',
    },
  ],
}

describe('ComplianceChecklist components', () => {
  it('renders all checklist items with an overall badge', () => {
    const element = renderWithStubbedDispatcher(() => ComplianceChecklist({ checklist: compliantChecklist }))
    const text = collectText(element)

    expect(text).toContain('Compliance Checklist')
    expect(text).toContain('MH12QW8842')
    expect(text).toContain('RC verified via Vahan')
    expect(text).toContain('E-Way Bill #381234567890 is active')
    expect(text).toContain('FASTag status')
    expect(text).toContain('Action Required') // overall badge (action_required wins over compliant)
    expect(text).toContain('2/3 checks passed')
  })

  it('renders a loading skeleton before data arrives', () => {
    const element = renderWithStubbedDispatcher(() => ComplianceChecklist({ checklist: null, loading: true }))
    expect(collectText(element)).toBe('')
    expect(collectText(element)).toBe('')
    expect(JSON.stringify(element)).toContain('animate-pulse')
  })

  it('renders a retry state when unavailable and onRetry is provided', () => {
    const onRetry = jest.fn()
    const element = renderWithStubbedDispatcher(() =>
      ComplianceChecklist({ checklist: null, loading: false, onRetry })
    )
    expect(collectText(element)).toContain('Compliance snapshot unavailable')
  })

  it('renders nothing when unavailable without a retry handler', () => {
    const element = renderWithStubbedDispatcher(() => ComplianceChecklist({ checklist: null, loading: false }))
    expect(element).toBeNull()
  })

  it('renders footer content (e.g. the E-Way Bill editor)', () => {
    const element = renderWithStubbedDispatcher(() =>
      ComplianceChecklist({
        checklist: compliantChecklist,
        footer: React.createElement('form', { id: 'eway-form' }),
      })
    )
    const text = collectText(element)
    expect(text).toContain('Compliance Checklist')
    // Footer form child present in the tree
    const children = React.Children.toArray(element.props.children) as React.ReactElement[]
    expect(children.some((c) => c?.props?.id === 'eway-form')).toBe(true)
  })
})

describe('ComplianceItemRow', () => {
  it('shows the source, expiry and status of an item', () => {
    const element = renderWithStubbedDispatcher(() =>
      ComplianceItemRow({
        item: {
          key: 'eway_bill',
          label: 'E-Way Bill',
          status: 'expired',
          detail: 'E-Way Bill expired on 2026-08-01.',
          source: 'booking',
          expiresAt: '2026-08-01T00:00:00.000Z',
        },
      })
    )

    const text = collectText(element)
    expect(text).toContain('Expired')
    expect(text).toContain('src: Booking')
    expect(text).toContain('valid till 1 Aug 2026')
  })
})

describe('FastagStatusControl', () => {
  it('renders three FASTag states with the active one highlighted', () => {
    const element = renderWithStubbedDispatcher(() => FastagStatusControl({ value: 'Active', onChange: jest.fn() }))
    const text = collectText(element)
    expect(text).toContain('Active')
    expect(text).toContain('Low Balance')
    expect(text).toContain('Inactive')
  })
})

describe('ValidateRCButton', () => {
  it('shows the last validation date', () => {
    const element = renderWithStubbedDispatcher(() =>
      ValidateRCButton({ onClick: jest.fn(), validatedAt: '2026-09-01T00:00:00.000Z' })
    )
    expect(collectText(element)).toContain('Validate RC via Vahan')
    expect(collectText(element)).toContain('Sept 2026')
  })

  it('shows a validating state while loading', () => {
    const element = renderWithStubbedDispatcher(() =>
      ValidateRCButton({ onClick: jest.fn(), loading: true })
    )
    expect(collectText(element)).toContain('Validating…')
  })
})
