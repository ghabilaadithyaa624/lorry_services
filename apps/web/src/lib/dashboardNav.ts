import type { ComponentType } from 'react'
import {
  BellAlertIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  GlobeAsiaAustraliaIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MapIcon,
  PlusCircleIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { normalizeRole, type AppUserRole } from './roles'

/**
 * dashboardNav — single source of truth for the authenticated sidebar / mobile
 * navigation of every canonical role (Prompt 11: role-based navigation cleanup).
 *
 * Ground rules:
 * - one entry per role requirement, in the exact required order,
 * - every `href` points at a route that exists under `src/app/**`,
 * - user-facing labels go through the i18n catalogue via `labelKey`, with the
 *   English `label` kept inline as the fallback used before catalogs resolve
 *   and by the tests.
 */

export interface DashboardNavItem {
  /** Stable identifier, unique inside a role's navigation. */
  key: string
  /** i18n catalogue key for the label. */
  labelKey: string
  /** English fallback label (also the contract asserted by tests). */
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  /** Rendered as a count pill (e.g. unread notifications). */
  badgeKey?: 'notifications'
}

/** Section roots that must match exactly (never by prefix) when highlighting. */
export const DASHBOARD_ROOTS = [
  '/dashboard/factory-owner',
  '/dashboard/truck-driver',
  '/dashboard/transporter',
  '/admin/dashboard',
] as const

/* ── Shared entries so labels/routes never drift between roles ──────────── */

const DASHBOARD = (href: string): DashboardNavItem => ({
  key: 'dashboard',
  labelKey: 'dash.dashboard',
  label: 'Dashboard',
  href,
  icon: HomeIcon,
})

const FIND_TRUCKS: DashboardNavItem = {
  key: 'find-trucks',
  labelKey: 'nav.findTrucks',
  label: 'Find Trucks',
  href: '/search?type=truck',
  icon: MagnifyingGlassIcon,
}

const FIND_LOADS: DashboardNavItem = {
  key: 'find-loads',
  labelKey: 'nav.findLoads',
  label: 'Find Loads',
  href: '/search?type=load',
  icon: MagnifyingGlassIcon,
}

const POST_FREIGHT: DashboardNavItem = {
  key: 'post-freight',
  labelKey: 'nav.postFreight',
  label: 'Post Freight',
  href: '/post-load',
  icon: PlusCircleIcon,
}

const REGISTER_TRUCK: DashboardNavItem = {
  key: 'register-truck',
  labelKey: 'nav.registerTruck',
  label: 'Register Truck',
  href: '/register-truck',
  icon: TruckIcon,
}

const MY_LISTINGS: DashboardNavItem = {
  key: 'my-listings',
  labelKey: 'dash.myListings',
  label: 'My Listings',
  href: '/my-listings',
  icon: RectangleStackIcon,
}

const MY_LOADS: DashboardNavItem = {
  key: 'my-loads',
  labelKey: 'dash.myLoads',
  label: 'My Loads',
  href: '/my-loads',
  icon: ClipboardDocumentListIcon,
}

const MY_TRUCKS: DashboardNavItem = {
  key: 'my-trucks',
  labelKey: 'dash.myTrucks',
  label: 'My Trucks',
  href: '/my-trucks',
  icon: TruckIcon,
}

const BOOKINGS: DashboardNavItem = {
  key: 'bookings',
  labelKey: 'dash.bookings',
  label: 'Bookings',
  href: '/bookings',
  icon: BriefcaseIcon,
}

const TRACKING: DashboardNavItem = {
  key: 'tracking',
  labelKey: 'dash.tracking',
  label: 'Tracking',
  href: '/tracking',
  icon: MapIcon,
}

const DOCUMENTS: DashboardNavItem = {
  key: 'documents',
  labelKey: 'dash.documents',
  label: 'Documents',
  href: '/documents',
  icon: DocumentCheckIcon,
}

const SUBSCRIPTION: DashboardNavItem = {
  key: 'subscription',
  labelKey: 'dash.subscription',
  label: 'Subscription',
  href: '/subscribe',
  icon: CreditCardIcon,
}

const NOTIFICATIONS: DashboardNavItem = {
  key: 'notifications',
  labelKey: 'nav.notifications',
  label: 'Notifications',
  href: '/notifications',
  icon: BellAlertIcon,
  badgeKey: 'notifications',
}

const SETTINGS: DashboardNavItem = {
  key: 'settings',
  labelKey: 'nav.settings',
  label: 'Settings',
  href: '/settings',
  icon: Cog6ToothIcon,
}

/* ── Per-role navigation ────────────────────────────────────────────────── */

/** Factory owner — the freight side of the marketplace. */
export const FACTORY_OWNER_NAV: readonly DashboardNavItem[] = [
  DASHBOARD('/dashboard/factory-owner'),
  FIND_TRUCKS,
  POST_FREIGHT,
  MY_LOADS,
  BOOKINGS,
  TRACKING,
  SUBSCRIPTION,
  NOTIFICATIONS,
  SETTINGS,
]

/** Truck driver — the fleet side of the marketplace. */
export const TRUCK_DRIVER_NAV: readonly DashboardNavItem[] = [
  DASHBOARD('/dashboard/truck-driver'),
  FIND_LOADS,
  MY_TRUCKS,
  BOOKINGS,
  TRACKING,
  DOCUMENTS,
  SUBSCRIPTION,
  NOTIFICATIONS,
  SETTINGS,
]

/** Transporter — both sides of the marketplace from one account. */
export const TRANSPORTER_NAV: readonly DashboardNavItem[] = [
  DASHBOARD('/dashboard/transporter'),
  FIND_TRUCKS,
  FIND_LOADS,
  POST_FREIGHT,
  REGISTER_TRUCK,
  MY_LISTINGS,
  MY_LOADS,
  MY_TRUCKS,
  BOOKINGS,
  TRACKING,
  DOCUMENTS,
  SUBSCRIPTION,
  NOTIFICATIONS,
  SETTINGS,
]

/** Admin console — operations, not marketplace workflows. */
export const ADMIN_NAV: readonly DashboardNavItem[] = [
  {
    key: 'control-tower',
    labelKey: 'nav.controlTower',
    label: 'Control Tower',
    href: '/admin/dashboard',
    icon: ShieldCheckIcon,
  },
  {
    key: 'kyc-queue',
    labelKey: 'admin.nav.kyc',
    label: 'KYC Queue',
    href: '/admin/kyc',
    icon: DocumentCheckIcon,
  },
  {
    key: 'listings',
    labelKey: 'admin.nav.listings',
    label: 'Listings',
    href: '/admin/listings',
    icon: ClipboardDocumentListIcon,
  },
  {
    key: 'bookings',
    labelKey: 'dash.bookings',
    label: 'Bookings',
    href: '/admin/bookings',
    icon: BriefcaseIcon,
  },
  {
    key: 'disputes',
    labelKey: 'admin.nav.disputes',
    label: 'Disputes',
    href: '/admin/disputes',
    icon: ShieldExclamationIcon,
  },
  {
    key: 'subscriptions',
    labelKey: 'admin.nav.subscriptions',
    label: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: CreditCardIcon,
  },
  {
    key: 'analytics',
    labelKey: 'dash.analytics',
    label: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
  },
  {
    key: 'users',
    labelKey: 'admin.nav.users',
    label: 'Users',
    href: '/admin/users',
    icon: UsersIcon,
  },
  {
    key: 'intelligence',
    labelKey: 'admin.nav.intelligence',
    label: 'Intelligence',
    href: '/admin/intelligence',
    icon: GlobeAsiaAustraliaIcon,
  },
  {
    key: 'risk',
    labelKey: 'admin.nav.risk',
    label: 'Risk',
    href: '/admin/risk',
    icon: ShieldExclamationIcon,
  },
]

const NAV_BY_ROLE: Record<AppUserRole, readonly DashboardNavItem[]> = {
  factory_owner: FACTORY_OWNER_NAV,
  truck_driver: TRUCK_DRIVER_NAV,
  transporter: TRANSPORTER_NAV,
  admin: ADMIN_NAV,
}

/**
 * Navigation for a role label (canonical or legacy). Unknown / not-yet-loaded
 * sessions fall back to the factory owner workspace, matching
 * `DEFAULT_DASHBOARD` in `@/lib/roles`.
 */
export function getNavForRole(role?: string | null): readonly DashboardNavItem[] {
  return NAV_BY_ROLE[normalizeRole(role) ?? 'factory_owner']
}

/** Exact match for section roots, prefix match for nested routes. */
export function isNavItemActive(href: string, pathname: string): boolean {
  const path = href.split('?')[0]
  if ((DASHBOARD_ROOTS as readonly string[]).includes(path)) return pathname === path
  return pathname === path || pathname.startsWith(`${path}/`)
}
