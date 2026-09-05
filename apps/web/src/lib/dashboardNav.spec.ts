import fs from 'fs'
import path from 'path'
import { translate } from '@/lib/i18n'
import { UI_LANGUAGES } from '@/lib/language'
import {
  ADMIN_NAV,
  FACTORY_OWNER_NAV,
  TRANSPORTER_NAV,
  TRUCK_DRIVER_NAV,
  getNavForRole,
  isNavItemActive,
  type DashboardNavItem,
} from './dashboardNav'
import { LEGACY_DASHBOARD_REDIRECTS } from './roles'

/**
 * Prompt 11 — role-based navigation cleanup.
 *
 * Guards that each canonical role gets exactly the required navigation, in the
 * required order, that every href resolves to a real route under `src/app/**`,
 * and that legacy dashboard routes still redirect to the canonical ones.
 */

const labels = (items: readonly DashboardNavItem[]) => items.map((item) => item.label)

const APP_DIR = path.join(__dirname, '..', 'app')

/** True when `href` maps to a `page.tsx` under `src/app`. */
function routeExists(href: string): boolean {
  const pathname = href.split('?')[0]
  const segments = pathname.split('/').filter(Boolean)
  return fs.existsSync(path.join(APP_DIR, ...segments, 'page.tsx'))
}

describe('dashboard navigation per role', () => {
  it('gives factory owners the freight-side workspace', () => {
    expect(labels(FACTORY_OWNER_NAV)).toEqual([
      'Dashboard',
      'Find Trucks',
      'Post Freight',
      'My Loads',
      'Bookings',
      'Tracking',
      'Subscription',
      'Notifications',
      'Settings',
    ])
  })

  it('gives truck drivers the fleet-side workspace', () => {
    expect(labels(TRUCK_DRIVER_NAV)).toEqual([
      'Dashboard',
      'Find Loads',
      'My Trucks',
      'Bookings',
      'Tracking',
      'Documents',
      'Subscription',
      'Notifications',
      'Settings',
    ])
  })

  it('gives transporters both sides of the marketplace', () => {
    expect(labels(TRANSPORTER_NAV)).toEqual([
      'Dashboard',
      'Find Trucks',
      'Find Loads',
      'Post Freight',
      'Register Truck',
      'My Listings',
      'My Loads',
      'My Trucks',
      'Bookings',
      'Tracking',
      'Documents',
      'Subscription',
      'Notifications',
      'Settings',
    ])
  })

  it('gives admins the operations console', () => {
    expect(labels(ADMIN_NAV)).toEqual([
      'Control Tower',
      'KYC Queue',
      'Listings',
      'Bookings',
      'Disputes',
      'Subscriptions',
      'Analytics',
      'Users',
      'Intelligence',
      'Risk',
    ])
  })

  it('never shows freight-only entries to truck drivers', () => {
    expect(labels(TRUCK_DRIVER_NAV)).not.toContain('Post Freight')
    expect(labels(TRUCK_DRIVER_NAV)).not.toContain('My Loads')
  })

  it('never shows fleet-only entries to factory owners', () => {
    expect(labels(FACTORY_OWNER_NAV)).not.toContain('My Trucks')
    expect(labels(FACTORY_OWNER_NAV)).not.toContain('Register Truck')
  })

  it('uses unique keys within every role', () => {
    for (const nav of [FACTORY_OWNER_NAV, TRUCK_DRIVER_NAV, TRANSPORTER_NAV, ADMIN_NAV]) {
      const keys = nav.map((item) => item.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})

describe('getNavForRole', () => {
  it.each([
    ['factory_owner', FACTORY_OWNER_NAV],
    ['truck_driver', TRUCK_DRIVER_NAV],
    ['transporter', TRANSPORTER_NAV],
    ['admin', ADMIN_NAV],
  ])('resolves the canonical role %s', (role, expected) => {
    expect(getNavForRole(role)).toBe(expected)
  })

  it.each([
    ['load_owner', FACTORY_OWNER_NAV],
    ['truck_owner', TRUCK_DRIVER_NAV],
    ['driver', TRUCK_DRIVER_NAV],
  ])('normalizes the legacy role %s', (role, expected) => {
    expect(getNavForRole(role)).toBe(expected)
  })

  it('falls back to the factory owner workspace for unknown sessions', () => {
    expect(getNavForRole(undefined)).toBe(FACTORY_OWNER_NAV)
    expect(getNavForRole('space_pilot')).toBe(FACTORY_OWNER_NAV)
  })
})

describe('navigation routes', () => {
  const allItems = [
    ...FACTORY_OWNER_NAV,
    ...TRUCK_DRIVER_NAV,
    ...TRANSPORTER_NAV,
    ...ADMIN_NAV,
  ]

  it('points every entry at a page that exists', () => {
    const missing = allItems.filter((item) => !routeExists(item.href)).map((i) => i.href)
    expect(missing).toEqual([])
  })

  it('exposes the transporter workspace route', () => {
    expect(routeExists('/dashboard/transporter')).toBe(true)
  })

  it('keeps the legacy dashboards redirecting to canonical routes', () => {
    expect(LEGACY_DASHBOARD_REDIRECTS).toEqual({
      '/dashboard/load-owner': '/dashboard/factory-owner',
      '/dashboard/truck-owner': '/dashboard/truck-driver',
      '/dashboard/driver': '/dashboard/truck-driver',
    })
    for (const [legacy, canonical] of Object.entries(LEGACY_DASHBOARD_REDIRECTS)) {
      expect(routeExists(legacy)).toBe(true)
      expect(routeExists(canonical)).toBe(true)
    }
  })
})

describe('label translations', () => {
  it('resolves every label in all UI languages', () => {
    const items = [...FACTORY_OWNER_NAV, ...TRUCK_DRIVER_NAV, ...TRANSPORTER_NAV, ...ADMIN_NAV]
    for (const { value: language } of UI_LANGUAGES) {
      for (const item of items) {
        const value = translate(item.labelKey, language)
        expect(value).not.toBe(item.labelKey)
        expect(value.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('isNavItemActive', () => {
  it('matches dashboard roots exactly', () => {
    expect(isNavItemActive('/dashboard/transporter', '/dashboard/transporter')).toBe(true)
    expect(isNavItemActive('/dashboard/transporter', '/dashboard/transporter/x')).toBe(false)
  })

  it('matches nested routes by prefix and ignores query strings', () => {
    expect(isNavItemActive('/search?type=truck', '/search')).toBe(true)
    expect(isNavItemActive('/my-loads', '/my-loads/123')).toBe(true)
    expect(isNavItemActive('/my-loads', '/my-loads-archive')).toBe(false)
  })
})
