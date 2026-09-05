import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActionCenterCard } from './ActionCenterCard'
import type { OperationalTask } from '@/lib/intelligence/actionCenterEngine'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

const tasks: OperationalTask[] = [
  {
    id: 'doc-missing-rc-truck-1',
    title: 'Registration Certificate (RC) Missing: TN01AB1234',
    description: 'Upload the RC for this lorry.',
    category: 'COMPLIANCE',
    urgency: 'HIGH',
    actionUrl: '/documents',
    actionLabel: 'Upload RC',
  },
  {
    id: 'advance-awaiting-booking-1',
    title: 'Loading advance pending: ₹15,000',
    description: 'The shipper has not confirmed the advance.',
    category: 'PAYMENT',
    urgency: 'MEDIUM',
    actionUrl: '/booking/booking-1',
    actionLabel: 'Open Trip',
  },
]

function descendants(node: React.ReactNode): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(descendants)
  if (!React.isValidElement(node)) return []
  return [node, ...descendants(node.props.children)]
}

describe('ActionCenterCard', () => {
  it('can hide an empty panel on opt-in surfaces', () => {
    expect(ActionCenterCard({ tasks: [] })).toBeNull()
  })

  it('renders real task text, semantic urgency badges, operational values and accessible links', () => {
    const html = renderToStaticMarkup(<ActionCenterCard tasks={tasks} />)
    expect(html).toContain('Operational Action Center')
    expect(html).toContain('2 Actions Required')
    expect(html).toContain('href="/documents"')
    expect(html).toContain('aria-label="Upload RC for Registration Certificate (RC) Missing: TN01AB1234"')
    expect(html).toContain('href="/booking/booking-1"')
    expect(html).toContain('font-mono tabular-nums')
    expect(html).toContain('bg-danger-500/10')
    expect(html).toContain('bg-amber-500/10')
    expect(html).toContain('bg-panel')
    expect(html).toContain('border-white/10')
    expect(html).toContain('bg-primary-500 hover:bg-primary-600')
    expect(html).toContain('focus-visible:ring-2')
    expect(html.match(/<li /g)).toHaveLength(2)
  })

  it('renders a loading skeleton without an all-clear or stale work', () => {
    const html = renderToStaticMarkup(<ActionCenterCard tasks={tasks} loading showWhenEmpty />)
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('No urgent actions')
    expect(html).not.toContain('Upload RC')
  })

  it('shows No urgent actions for a successfully loaded empty result', () => {
    const html = renderToStaticMarkup(<ActionCenterCard tasks={[]} showWhenEmpty />)
    expect(html).toContain('No urgent actions')
    expect(html).toContain('role="status"')
    expect(html).not.toContain('in good standing')
  })

  it('keeps overflow tasks actionable in a native keyboard-operable disclosure', () => {
    const tree = ActionCenterCard({ tasks, maxVisible: 1 })
    const nodes = descendants(tree)
    expect(nodes.find((node) => node.props['aria-label'] === 'Priority actions')?.props.children).toHaveLength(1)
    expect(nodes.find((node) => node.props['aria-label'] === 'More actions')?.props.children).toHaveLength(1)
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('<details')
    expect(html).toContain('<summary')
    expect(html).toContain('Show 1 more action')
    expect(html).toContain('href="/booking/booking-1"')
  })

  it('never claims all-clear when one or more sources failed and exposes a retry', () => {
    const retry = jest.fn()
    const tree = ActionCenterCard({ tasks: [], showWhenEmpty: true, unavailableSources: ['Trips', 'Fleet'], onRetry: retry })
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('Action data unavailable')
    expect(html).toContain('Could not check: Trips, Fleet')
    expect(html).not.toContain('No urgent actions')
    descendants(tree).find((node) => node.type === 'button')!.props.onClick()
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('keeps known tasks visible alongside a partial-data warning', () => {
    const html = renderToStaticMarkup(<ActionCenterCard tasks={tasks} unavailableSources={['Subscription']} />)
    expect(html).toContain('Some action data is unavailable')
    expect(html).toContain('href="/documents"')
    expect(html).not.toContain('No urgent actions')
  })
})
