import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DemoPreviewCards } from './DemoPreviewCards'
import { DEMO_LOAD_PREVIEWS, DEMO_TRUCK_PREVIEWS } from '@/lib/searchEmptyState'

/** Render the sample panel the way the search page does for an empty result. */
function render(overrides: Partial<ComponentProps<typeof DemoPreviewCards>> = {}) {
  return renderToStaticMarkup(
    DemoPreviewCards({
      mode: 'trucks',
      realResultCount: 0,
      ...overrides,
    })
  )
}

/** The markup of the first anchor carrying `href`, so label+href can be checked together. */
function anchorWithHref(html: string, href: string): string | null {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<a[^>]*href="${escaped}"[\\s\\S]*?<\\/a>`))
  return match ? match[0] : null
}

describe('DemoPreviewCards', () => {
  it('exports a component', () => {
    expect(typeof DemoPreviewCards).toBe('function')
  })

  describe('never mixes with live data', () => {
    it('renders nothing at all when real results exist', () => {
      expect(DemoPreviewCards({ mode: 'trucks', realResultCount: 1 })).toBeNull()
      expect(DemoPreviewCards({ mode: 'loads', realResultCount: 12 })).toBeNull()
    })

    it('renders when the marketplace returned zero', () => {
      expect(DemoPreviewCards({ mode: 'trucks', realResultCount: 0 })).not.toBeNull()
    })
  })

  describe('labelling', () => {
    it('marks the section as a sample preview', () => {
      const html = render()
      expect(html).toContain('data-demo-preview="true"')
      expect(html).toContain('Sample preview')
      expect(html).toContain('Illustrative listing layout only')
      expect(html).toContain('not live listings')
    })

    it('badges every individual sample card, not just the section header', () => {
      const html = render()
      const occurrences = html.split('Sample preview').length - 1
      // Section header badge + one badge per sample card.
      expect(occurrences).toBeGreaterThanOrEqual(DEMO_TRUCK_PREVIEWS.length + 1)
      DEMO_TRUCK_PREVIEWS.forEach((truck) => {
        expect(html).toContain(`data-sample-card="${truck.id}"`)
        expect(html).toContain(truck.registrationNumber)
      })
    })
  })

  describe('contact details stay sealed', () => {
    it('renders no phone link and no WhatsApp link', () => {
      const html = render()
      expect(html).not.toContain('wa.me')
      expect(html).not.toContain('tel:')
      expect(html).toContain('Contact sealed')
      expect(html).toContain('no reachable number')
    })

    it('offers no unlock affordance that could hit the reveal API with a fake id', () => {
      const html = render()
      expect(html).not.toContain('Unlock Contact')
    })
  })

  describe('routing', () => {
    it('sends anonymous visitors to login and back to the live search', () => {
      const html = render()
      const anchor = anchorWithHref(html, '/login?redirect=%2Fsearch%3Ftype%3Dtruck')
      expect(anchor).not.toBeNull()
      expect(anchor!).toContain('Login to search live marketplace')
    })

    it('sends the loads tab back to the loads search', () => {
      const html = render({ mode: 'loads' })
      const anchor = anchorWithHref(html, '/login?redirect=%2Fsearch%3Ftype%3Dload')
      expect(anchor).not.toBeNull()
      expect(anchor!).toContain('Login to search live marketplace')
    })

    it('routes the publish CTAs through login for anonymous visitors', () => {
      const html = render()
      expect(anchorWithHref(html, '/login?redirect=/post-load')).not.toBeNull()
      expect(anchorWithHref(html, '/login?redirect=/register-truck')).not.toBeNull()
      expect(html).toContain('Post Freight')
      expect(html).toContain('Register Truck')
    })

    it('drops the login CTA for signed-in operators and links the forms directly', () => {
      const html = render({ isAuthenticated: true })
      expect(html).not.toContain('Login to search live marketplace')
      expect(html).not.toContain('href="/login')
      // A shipper searching for trucks publishes freight.
      expect(anchorWithHref(html, '/post-load')).not.toBeNull()
      expect(anchorWithHref(html, '/register-truck')).not.toBeNull()
    })

    it('puts the live-marketplace CTA on every sample card, not just the footer', () => {
      const html = render()
      const occurrences = html.split('Login to search live marketplace').length - 1
      // One per sample card plus the conversion row.
      expect(occurrences).toBe(DEMO_TRUCK_PREVIEWS.length + 1)
      DEMO_TRUCK_PREVIEWS.forEach((truck) => {
        const card = html.slice(html.indexOf(`data-sample-card="${truck.id}"`))
        expect(card.slice(0, card.indexOf('</article>'))).toContain('Login to search live marketplace')
      })
    })

    it('never shows the login CTA to a signed-in operator', () => {
      expect(render({ isAuthenticated: true })).not.toContain('Login to search live marketplace')
    })
  })

  describe('role-aware CTAs', () => {
    it('offers a transporter both Post Freight and Register Truck', () => {
      const modes: Array<'trucks' | 'loads'> = ['trucks', 'loads']
      modes.forEach((mode) => {
        const html = render({ mode, role: 'transporter', isAuthenticated: true })
        expect(anchorWithHref(html, '/post-load')).toContain('Post Freight')
        expect(anchorWithHref(html, '/register-truck')).toContain('Register Truck')
      })
    })

    it('leads with freight in truck mode and with the fleet side in load mode', () => {
      const trucks = render({ role: 'transporter', isAuthenticated: true, mode: 'trucks' })
      expect(trucks.indexOf('Post Freight')).toBeLessThan(trucks.indexOf('Register Truck'))
      const loads = render({ role: 'transporter', isAuthenticated: true, mode: 'loads' })
      expect(loads.indexOf('Register Truck')).toBeLessThan(loads.indexOf('Post Freight'))
    })

    it('withholds the side the role cannot use and explains why', () => {
      const shipper = render({ role: 'factory_owner', isAuthenticated: true, mode: 'loads' })
      expect(shipper).not.toContain('href="/register-truck"')
      expect(shipper).toContain('Vehicle registration is available on driver and transporter accounts')

      const driver = render({ role: 'truck_driver', isAuthenticated: true, mode: 'trucks' })
      expect(driver).not.toContain('href="/post-load"')
      expect(driver).toContain('Freight posting is available on shipper and transporter accounts')
    })
  })

  describe('mode parity with the live cards', () => {
    it('renders truck samples in truck mode and nothing from the load side', () => {
      const html = render({ mode: 'trucks' })
      DEMO_TRUCK_PREVIEWS.forEach((truck) => expect(html).toContain(truck.registrationNumber))
      DEMO_LOAD_PREVIEWS.forEach((load) => expect(html).not.toContain(load.loadingAddress))
    })

    it('renders load samples in load mode and nothing from the truck side', () => {
      const html = render({ mode: 'loads' })
      DEMO_LOAD_PREVIEWS.forEach((load) => {
        expect(html).toContain(load.loadingAddress)
        expect(html).toContain(load.unloadingAddress)
      })
      DEMO_TRUCK_PREVIEWS.forEach((truck) => expect(html).not.toContain(truck.registrationNumber))
    })

    it('computes a real match score and rate benchmark for each sample', () => {
      const html = render({ targetTonnage: 20, truckType: 'Container' })
      // The same MatchScoreBadge and rate engine the live cards use.
      expect(html).toContain('aria-label="Toggle match score breakdown"')
      expect(html).toMatch(/>\d{1,3}%<\/span>/)
      expect(html).toContain('/T-km')
    })

    it('flags the urgent sample load the same way live cards do', () => {
      expect(render({ mode: 'loads' })).toContain('Urgent Load')
    })
  })
})
