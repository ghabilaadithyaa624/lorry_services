/**
 * MyListingsWorkspace — regression coverage for the unified /my-listings page:
 * tab presence, role-gated CTAs (product decision from Prompt 8) and the
 * ownership gate that hides Edit/Delete for records that are not the current
 * user's, even if a foreign row ever leaked into an ownership-scoped list.
 */
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  isOwnRecord,
  ListingsFreightPanel,
  ListingsRoleCta,
  ListingsTruckPanel,
  MyListingsWorkspace,
  type ListingLoadRow,
  type ListingTruckRow,
} from './MyListingsWorkspace'

// Mutable query for the container tests (read lazily inside the mock).
let search = ''

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/my-listings',
  useSearchParams: () => new URLSearchParams(search),
}))
jest.mock('@/lib/api', () => ({
  loadsApi: { getMyLoads: jest.fn().mockResolvedValue({ data: [] }), updateLoad: jest.fn(), deleteLoad: jest.fn() },
  trucksApi: {
    getMyTrucks: jest.fn().mockResolvedValue({ data: [] }),
    updateTruck: jest.fn(),
    updateTruckLocation: jest.fn(),
    deleteTruck: jest.fn(),
  },
}))
jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}))

const ownLoad: ListingLoadRow = {
  id: 'load-own-0001',
  userId: 'user-1',
  loadingAddress: 'MIDC, Pune',
  unloadingAddress: 'Whitefield, Bengaluru',
  truckType: 'Open',
  tonnageRequired: 18,
  maxPrice: 48000,
  urgent: true,
  status: 'Open',
  createdAt: new Date().toISOString(),
  _count: { bookings: 2 },
}

const matchedLoad: ListingLoadRow = {
  ...ownLoad,
  id: 'load-matched-0002',
  status: 'Matched',
}

const foreignLoad: ListingLoadRow = {
  ...ownLoad,
  id: 'load-foreign-0003',
  userId: 'someone-else',
}

const ownTruck: ListingTruckRow = {
  id: 'truck-own-0001',
  userId: 'user-1',
  registrationNumber: 'MH12QW8842',
  bodyType: 'Container',
  lengthFt: 24,
  heightFt: 8,
  tonnageCapacity: 16,
  serviceableRadiusKm: 50,
  verificationStatus: 'Pending',
  preferredDestinations: ['Mumbai', 'Pune'],
}

const verifiedTruck: ListingTruckRow = {
  ...ownTruck,
  id: 'truck-verified-0002',
  registrationNumber: 'TN01AB1234',
  verificationStatus: 'Verified',
}

const foreignTruck: ListingTruckRow = {
  ...ownTruck,
  id: 'truck-foreign-0003',
  userId: 'someone-else',
}

const noop = () => undefined

describe('isOwnRecord (client-side ownership gate)', () => {
  it('prefers the backend isOwner flag (Prompt 9) over the legacy userId compare', () => {
    expect(isOwnRecord({ isOwner: true, userId: 'someone-else' }, 'user-1')).toBe(true)
    expect(isOwnRecord({ isOwner: false, userId: 'user-1' }, 'user-1')).toBe(false)
  })

  it('matches rows by user id when no isOwner flag is present', () => {
    expect(isOwnRecord({ userId: 'user-1' }, 'user-1')).toBe(true)
    expect(isOwnRecord({ userId: 'user-2' }, 'user-1')).toBe(false)
  })

  it('trusts rows without a userId (the my-* endpoints are ownership-scoped)', () => {
    expect(isOwnRecord({}, 'user-1')).toBe(true)
    expect(isOwnRecord(undefined, 'user-1')).toBe(true)
  })

  it('treats an unresolved session user id as "everything visible is mine"', () => {
    expect(isOwnRecord({ userId: 'user-9' }, null)).toBe(true)
  })
})

