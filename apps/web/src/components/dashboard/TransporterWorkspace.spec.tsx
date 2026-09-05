import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  MarketplaceShortcutsPanel,
  MyFreightPostsPanel,
  MyTruckPostsPanel,
} from './TransporterWorkspace'
import { DashboardSummaryCards } from './DashboardSummaryCards'

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  loadsApi: { getMyLoads: jest.fn(), updateLoad: jest.fn(), deleteLoad: jest.fn() },
  trucksApi: { getMyTrucks: jest.fn(), updateTruck: jest.fn(), deleteTruck: jest.fn() },
}))
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }))

const ownLoad = {
  id: 'own-load-0001',
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

const foreignLoad = {
  ...ownLoad,
  id: 'foreign-load-0002',
  userId: 'someone-else',
  status: 'Open',
}

const ownTruck = {
  id: 'own-truck-0001',
  userId: 'user-1',
  registrationNumber: 'MH12QW8842',
  bodyType: 'Container',
  lengthFt: 24,
  tonnageCapacity: 16,
  serviceableRadiusKm: 50,
  verificationStatus: 'Verified',
}

const onTripTruck = {
  ...ownTruck,
  id: 'ontrip-truck-0002',
  registrationNumber: 'TN01AB1234',
  activeBooking: { id: 'bk-1' },
}

describe('MyFreightPostsPanel (transporter workspace)', () => {
  it('shows the "Post your first freight load" empty state with a posting shortcut', () => {
    const html = renderToStaticMarkup(
      <MyFreightPostsPanel loads={[]} currentUserId="user-1" />
    )
    expect(html).toContain('Post your first freight load')
    expect(html).toContain('/need-load')
    expect(html).not.toContain('>Edit<')
    expect(html).not.toContain('>Delete<')
  })

  it('renders edit/delete actions for own loads only', () => {
    const html = renderToStaticMarkup(
      <MyFreightPostsPanel loads={[ownLoad, foreignLoad]} currentUserId="user-1" />
    )
    expect(html).toContain('LOAD-OWN-LOAD')
    expect(html).toContain('LOAD-FOREIGN-')
    // Exactly one actionable row: the current user's own post.
    expect(html.match(/>Edit</g)).toHaveLength(1)
    expect(html.match(/>Delete</g)).toHaveLength(1)
  })

  it('treats rows without a userId as own (the my-loads endpoint is ownership-scoped)', () => {
    const html = renderToStaticMarkup(
      <MyFreightPostsPanel loads={[{ ...ownLoad, userId: undefined }]} currentUserId="user-1" />
    )
    expect(html.match(/>Edit</g)).toHaveLength(1)
  })

  it('disables edit/delete once the load has left Open status', () => {
    const html = renderToStaticMarkup(
      <MyFreightPostsPanel loads={[{ ...ownLoad, status: 'InTransit' }]} currentUserId="user-1" />
    )
    expect(html).toContain('Only open loads can be edited')
    expect(html).toContain('disabled=""')
  })
})

describe('MyTruckPostsPanel (transporter workspace)', () => {
  it('shows the "Register your first lorry" empty state with a registration shortcut', () => {
    const html = renderToStaticMarkup(
      <MyTruckPostsPanel trucks={[]} currentUserId="user-1" />
    )
    expect(html).toContain('Register your first lorry')
    expect(html).toContain('/need-vehicle')
    expect(html).not.toContain('>Edit<')
    expect(html).not.toContain('>Delete<')
  })

  it('renders edit/delete for own trucks and locks deletion while on a trip', () => {
    const foreignTruck = { ...ownTruck, id: 'foreign-truck-003', userId: 'someone-else' }
    const html = renderToStaticMarkup(
      <MyTruckPostsPanel trucks={[ownTruck, onTripTruck, foreignTruck]} currentUserId="user-1" />
    )
    // Two own trucks → two edit buttons; the foreign truck renders none.
    expect(html.match(/>Edit</g)).toHaveLength(2)
    // Only the truck without an active booking keeps an enabled delete.
    expect(html.match(/>Delete</g)).toHaveLength(2)
    expect(html).toContain('On trip — deletion locked')
    expect(html).toContain('MH12QW8842')
  })
})

describe('MarketplaceShortcutsPanel (read-only marketplace shortcut)', () => {
  it('links both marketplace sides and never exposes edit/delete controls', () => {
    const html = renderToStaticMarkup(<MarketplaceShortcutsPanel />)
    expect(html).toContain('Marketplace')
    expect(html).toContain('/search?type=load')
    expect(html).toContain('/search?type=truck')
    expect(html).not.toContain('>Edit<')
    expect(html).not.toContain('>Delete<')
    expect(html).not.toContain('Trash2')
  })
})

describe('DashboardSummaryCards transporter mode', () => {
  it('adds the "my posts" cards for both marketplace sides', () => {
    const html = renderToStaticMarkup(
      <DashboardSummaryCards
        activeLoads={3}
        activeTrucks={5}
        activeBookings={2}
        completedTrips={7}
        earnings={154000}
      />
    )
    expect(html).toContain('My active loads')
    expect(html).toContain('My active trucks')
    expect(html).toContain('Active bookings')
    expect(html).toContain('Completed trips')
    expect(html).toContain('Earnings')
    expect(html).toContain('/my-loads')
    expect(html).toContain('/my-trucks')
  })

  it('keeps the three-card layout for single-side roles', () => {
    const html = renderToStaticMarkup(
      <DashboardSummaryCards activeBookings={2} completedTrips={0} earnings={0} />
    )
    expect(html).not.toContain('My active loads')
    expect(html).not.toContain('My active trucks')
  })
})
