import { renderToStaticMarkup } from 'react-dom/server'
import { OperationalEmptyState } from './OperationalEmptyState'

// The component deep-links its CTAs with the app router; a static render has no
// router context, so the hook is stubbed.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function render(role: 'factory_owner' | 'truck_driver' | 'transporter' | 'admin') {
  return renderToStaticMarkup(
    OperationalEmptyState({
      role,
      title: 'No freight posted',
      description: 'Publish your cargo to activate proximity matching.',
    })
  )
}

describe('OperationalEmptyState', () => {
  it('exports a component', () => {
    expect(typeof OperationalEmptyState).toBe('function')
  })

  it('describes the shipper workflow for a factory owner', () => {
    const html = render('factory_owner')
    expect(html).toContain('Post Cargo Requirements')
    expect(html).toContain('Direct WhatsApp Contact')
    expect(html).not.toContain('Complete RC Verification')
  })

  it('describes the driver workflow for a truck driver', () => {
    const html = render('truck_driver')
    expect(html).toContain('Complete RC Verification')
    expect(html).toContain('Capture Return Loads')
    expect(html).not.toContain('Post Cargo Requirements')
  })

  it('gives a transporter the two-sided workflow instead of a one-sided one', () => {
    const html = render('transporter')
    expect(html).toContain('Post Freight or List a Truck')
    expect(html).toContain('Two-Sided Matching')
    // Neither single-side flow is shown — a transporter operates both.
    expect(html).not.toContain('Post Cargo Requirements')
    expect(html).not.toContain('Complete RC Verification')
  })

  it('treats an admin like a transporter (both sides visible)', () => {
    expect(render('admin')).toContain('Two-Sided Matching')
  })

  it('renders both CTAs when the caller supplies them', () => {
    const html = renderToStaticMarkup(
      OperationalEmptyState({
        role: 'transporter',
        title: 'No freight posted',
        description: 'Publish or list to start matching.',
        actionLabel: 'Post Freight',
        actionHref: '/post-load',
        secondaryActionLabel: 'Register Truck',
        secondaryActionHref: '/register-truck',
      })
    )
    expect(html).toContain('Post Freight')
    expect(html).toContain('Register Truck')
  })
})
