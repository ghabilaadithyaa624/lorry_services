import {
  DEMO_LOAD_PREVIEWS,
  DEMO_TRUCK_PREVIEWS,
  INDUSTRIAL_HUB_SUGGESTIONS,
  LOGIN_LIVE_MARKETPLACE_CTA,
  POST_LOAD_PATH,
  RADIUS_STEPS_KM,
  REGISTER_VEHICLE_PATH,
  SAMPLE_PREVIEW_DISCLAIMER,
  SAMPLE_PREVIEW_LABEL,
  bodyTypeLabel,
  buildMarketplaceQuery,
  getSearchEmptyCopy,
  loginRedirectUrl,
  marketplaceEndpoint,
  nextRadiusStep,
  oppositeMode,
  resolveSearchEmptyVariant,
  searchTypeParam,
  searchUrlForMode,
  widerRadiusSteps,
} from './searchEmptyState'

describe('resolveSearchEmptyVariant', () => {
  it('reports an error rather than an empty marketplace', () => {
    expect(
      resolveSearchEmptyVariant({ hasSearched: true, hasLocation: true, searchError: 'boom' })
    ).toBe('error')
  })

  it('lets an error win even when no location is set', () => {
    expect(
      resolveSearchEmptyVariant({ hasSearched: false, hasLocation: false, searchError: 'boom' })
    ).toBe('error')
  })

  it('distinguishes "no location yet" from "searched and got nothing"', () => {
    expect(
      resolveSearchEmptyVariant({ hasSearched: false, hasLocation: false, searchError: null })
    ).toBe('needs-location')
    expect(
      resolveSearchEmptyVariant({ hasSearched: true, hasLocation: true, searchError: null })
    ).toBe('no-results')
  })

  it('treats a location without a query as ready-to-search, not zero results', () => {
    expect(
      resolveSearchEmptyVariant({ hasSearched: false, hasLocation: true, searchError: null })
    ).toBe('ready-to-search')
  })
})

describe('radius ladder', () => {
  it('is ordered from narrowest to widest', () => {
    expect(RADIUS_STEPS_KM).toEqual(['25', '50', '100', '200', '500'])
  })

  it('steps to the next wider radius', () => {
    expect(nextRadiusStep('25')).toBe('50')
    expect(nextRadiusStep('50')).toBe('100')
    expect(nextRadiusStep('200')).toBe('500')
  })

  it('stays put at the widest step and for unknown input', () => {
    expect(nextRadiusStep('500')).toBe('500')
    expect(nextRadiusStep('nonsense')).toBe('500')
  })

  it('offers only radii wider than the current one', () => {
    expect(widerRadiusSteps('50')).toEqual(['100', '200', '500'])
    expect(widerRadiusSteps('500')).toEqual([])
  })
})

describe('search routes', () => {
  it('maps each mode onto the /search type parameter', () => {
    expect(searchTypeParam('trucks')).toBe('truck')
    expect(searchTypeParam('loads')).toBe('load')
    expect(searchUrlForMode('trucks')).toBe('/search?type=truck')
    expect(searchUrlForMode('loads')).toBe('/search?type=load')
  })

  it('toggles to the opposite marketplace tab', () => {
    expect(oppositeMode('trucks')).toBe('loads')
    expect(oppositeMode('loads')).toBe('trucks')
  })
})

describe('buildMarketplaceQuery', () => {
  it('always carries the radius the caller asked for', () => {
    // Regression: "Expand Search to 200 km" used to re-run a 50 km query because
    // the handler read the radius from React state before it had committed.
    const widened = buildMarketplaceQuery({
      lat: '18.6497',
      lng: '73.7998',
      radius: nextRadiusStep('50'),
      mode: 'trucks',
    })
    expect(new URLSearchParams(widened).get('radius')).toBe('100')
    expect(widened).not.toContain('radius=50')
  })

  it('passes the coordinates through unchanged', () => {
    const query = buildMarketplaceQuery({
      lat: '12.9716',
      lng: '77.5946',
      radius: '25',
      mode: 'loads',
    })
    const params = new URLSearchParams(query)
    expect(params.get('lat')).toBe('12.9716')
    expect(params.get('lng')).toBe('77.5946')
    expect(params.get('radius')).toBe('25')
  })

  it('omits unset filters entirely', () => {
    const query = buildMarketplaceQuery({ lat: '1', lng: '2', radius: '50', mode: 'trucks' })
    expect(query).toBe('lat=1&lng=2&radius=50')
  })

  it('filters trucks on a tonnage floor and loads on a tonnage ceiling', () => {
    const trucks = new URLSearchParams(
      buildMarketplaceQuery({ lat: '1', lng: '2', radius: '50', truckType: 'Container', tonnage: '16', mode: 'trucks' })
    )
    expect(trucks.get('truckType')).toBe('Container')
    expect(trucks.get('minTonnage')).toBe('16')
    expect(trucks.get('maxTonnage')).toBeNull()

    const loads = new URLSearchParams(
      buildMarketplaceQuery({ lat: '1', lng: '2', radius: '50', truckType: 'Open', tonnage: '16', mode: 'loads' })
    )
    expect(loads.get('maxTonnage')).toBe('16')
    expect(loads.get('minTonnage')).toBeNull()
  })

  it('drops a cleared vehicle type filter instead of sending an empty value', () => {
    const query = buildMarketplaceQuery({
      lat: '1',
      lng: '2',
      radius: '200',
      truckType: '',
      tonnage: '',
      mode: 'trucks',
    })
    expect(query).toBe('lat=1&lng=2&radius=200')
  })

  it('points each mode at its own endpoint', () => {
    expect(marketplaceEndpoint('trucks')).toBe('/search/trucks')
    expect(marketplaceEndpoint('loads')).toBe('/search/loads')
  })
})

