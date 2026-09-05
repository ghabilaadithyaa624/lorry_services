/**
 * Canonical user roles — mirrors the Prisma `UserRole` enum and
 * docs/database-schema-design.md.
 */
export type AppUserRole = 'factory_owner' | 'truck_driver' | 'transporter' | 'admin'

/**
 * Legacy labels that may still be present in cached sessions, cookies or JWTs
 * issued before the role cleanup. They are normalized, never persisted.
 */
export type LegacyUserRole = 'load_owner' | 'truck_owner' | 'driver'

export type AnyUserRole = AppUserRole | LegacyUserRole

export type PublicRegistrationRole = Exclude<AppUserRole, 'admin'>

export const LEGACY_ROLE_MAP: Record<LegacyUserRole, AppUserRole> = {
  load_owner: 'factory_owner',
  truck_owner: 'truck_driver',
  driver: 'truck_driver',
}

/** Legacy dashboard routes kept alive as redirects to the canonical route. */
export const LEGACY_DASHBOARD_REDIRECTS: Record<string, string> = {
  '/dashboard/load-owner': '/dashboard/factory-owner',
  '/dashboard/truck-owner': '/dashboard/truck-driver',
  '/dashboard/driver': '/dashboard/truck-driver',
}

export const DEFAULT_DASHBOARD = '/dashboard/factory-owner'

/**
 * Map any legacy or canonical role label onto a canonical role.
 * Returns `undefined` for unknown input so callers choose the fallback.
 */
export function normalizeRole(role?: string | null): AppUserRole | undefined {
  if (!role) return undefined
  if (
    role === 'factory_owner' ||
    role === 'truck_driver' ||
    role === 'transporter' ||
    role === 'admin'
  )
    return role
  return LEGACY_ROLE_MAP[role as LegacyUserRole]
}

export interface RegistrationRoleOption {
  value: PublicRegistrationRole
  label: string
  eyebrow: string
  description: string
  benefits: string[]
  dashboard: string
}

export const REGISTRATION_ROLES: RegistrationRoleOption[] = [
  {
    value: 'factory_owner',
    label: 'Factory Owner',
    eyebrow: 'SHIP GOODS',
    description: 'Post freight requirements and connect with verified transport partners.',
    benefits: ['Post loads in minutes', 'Compare nearby transporters'],
    dashboard: '/dashboard/factory-owner',
  },
  {
    value: 'truck_driver',
    label: 'Truck Driver',
    eyebrow: 'ON THE ROAD',
    description: 'List vehicles, find verified loads, and keep every trip earning.',
    benefits: ['Find return loads', 'Manage vehicles and bookings'],
    dashboard: '/dashboard/truck-driver',
  },
  {
    value: 'transporter',
    label: 'Transporter',
    eyebrow: 'BOTH SIDES',
    description: 'Manage both freight postings and truck listings from one workspace.',
    benefits: [
      'Post freight and list trucks side by side',
      'One workspace for loads, fleet and bookings',
    ],
    dashboard: '/dashboard/transporter',
  },
]

export function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case 'factory_owner':
      return 'Factory owner'
    case 'truck_driver':
      return 'Truck driver'
    case 'transporter':
      return 'Transporter'
    case 'admin':
      return 'Administrator'
    default:
      return 'Operator'
  }
}

/**
 * Post-login / post-signup landing routes:
 * - factory_owner -> /dashboard/factory-owner
 * - truck_driver  -> /dashboard/truck-driver
 * - transporter   -> /dashboard/transporter
 * - admin         -> /admin/dashboard
 */
export function getDashboardForRole(role?: string | null): string {
  const canonical = normalizeRole(role)
  if (canonical === 'admin') return '/admin/dashboard'
  return REGISTRATION_ROLES.find((option) => option.value === canonical)?.dashboard || DEFAULT_DASHBOARD
}

export function isVehicleSideRole(role?: string | null): boolean {
  return normalizeRole(role) === 'truck_driver'
}

export function isFreightSideRole(role?: string | null): boolean {
  return normalizeRole(role) === 'factory_owner'
}

/** Both-sides operators: post freight AND list trucks from one workspace. */
export function isTransporterRole(role?: string | null): boolean {
  return normalizeRole(role) === 'transporter'
}

/**
 * Mirrors the API RBAC (`LOAD_MANAGER_ROLES` in apps/api roles.util): shippers
 * and transporters may create/manage freight postings; admins keep override.
 */
export function canManageFreight(role?: string | null): boolean {
  const canonical = normalizeRole(role)
  return canonical === 'factory_owner' || canonical === 'transporter' || canonical === 'admin'
}

/**
 * Mirrors the API RBAC (`TRUCK_MANAGER_ROLES` in apps/api roles.util): drivers
 * and transporters may list/manage trucks; admins keep override.
 */
export function canManageFleet(role?: string | null): boolean {
  const canonical = normalizeRole(role)
  return canonical === 'truck_driver' || canonical === 'transporter' || canonical === 'admin'
}

/** Platform operators. Normalized so stale sessions are evaluated consistently. */
export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'admin'
}
