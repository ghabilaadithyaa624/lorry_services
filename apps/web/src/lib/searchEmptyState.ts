/**
 * Search empty-state logic for the public marketplace (`/search`).
 *
 * `/search` is a public route (see `@/lib/publicRoutes`), so most visitors hit
 * it with no session and often with an empty marketplace behind them. The bare
 * "Found 0 trucks within 50 km" panel tells such a visitor nothing actionable,
 * so the page needs to distinguish *why* the grid is empty and route them
 * somewhere useful.
 *
 * This module is deliberately free of framework imports (no `next/*`, no React)
 * so it can be unit-tested in the node jest environment and reused from the page
 * and the empty-state components alike. The one internal dependency is
 * `@/lib/roles`, which is pure TypeScript.
 */

import { canManageFreight, canManageFleet } from '@/lib/roles'

/** Marketplace search mode. `trucks` = I need a vehicle, `loads` = I need freight. */
export type SearchMode = 'trucks' | 'loads'

/**
 * Why the result grid is empty.
 *
 * - `needs-location`  — no loading point yet, so no query has been possible.
 * - `ready-to-search` — a location is set but the operator has not run a query.
 * - `no-results`      — a query ran and the marketplace genuinely returned 0.
 * - `error`           — the query failed; 0 is *not* a truthful answer here.
 */
export type SearchEmptyVariant =
  | 'needs-location'
  | 'ready-to-search'
  | 'no-results'
  | 'error'

export interface SearchEmptyInput {
  /** True once a marketplace query has completed (successfully or not). */
  hasSearched: boolean
  /** True once a loading point (GPS fix or typed city/hub) is available. */
  hasLocation: boolean
  /** Non-null when the last query failed. Wins over every other variant. */
  searchError: string | null
}

/**
 * Decide which empty-state variant the results panel should render.
 *
 * The order matters: an error must never be reported as "0 results", because
 * that teaches operators to distrust a working marketplace.
 */
export function resolveSearchEmptyVariant(input: SearchEmptyInput): SearchEmptyVariant {
  if (input.searchError) return 'error'
  if (!input.hasLocation) return 'needs-location'
  if (!input.hasSearched) return 'ready-to-search'
  return 'no-results'
}

/** Radius ladder offered by the search panel, in km. Ordered, deduplicated. */
export const RADIUS_STEPS_KM: readonly string[] = ['25', '50', '100', '200', '500'] as const

/**
 * Next wider radius to offer when the current one came back empty.
 * Returns the widest step (and the input unchanged) once the ladder is
 * exhausted, so callers can safely use this for "expand radius" affordances.
 */
export function nextRadiusStep(currentRadius: string): string {
  const index = RADIUS_STEPS_KM.indexOf(String(currentRadius))
  if (index === -1 || index >= RADIUS_STEPS_KM.length - 1) {
    return RADIUS_STEPS_KM[RADIUS_STEPS_KM.length - 1]
  }
  return RADIUS_STEPS_KM[index + 1]
}

/** Radii wider than the current one — the "expand radius" quick actions. */
export function widerRadiusSteps(currentRadius: string): string[] {
  const index = RADIUS_STEPS_KM.indexOf(String(currentRadius))
  if (index === -1) return [...RADIUS_STEPS_KM]
  return RADIUS_STEPS_KM.slice(index + 1)
}

export interface HubSuggestion {
  /** Human label shown on the chip. */
  label: string
  /** Value written into the location field (geocoded server-side). */
  query: string
  /** State, used for the muted secondary line on the chip. */
  state: string
}

/**
 * Industrial hubs / freight-dense cities offered as one-tap loading points.
 *
 * These are *search inputs*, not results: picking one fills the location field
 * and runs a real query. They never appear as marketplace listings.
 */
export const INDUSTRIAL_HUB_SUGGESTIONS: readonly HubSuggestion[] = [
  { label: 'Chakan MIDC', query: 'Chakan MIDC, Pune', state: 'Maharashtra' },
  { label: 'Bhiwandi', query: 'Bhiwandi, Mumbai', state: 'Maharashtra' },
  { label: 'Oragadam', query: 'Oragadam, Chennai', state: 'Tamil Nadu' },
  { label: 'Manesar IMT', query: 'Manesar IMT, Gurugram', state: 'Haryana' },
  { label: 'Peenya', query: 'Peenya Industrial Area, Bengaluru', state: 'Karnataka' },
  { label: 'Sanand GIDC', query: 'Sanand GIDC, Ahmedabad', state: 'Gujarat' },
] as const