describe('ListingsFreightPanel', () => {
  it('renders status badges and route details', () => {
    const html = renderToStaticMarkup(
      <ListingsFreightPanel loads={[ownLoad, matchedLoad]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(html).toContain('LOAD-LOAD-OWN')
    expect(html).toContain('MIDC, Pune')
    expect(html).toContain('Whitefield, Bengaluru')
    expect(html).toContain('Open')
    expect(html).toContain('Matched')
    expect(html).toContain('Urgent')
  })

  it('shows Manage/Edit/Delete only for own, still-open loads', () => {
    const html = renderToStaticMarkup(
      <ListingsFreightPanel loads={[ownLoad, matchedLoad, foreignLoad]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(html.match(/Edit</g)).toHaveLength(1)
    expect(html.match(/Delete</g)).toHaveLength(1)
    expect(html.match(/Manage</g)).toHaveLength(1)
    // Foreign or matched rows never render destructive affordances.
    expect(html).toContain('Locked from edits once matched')
  })

  it('renders the posting empty state when there are no loads', () => {
    const html = renderToStaticMarkup(
      <ListingsFreightPanel loads={[]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(html).toContain('No freight posts yet')
    expect(html).toContain('/post-load')
  })

  it('surfaces load failures with a retry affordance', () => {
    const html = renderToStaticMarkup(
      <ListingsFreightPanel loads={[]} loading={false} error="boom" onRetry={noop} onRefresh={noop} />
    )
    expect(html).toContain('Could not load your freight posts')
    expect(html).toContain('Try again')
  })
})

describe('ListingsTruckPanel', () => {
  it('shows verification status per truck', () => {
    const html = renderToStaticMarkup(
      <ListingsTruckPanel trucks={[ownTruck, verifiedTruck]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(html).toContain('MH12QW8842')
    expect(html).toContain('Pending verification')
    expect(html).toContain('Vahan verified')
    expect(html).toContain('Mumbai')
  })

  it('shows Manage Documents/Edit/Delete for own trucks only — never for a foreign row', () => {
    const html = renderToStaticMarkup(
      <ListingsTruckPanel trucks={[ownTruck, foreignTruck]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    // Two actions per managed row, none for the foreign row.
    const own = renderToStaticMarkup(
      <ListingsTruckPanel trucks={[ownTruck]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    const foreignOnly = renderToStaticMarkup(
      <ListingsTruckPanel trucks={[foreignTruck]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(html.match(/Edit</g)).toHaveLength(1)
    expect(own).toContain('Edit<')
    expect(own).toContain('Manage Documents<')
    expect(foreignOnly).not.toContain('Edit<')
    expect(foreignOnly).not.toContain('Delete<')
    expect(foreignOnly).not.toContain('Manage Documents<')
  })

  it('honours the backend isOwner flag when present (Prompt 9)', () => {
    const flaggedForeign = renderToStaticMarkup(
      <ListingsTruckPanel trucks={[{ ...ownTruck, isOwner: false }]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(flaggedForeign).not.toContain('Edit<')
    expect(flaggedForeign).not.toContain('Delete<')
    expect(flaggedForeign).not.toContain('Manage Documents<')
  })

  it('renders the registration empty state when no truck is listed', () => {
    const html = renderToStaticMarkup(
      <ListingsTruckPanel trucks={[]} loading={false} currentUserId="user-1" onRetry={noop} onRefresh={noop} />
    )
    expect(html).toContain('No trucks listed yet')
    expect(html).toContain('/need-vehicle')
  })
})

describe('ListingsRoleCta', () => {
  it('offers the transporter upgrade path on the truck side (factory owner)', () => {
    const html = renderToStaticMarkup(<ListingsRoleCta side="trucks" />)
    expect(html).toContain('List trucks with a Transporter account')
    expect(html).toContain('Register as transporter')
    expect(html).toContain('/role-select')
    // No listing management on a CTA panel.
    expect(html).not.toContain('Edit<')
    expect(html).not.toContain('Delete<')
  })

  it('offers the transporter upgrade path on the freight side (truck driver)', () => {
    const html = renderToStaticMarkup(<ListingsRoleCta side="freight" />)
    expect(html).toContain('Post freight with a Transporter account')
    expect(html).toContain('Register as transporter')
    expect(html).toContain('/search?type=load')
  })
})

describe('MyListingsWorkspace (container)', () => {
  afterEach(() => {
    search = ''
  })

  it('renders both tabs for a transporter', () => {
    const html = renderToStaticMarkup(<MyListingsWorkspace role="transporter" currentUserId="user-1" />)
    expect(html).toContain('Freight Posts')
    expect(html).toContain('Truck Posts')
    // Default tab is freight → the panel (empty state) shows, not the CTA.
    expect(html).toContain('No freight posts yet')
    expect(html).not.toContain('List trucks with a Transporter account')
  })

  it('keeps the truck tab for factory owners as a CTA, not data', () => {
    search = 'tab=trucks'
    const html = renderToStaticMarkup(<MyListingsWorkspace role="factory_owner" currentUserId="user-1" />)
    expect(html).toContain('List trucks with a Transporter account')
    expect(html).not.toContain('No trucks listed yet')
    expect(html).not.toContain('/my-trucks')
  })

  it('defaults truck drivers to the fleet tab and CTAs the freight tab', () => {
    const defaultView = renderToStaticMarkup(<MyListingsWorkspace role="truck_driver" currentUserId="user-1" />)
    // defaultTab === 'trucks' → fleet panel is open
    expect(defaultView).toContain('No trucks listed yet')

    search = 'tab=freight'
    const freightView = renderToStaticMarkup(<MyListingsWorkspace role="truck_driver" currentUserId="user-1" />)
    expect(freightView).toContain('Post freight with a Transporter account')
    expect(freightView).not.toContain('No freight posts yet')
  })

  it('never fetches or renders a side the role cannot manage', () => {
    search = 'tab=trucks'
    const html = renderToStaticMarkup(<MyListingsWorkspace role="factory_owner" currentUserId="user-1" />)
    // CTA replaces the data panel: no register-truck shortcut for a role the
    // API would reject on /need-vehicle.
    expect(html).not.toContain('Register truck<')
  })

  it('shows skeletons while the session is not resolved', () => {
    const html = renderToStaticMarkup(<MyListingsWorkspace role="transporter" currentUserId="user-1" resolved={false} />)
    expect(html).toContain('Loading your listings')
    expect(html).not.toContain('Freight Posts')
  })
})
