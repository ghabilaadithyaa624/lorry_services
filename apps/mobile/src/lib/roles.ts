/**
 * Canonical user roles — mirrors the Prisma `UserRole` enum and
 * docs/database-schema-design.md.
 */
export type AppUserRole = 'factory_owner' | 'truck_driver' | 'admin'
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
  if (role === 'factory_owner' || role === 'truck_driver' || role === 'admin') return role
  return LEGACY_ROLE_MAP[role as LegacyUserRole]
}

export function isVehicleSideRole(role?: string | null): boolean {
  return normalizeRole(role) === 'truck_driver'
}

export function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case 'truck_driver':
      return '🚛 Truck Driver'
    case 'admin':
      return '🛡️ Administrator'
    default:
      return '🏭 Factory Owner'
  }
}
