/**
 * Canonical user roles — mirrors the Prisma `UserRole` enum and
 * docs/database-schema-design.md (kept in sync with apps/web `src/lib/roles.ts`).
 */
export type AppUserRole = 'factory_owner' | 'truck_driver' | 'transporter' | 'admin'
export type LegacyUserRole = 'load_owner' | 'truck_owner' | 'driver'
export type AnyUserRole = AppUserRole | LegacyUserRole
export type RegistrationRole = Exclude<AppUserRole, 'admin'>

export const LEGACY_ROLE_MAP: Record<LegacyUserRole, AppUserRole> = {
  load_owner: 'factory_owner',
  truck_owner: 'truck_driver',
  driver: 'truck_driver',
}

/** Map any legacy or canonical role label onto a canonical role. */
export function normalizeRole(role?: string | null): AppUserRole | undefined {
  if (!role) return undefined
  if (role === 'factory_owner' || role === 'truck_driver' || role === 'transporter' || role === 'admin') return role
  return LEGACY_ROLE_MAP[role as LegacyUserRole]
}

export function isVehicleSideRole(role?: string | null): boolean {
  return normalizeRole(role) === 'truck_driver'
}

/** Both-sides operators: post freight AND list trucks from one workspace. */
export function isTransporterRole(role?: string | null): boolean {
  return normalizeRole(role) === 'transporter'
}

/** Mirrors the API RBAC: shippers and transporters may post/manage freight. */
export function canManageFreight(role?: string | null): boolean {
  const canonical = normalizeRole(role)
  return canonical === 'factory_owner' || canonical === 'transporter' || canonical === 'admin'
}

/** Mirrors the API RBAC: drivers and transporters may list/manage trucks. */
export function canManageFleet(role?: string | null): boolean {
  const canonical = normalizeRole(role)
  return canonical === 'truck_driver' || canonical === 'transporter' || canonical === 'admin'
}

export function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case 'truck_driver':
      return '🚛 Truck Driver'
    case 'transporter':
      return '🔁 Transporter'
    case 'admin':
      return '🛡️ Administrator'
    default:
      return '🏭 Factory Owner'
  }
}