/** Vehicle body types offered as filters — mirrors the search panel `<Select>`. */
export const VEHICLE_BODY_TYPES: ReadonlyArray<{
  value: 'Open' | 'Container' | 'OpenBody'
  label: string
}> = [
  { value: 'Open', label: 'Open Body' },
  { value: 'Container', label: 'Closed Container' },
  { value: 'OpenBody', label: 'Open Body Trailer' },
] as const

/** `type` query value used by `/search` for a given mode. */
export function searchTypeParam(mode: SearchMode): 'truck' | 'load' {
  return mode === 'loads' ? 'load' : 'truck'
}

/** Canonical search URL for a mode, matching the tab buttons on `/search`. */
export function searchUrlForMode(mode: SearchMode): string {
  return `/search?type=${searchTypeParam(mode)}`
}

/** The opposite marketplace tab, used by the "try the other side" CTA. */
export function oppositeMode(mode: SearchMode): SearchMode {
  return mode === 'loads' ? 'trucks' : 'loads'
}

/**
 * Build a `/login?redirect=…` URL for an authenticated destination.
 *
 * The login page only accepts an internal path (`startsWith('/')` and not
 * `//`), so external/absolute input falls back to `/search`. A target that
 * carries its own query string must be encoded, otherwise `?type=truck` would
 * be parsed as a second parameter of `/login` and silently dropped. Targets
 * without one are emitted literally so the href stays readable.
 */