describe('loginRedirectUrl', () => {
  it('routes the publish CTAs exactly as specified', () => {
    expect(loginRedirectUrl(POST_LOAD_PATH)).toBe('/login?redirect=/need-load')
    expect(loginRedirectUrl(REGISTER_VEHICLE_PATH)).toBe('/login?redirect=/need-vehicle')
  })

  it('encodes a target that carries its own query string', () => {
    // Otherwise ?type=truck would be parsed as a second parameter of /login and dropped.
    expect(loginRedirectUrl('/search?type=truck')).toBe('/login?redirect=%2Fsearch%3Ftype%3Dtruck')
  })

  it('decodes back to the intended destination', () => {
    const url = new URL(`https://lorrycarry.test${loginRedirectUrl('/search?type=load')}`)
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/search?type=load')
  })

  it('rejects protocol-relative and external redirects', () => {
    expect(loginRedirectUrl('//evil.test/steal')).toBe('/login?redirect=/search')
    expect(loginRedirectUrl('https://evil.test/steal')).toBe('/login?redirect=/search')
    expect(loginRedirectUrl('javascript:alert(1)')).toBe('/login?redirect=/search')
  })
})

describe('getSearchEmptyCopy', () => {
  it('never claims a result count before a query runs', () => {
    const copy = getSearchEmptyCopy('needs-location', { mode: 'trucks', radius: '50' })
    expect(copy.title).toBe('Set a loading point to search trucks')
    expect(copy.description).toMatch(/GPS|industrial hub/)
  })

  it('names the hub and radius for the ready-to-search variant', () => {
    const copy = getSearchEmptyCopy('ready-to-search', {
      mode: 'loads',
      radius: '100',
      locationLabel: 'Chakan MIDC, Pune',
    })
    expect(copy.title).toBe('Ready to search near Chakan MIDC, Pune')
    expect(copy.description).toContain('freight loads')
    expect(copy.description).toContain('100 km')
  })

  it('keeps the zero-result copy honest and actionable', () => {
    const copy = getSearchEmptyCopy('no-results', {
      mode: 'trucks',
      radius: '50',
      locationLabel: 'Oragadam, Chennai',
    })
    expect(copy.title).toBe('No matching trucks within 50 km of Oragadam, Chennai')
    expect(copy.description).toMatch(/radius|vehicle type|publish/)
  })

  it('states plainly that an error is not an empty marketplace', () => {
    const copy = getSearchEmptyCopy('error', { mode: 'trucks', radius: '50' })
    expect(copy.description).toContain('not an empty marketplace')
  })
})

describe('sample preview labelling', () => {
  it('exposes the two required labels verbatim', () => {
    expect(SAMPLE_PREVIEW_LABEL).toBe('Sample preview')
    expect(LOGIN_LIVE_MARKETPLACE_CTA).toBe('Login to search live marketplace')
  })

  it('says what the samples are and are not', () => {
    expect(SAMPLE_PREVIEW_DISCLAIMER).toContain('not live listings')
    expect(SAMPLE_PREVIEW_DISCLAIMER).toContain('no contact details are unlocked')
  })
})

describe('sample preview data', () => {
  const serialized = JSON.stringify([...DEMO_TRUCK_PREVIEWS, ...DEMO_LOAD_PREVIEWS])

  it('carries no contact field of any kind', () => {
    expect(serialized).not.toMatch(/phone/i)
    expect(serialized).not.toMatch(/whatsapp/i)
    DEMO_TRUCK_PREVIEWS.forEach((truck) => {
      expect(Object.keys(truck)).not.toContain('ownerPhone')
      expect(Object.keys(truck)).not.toContain('ownerName')
    })
    DEMO_LOAD_PREVIEWS.forEach((load) => {
      expect(Object.keys(load)).not.toContain('ownerPhone')
      expect(Object.keys(load)).not.toContain('ownerName')
    })
  })

  it('contains no phone-number-shaped digit run that could read as a real contact', () => {
    expect(serialized).not.toMatch(/\d{10,}/)
    expect(serialized).not.toMatch(/\+91/)
  })

  it('uses stable, unique ids so React keys and sample cards line up', () => {
    const ids = [...DEMO_TRUCK_PREVIEWS, ...DEMO_LOAD_PREVIEWS].map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach((id) => expect(id.startsWith('sample-')).toBe(true))
  })

  it('offers at least three samples per side of the marketplace', () => {
    expect(DEMO_TRUCK_PREVIEWS.length).toBeGreaterThanOrEqual(3)
    expect(DEMO_LOAD_PREVIEWS.length).toBeGreaterThanOrEqual(3)
  })
})

describe('industrial hub suggestions', () => {
  it('are search inputs, not marketplace listings', () => {
    expect(INDUSTRIAL_HUB_SUGGESTIONS.length).toBeGreaterThanOrEqual(4)
    INDUSTRIAL_HUB_SUGGESTIONS.forEach((hub) => {
      // The chip label is a prefix of the geocoding query, so what the operator
      // taps is what actually gets searched.
      expect(hub.query.startsWith(hub.label)).toBe(true)
      expect(hub.state.length).toBeGreaterThan(0)
      expect(hub.query).toContain(',')
    })
  })
})

describe('bodyTypeLabel', () => {
  it('labels every body type the search filter offers', () => {
    expect(bodyTypeLabel('Open')).toBe('Open Body')
    expect(bodyTypeLabel('Container')).toBe('Closed Container')
    expect(bodyTypeLabel('OpenBody')).toBe('Open Body Trailer')
  })
})
