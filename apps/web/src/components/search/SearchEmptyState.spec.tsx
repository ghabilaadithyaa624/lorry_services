import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SearchEmptyState, type SearchEmptyStateProps } from './SearchEmptyState'
import { INDUSTRIAL_HUB_SUGGESTIONS } from '@/lib/searchEmptyState'

function descendants(node: React.ReactNode): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(descendants)
  if (!React.isValidElement(node)) return []
  return [node as React.ReactElement, ...descendants((node as any).props?.children)]
}

function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement(node)) return textOf((node as any).props?.children)
  return ''
}

/** The first clickable (Button or plain <button>) whose visible text contains `text`. */
function clickableWithText(tree: React.ReactNode, text: string): React.ReactElement | undefined {
  return descendants(tree).find(
    (node) =>
      typeof (node.props as any).onClick === 'function' &&
      textOf((node.props as any).children).includes(text)
  )
}

function anchorWithHref(html: string, href: string): string | null {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<a[^>]*href="${escaped}"[\\s\\S]*?<\\/a>`))
  return match ? match[0] : null
}

const baseProps: SearchEmptyStateProps = {
  mode: 'trucks',
  variant: 'no-results',
  radius: '50',
  truckType: '',
  locationLabel: 'Chakan MIDC, Pune',
  searchError: null,
  gpsSupported: true,
  gpsLoading: false,
  isAuthenticated: false,
  onDetectLocation: jest.fn(),
  onFocusLocationInput: jest.fn(),
  onHubSelect: jest.fn(),
  onRadiusSelect: jest.fn(),
  onTruckTypeSelect: jest.fn(),
  onResetFilters: jest.fn(),
  onRetry: jest.fn(),
  onSwitchMode: jest.fn(),
}

function propsWith(overrides: Partial<SearchEmptyStateProps>): SearchEmptyStateProps {
  return { ...baseProps, ...overrides }
}

describe('SearchEmptyState', () => {
  beforeEach(() => jest.clearAllMocks())

  it('exports a component', () => {
    expect(typeof SearchEmptyState).toBe('function')
  })

  describe('guidance coverage', () => {
    it('offers all four ways to reach a result', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({})))
      expect(html).toContain('STEP 01')
      expect(html).toContain('Detect your location')
      expect(html).toContain('STEP 02')
      expect(html).toContain('Enter an industrial hub or city')
      expect(html).toContain('STEP 03')
      expect(html).toContain('Expand the search radius')
      expect(html).toContain('STEP 04')
      expect(html).toContain('Change the vehicle type')
    })

    it('offers every industrial hub as a one-tap loading point', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({})))
      INDUSTRIAL_HUB_SUGGESTIONS.forEach((hub) => {
        expect(html).toContain(hub.label)
        expect(html).toContain(hub.state)
      })
    })

    it('points at the next step for the current situation', () => {
      const needsLocation = renderToStaticMarkup(
        SearchEmptyState(propsWith({ variant: 'needs-location', locationLabel: '' }))
      )
      expect(needsLocation).toContain('data-search-empty-variant="needs-location"')
      // Exactly one step is flagged as the one to act on.
      expect(needsLocation.split('aria-current="step"').length - 1).toBe(1)

      const noResults = renderToStaticMarkup(SearchEmptyState(propsWith({ variant: 'no-results' })))
      expect(noResults).toContain('data-search-empty-variant="no-results"')
      // Radius + vehicle type are both valid next moves here.
      expect(noResults.split('aria-current="step"').length - 1).toBe(2)
    })
  })

  describe('honest status copy', () => {
    it('does not claim a result count before any query ran', () => {
      const html = renderToStaticMarkup(
        SearchEmptyState(propsWith({ variant: 'needs-location', locationLabel: '' }))
      )
      expect(html).toContain('Set a loading point to search trucks')
      expect(html).not.toContain('No matching')
    })

    it('states the radius and hub once a real search came back empty', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({})))
      expect(html).toContain('No matching trucks within 50 km of Chakan MIDC, Pune')
    })

    it('reports a failed query as a failure with a retry, never as zero results', () => {
      const html = renderToStaticMarkup(
        SearchEmptyState(
          propsWith({ variant: 'error', searchError: 'The search service did not respond.' })
        )
      )
      expect(html).toContain('role="alert"')
      expect(html).toContain('The search service did not respond.')
      expect(html).toContain('Retry search')
      expect(html).not.toContain('No matching trucks')
    })
  })

  describe('interactive guidance', () => {
    it('detects the location when GPS is available', () => {
      const tree = SearchEmptyState(propsWith({}))
      clickableWithText(tree, 'Detect GPS location')!.props.onClick()
      expect(baseProps.onDetectLocation).toHaveBeenCalledTimes(1)
    })

    it('tells the operator to type a city instead when GPS is unavailable', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({ gpsSupported: false })))
      expect(html).toContain('This browser has no location API')
      expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Detect GPS location/)
    })

    it('shows a locating state while GPS resolves', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({ gpsLoading: true })))
      expect(html).toContain('Locating...')
    })

    it('focuses the location field on request', () => {
      const tree = SearchEmptyState(propsWith({}))
      clickableWithText(tree, 'Type a city')!.props.onClick()
      expect(baseProps.onFocusLocationInput).toHaveBeenCalledTimes(1)
    })

    it('loads a tapped industrial hub as the loading point', () => {
      const tree = SearchEmptyState(propsWith({}))
      const hub = INDUSTRIAL_HUB_SUGGESTIONS[2]
      clickableWithText(tree, hub.label)!.props.onClick()
      expect(baseProps.onHubSelect).toHaveBeenCalledWith(hub)
    })

    it('offers only wider radii and reports the step it will use', () => {
      const tree = SearchEmptyState(propsWith({ radius: '50' }))
      expect(clickableWithText(tree, '100 km')).toBeDefined()
      expect(clickableWithText(tree, '200 km')).toBeDefined()
      expect(clickableWithText(tree, '500 km')).toBeDefined()
      // The current radius is not offered as an "expand" action.
      expect(clickableWithText(tree, '50 km')).toBeUndefined()

      clickableWithText(tree, '200 km')!.props.onClick()
      expect(baseProps.onRadiusSelect).toHaveBeenCalledWith('200')
    })

    it('stops offering wider radii once the widest step is active', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({ radius: '500' })))
      expect(html).toContain('No wider step available')
    })

    it('changes the vehicle body type, including back to all types', () => {
      const tree = SearchEmptyState(propsWith({ truckType: 'Container' }))
      clickableWithText(tree, 'Open Body')!.props.onClick()
      expect(baseProps.onTruckTypeSelect).toHaveBeenCalledWith('Open')

      clickableWithText(tree, 'All vehicle types')!.props.onClick()
      expect(baseProps.onTruckTypeSelect).toHaveBeenCalledWith('')
    })

    it('marks the active vehicle type as pressed for assistive tech', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({ truckType: 'Container' })))
      expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>[\s\S]*?Closed Container/)
    })

    it('resets every filter in one action', () => {
      const tree = SearchEmptyState(propsWith({ truckType: 'Open', radius: '25' }))
      clickableWithText(tree, 'Reset all filters')!.props.onClick()
      expect(baseProps.onResetFilters).toHaveBeenCalledTimes(1)
    })

    it('switches to the other side of the marketplace', () => {
      const tree = SearchEmptyState(propsWith({ mode: 'trucks' }))
      clickableWithText(tree, 'Search freight loads instead')!.props.onClick()
      expect(baseProps.onSwitchMode).toHaveBeenCalledWith('loads')
    })
  })

  describe('CTA routing', () => {
    it('sends anonymous operators through login to the publish forms', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({})))
      expect(anchorWithHref(html, '/login?redirect=/need-load')).toContain('Post a load')
      expect(anchorWithHref(html, '/login?redirect=/need-vehicle')).toContain('Register your truck')
    })

    it('routes signed-in operators straight to the forms', () => {
      const html = renderToStaticMarkup(SearchEmptyState(propsWith({ isAuthenticated: true })))
      expect(anchorWithHref(html, '/need-load')).toContain('Post a load')
      expect(anchorWithHref(html, '/need-vehicle')).toContain('Register your truck')
      expect(html).not.toContain('href="/login')
    })

    it('explains why publishing helps on each side of the marketplace', () => {
      expect(renderToStaticMarkup(SearchEmptyState(propsWith({ mode: 'trucks' })))).toContain(
        'Publishing a load puts your requirement in front of verified transporters'
      )
      expect(renderToStaticMarkup(SearchEmptyState(propsWith({ mode: 'loads' })))).toContain(
        'Listing your vehicle publishes your capacity'
      )
    })
  })
})