export function loginRedirectUrl(target: string, fallback = '/search'): string {
  const path =
    typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
      ? target
      : fallback
  const needsEncoding = /[?&#\s]/.test(path)
  return `/login?redirect=${needsEncoding ? encodeURIComponent(path) : path}`
}

/**
 * Canonical publish destinations.
 *
 * These are the same URLs the navbar and the dashboard sidebar use
 * (`dashboardNav.POST_FREIGHT` / `REGISTER_TRUCK`), so an operator who clicks
 * "Post Freight" from an empty search lands on the same form they would reach
 * from anywhere else. `/register-truck` forwards to the fleet workspace, which
 * owns the registration form.
 */
export const POST_FREIGHT_PATH = '/post-load'
export const REGISTER_TRUCK_PATH = '/register-truck'

/** Public-facing label used everywhere else in the product (navbar, sidebar). */
export const POST_FREIGHT_LABEL = 'Post Freight'
export const REGISTER_TRUCK_LABEL = 'Register Truck'

// ── Publish CTAs ────────────────────────────────────────────────────────────

/** The two sides an operator can create supply on. */
export type MarketplaceCtaKind = 'post-freight' | 'register-truck'

export interface MarketplaceCta {
  kind: MarketplaceCtaKind
  label: string
  /** Authenticated destination. */
  path: string
  /** `path` for a signed-in operator, `/login?redirect=…` otherwise. */
  href: string
  /** Rendered as the filled button; the rest render as secondary actions. */
  primary: boolean
  /** One-line reason shown with the CTA row. */
  hint: string
}

export interface MarketplaceCtaSet {
  /** CTAs the visitor may act on, primary side first. */
  ctas: MarketplaceCta[]
  /** The filled action, i.e. `ctas[0]`. */
  primary?: MarketplaceCta
  /**
   * The side withheld because the signed-in role cannot use it, with the line
   * that explains why. `null` for anonymous visitors and for both-sides roles
   * (transporter, admin) — see the middleware's freight/fleet RBAC, which would
   * bounce a factory owner off `/register-truck` and a driver off `/post-load`.
   */
  hidden?: { kind: MarketplaceCtaKind; label: string; note: string }
}

export interface MarketplaceCtaOptions {
  /** Which marketplace tab is open — decides which side leads. */
  mode: SearchMode
  /** Canonical or legacy role label from the persisted session, if any. */
  role?: string | null
  /** Whether a browser session exists. */
  isAuthenticated?: boolean
}

/**
 * Which publish CTAs an operator should be offered, in priority order.
 *
 * A visitor searching **trucks** needs capacity, so the action that creates the
 * match is publishing freight; a visitor searching **loads** needs cargo, so it
 * is registering a vehicle. The other side stays visible whenever the account
 * can use it — transporters and admins operate both sides, and an anonymous
 * visitor picks a role at signup.
 *
 * A side the role cannot use is *withheld with an explanation* rather than
 * rendered as a button: linking it would send a factory owner to
 * `/register-truck`, where the middleware immediately bounces them to their own
 * dashboard.
 */
export function resolveMarketplaceCtas({
  mode,
  role,
  isAuthenticated = false,
}: MarketplaceCtaOptions): MarketplaceCtaSet {
  // An unresolved session has no proven restrictions yet — the visitor chooses
  // a role during signup, so both sides stay discoverable.
  const mayPostFreight = role ? canManageFreight(role) : true
  const mayRegisterTruck = role ? canManageFleet(role) : true

  const freight: MarketplaceCta = {
    kind: 'post-freight',
    label: POST_FREIGHT_LABEL,
    path: POST_FREIGHT_PATH,
    href: isAuthenticated ? POST_FREIGHT_PATH : loginRedirectUrl(POST_FREIGHT_PATH),
    primary: false,
    hint: 'Publish your tonnage and route so verified transporters nearby come to you.',
  }

  const fleet: MarketplaceCta = {
    kind: 'register-truck',
    label: REGISTER_TRUCK_LABEL,
    path: REGISTER_TRUCK_PATH,
    href: isAuthenticated ? REGISTER_TRUCK_PATH : loginRedirectUrl(REGISTER_TRUCK_PATH),
    primary: false,
    hint: 'List your vehicle and preferred corridors so shippers searching this hub find you.',
  }

  // Truck mode: the visitor is short a vehicle, so freight leads. Load mode:
  // they are short cargo, so the fleet side leads.
  const ordered = mode === 'trucks' ? [freight, fleet] : [fleet, freight]
  const available = ordered.filter(
    (cta) => (cta.kind === 'post-freight' ? mayPostFreight : mayRegisterTruck)
  )
  const withheld = ordered.find(
    (cta) => !(cta.kind === 'post-freight' ? mayPostFreight : mayRegisterTruck)
  )

  available.forEach((cta, index) => {
    cta.primary = index === 0
  })

  const hidden = withheld
    ? {
        kind: withheld.kind,
        label: withheld.label,
        note:
          withheld.kind === 'post-freight'
            ? 'Freight posting is available on shipper and transporter accounts — this account lists vehicles.'
            : 'Vehicle registration is available on driver and transporter accounts — this account posts freight.',
      }
    : undefined

  return { ctas: available, primary: available[0], hidden }
}

// ── Copy ────────────────────────────────────────────────────────────────────

export interface SearchEmptyCopy {
  title: string
  description: string
}

export interface SearchEmptyCopyContext {
  mode: SearchMode
  radius: string
  /** Loading point label, when one is set. */
  locationLabel?: string
}

/** Headline + supporting line for each empty-state variant. */
export function getSearchEmptyCopy(
  variant: SearchEmptyVariant,
  context: SearchEmptyCopyContext
): SearchEmptyCopy {
  const noun = context.mode === 'trucks' ? 'trucks' : 'freight loads'
  const place = context.locationLabel?.trim()

  switch (variant) {
    case 'needs-location':
      return {
        title: `Set a loading point to search ${noun}`,
        description:
          'Proximity matching runs within a radius of your loading point. Detect your GPS position or enter an industrial hub below — the search then queries the live marketplace.',
      }
    case 'ready-to-search':
      return {
        title: place ? `Ready to search near ${place}` : 'Ready to search',
        description: `Run the search to query live ${noun} within ${context.radius} km, or adjust the radius and vehicle type first.`,
      }
    case 'error':
      return {
        title: 'The marketplace query did not complete',
        description:
          'We could not reach the search service, so no result count is available. This is a connection problem, not an empty marketplace — retry the query before widening your filters.',
      }
    case 'no-results':
    default:
      return {
        title: `No matching ${noun} within ${context.radius} km${place ? ` of ${place}` : ''}`,
        description: `Nothing live matches these filters right now. Expand the radius, clear the vehicle type filter, or publish your own requirement so carriers near ${place || 'the hub'} come to you.`,
      }
  }
}

// ── Query construction ──────────────────────────────────────────────────────

export interface MarketplaceQueryInput {
  lat: string
  lng: string
  radius: string
  truckType?: string
  tonnage?: string
  mode: SearchMode
}

/** Backend endpoint for a mode. */
export function marketplaceEndpoint(mode: SearchMode): '/search/trucks' | '/search/loads' {
  return mode === 'trucks' ? '/search/trucks' : '/search/loads'
}

/**
 * Build the query string for a marketplace search.
 *
 * Kept parameterised on `radius` on purpose: the empty state's "expand radius"
 * action has to search with the *new* radius, but React state has not committed
 * when the handler fires, so reading `radius` from the closure returns the
 * previous value. That is exactly how "Expand Search to 200 km" used to
 * silently re-run a 50 km query.
 */
export function buildMarketplaceQuery(input: MarketplaceQueryInput): string {
  const params = new URLSearchParams({
    lat: input.lat,
    lng: input.lng,
    radius: input.radius,
  })
  if (input.truckType) params.append('truckType', input.truckType)
  if (input.tonnage) {
    // Truck search filters on the floor, load search on the ceiling.
    params.append(input.mode === 'trucks' ? 'minTonnage' : 'maxTonnage', input.tonnage)
  }
  return params.toString()
}

// ── Demo preview data ───────────────────────────────────────────────────────

/**
 * Fixed label that must appear on every sample card and on the section header.
 * Requirement: demo cards are never allowed to pass as live marketplace data.
 */
export const SAMPLE_PREVIEW_LABEL = 'Sample preview'

/** CTA shown to anonymous visitors underneath the sample cards. */
export const LOGIN_LIVE_MARKETPLACE_CTA = 'Login to search live marketplace'

/** Line that states plainly what the sample cards are and are not. */
export const SAMPLE_PREVIEW_DISCLAIMER =
  'Illustrative listing layout only — these are not live listings, not real carriers, and no contact details are unlocked.'

/**
 * A sample truck listing.
 *
 * Contact fields are deliberately absent from the type: a preview must never
 * present a reachable phone number or WhatsApp handle as an unlocked contact.
 * The card renders the sealed-contact state instead.
 */
export interface DemoTruckPreview {
  id: string
  registrationNumber: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  lengthFt: number
  tonnageCapacity: number
  distanceKm: number
  verificationStatus: 'Verified' | 'Pending'
  preferredDestinations: string[]
}

/** A sample load listing. See {@link DemoTruckPreview} for the contact rule. */
export interface DemoLoadPreview {
  id: string
  loadingAddress: string
  unloadingAddress: string
  truckType: 'Open' | 'Container' | 'OpenBody'
  tonnageRequired: number
  distanceKm: number
  urgent: boolean
  maxPrice: number | null
}

export const DEMO_TRUCK_PREVIEWS: readonly DemoTruckPreview[] = [
  {
    id: 'sample-truck-container-32ft',
    registrationNumber: 'MH 12 QW 9042',
    bodyType: 'Container',
    lengthFt: 32,
    tonnageCapacity: 20,
    distanceKm: 14.2,
    verificationStatus: 'Verified',
    preferredDestinations: ['Mumbai', 'Nashik'],
  },
  {
    id: 'sample-truck-open-24ft',
    registrationNumber: 'TN 22 AB 4471',
    bodyType: 'Open',
    lengthFt: 24,
    tonnageCapacity: 14,
    distanceKm: 28.6,
    verificationStatus: 'Verified',
    preferredDestinations: ['Coimbatore'],
  },
  {
    id: 'sample-truck-trailer-40ft',
    registrationNumber: 'GJ 05 CD 8830',
    bodyType: 'OpenBody',
    lengthFt: 40,
    tonnageCapacity: 32,
    distanceKm: 41.9,
    verificationStatus: 'Pending',
    preferredDestinations: ['Ahmedabad', 'Surat'],
  },
] as const

export const DEMO_LOAD_PREVIEWS: readonly DemoLoadPreview[] = [
  {
    id: 'sample-load-chakan-bhiwandi',
    loadingAddress: 'Chakan MIDC, Pune',
    unloadingAddress: 'Bhiwandi, Mumbai',
    truckType: 'Container',
    tonnageRequired: 18,
    distanceKm: 9.4,
    urgent: true,
    maxPrice: null,
  },
  {
    id: 'sample-load-oragadam-hosur',
    loadingAddress: 'Oragadam, Chennai',
    unloadingAddress: 'Hosur, Krishnagiri',
    truckType: 'Open',
    tonnageRequired: 12,
    distanceKm: 22.7,
    urgent: false,
    maxPrice: 46000,
  },
  {
    id: 'sample-load-manesar-bawal',
    loadingAddress: 'Manesar IMT, Gurugram',
    unloadingAddress: 'Bawal, Rewari',
    truckType: 'OpenBody',
    tonnageRequired: 26,
    distanceKm: 36.1,
    urgent: false,
    maxPrice: null,
  },
] as const

/** Human label for a body type, shared by the live cards and the previews. */
export function bodyTypeLabel(bodyType: string): string {
  switch (bodyType) {
    case 'Container':
      return 'Closed Container'
    case 'OpenBody':
      return 'Open Body Trailer'
    default:
      return 'Open Body'
  }
}
