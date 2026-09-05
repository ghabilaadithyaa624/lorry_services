import { UserRole } from '@prisma/client'

/**
 * Canonical roles are `factory_owner`, `truck_driver` and `admin`
 * (see docs/database-schema-design.md).
 *
 * Older clients (deployed web/mobile bundles, cached cookies, long-lived JWTs)
 * may still send the legacy labels below. They are accepted at the edge and
 * normalized onto the canonical role so that no signed-in user is locked out
 * while old tokens are still in circulation.
 */
export const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  load_owner: UserRole.factory_owner,
  truck_owner: UserRole.truck_driver,
  driver: UserRole.truck_driver,
}

export const CANONICAL_ROLES: UserRole[] = [
  UserRole.factory_owner,
  UserRole.truck_driver,
  UserRole.transporter,
  UserRole.admin,
]

/** Roles a member of the public may self-select at registration. */
export const PUBLIC_REGISTRATION_ROLES: UserRole[] = [
  UserRole.factory_owner,
  UserRole.truck_driver,
  UserRole.transporter,
]

/**
 * Roles allowed to create/list/manage their own freight loads.
 * Factory owners post loads; transporters operate on both sides.
 */
export const LOAD_MANAGER_ROLES: UserRole[] = [
  UserRole.factory_owner,
  UserRole.transporter,
]

/**
 * Roles allowed to create/list/manage their own trucks.
 * Truck drivers list vehicles; transporters operate on both sides.
 */
export const TRUCK_MANAGER_ROLES: UserRole[] = [
  UserRole.truck_driver,
  UserRole.transporter,
]

/**
 * Map any legacy or canonical role label onto a canonical `UserRole`.
 * Returns `undefined` for unknown/empty input so callers pick the fallback.
 */
export function normalizeRole(role?: string | null): UserRole | undefined {
  if (!role) return undefined
  if ((CANONICAL_ROLES as string[]).includes(role)) return role as UserRole
  return LEGACY_ROLE_MAP[role]
}

/** Transporters operate on BOTH sides of the marketplace. */
export function isTransporterRole(role?: string | null): boolean {
  return normalizeRole(role) === UserRole.transporter
}

/**
 * Vehicle side of the marketplace (truck drivers). Kept single-role so callers
 * that assume mutual exclusivity with the freight side keep working. Use
 * `canManageTrucks` to include transporters for vehicle-listing permissions.
 */
export function isVehicleSideRole(role?: string | null): boolean {
  return normalizeRole(role) === UserRole.truck_driver
}

/**
 * Freight side of the marketplace (factory owners). Kept single-role so callers
 * that assume mutual exclusivity with the vehicle side keep working. Use
 * `canManageLoads` to include transporters for load-posting permissions.
 */
export function isFreightSideRole(role?: string | null): boolean {
  return normalizeRole(role) === UserRole.factory_owner
}

/** Whether a role may create/list/manage freight loads. */
export function canManageLoads(role?: string | null): boolean {
  const r = normalizeRole(role)
  return r === UserRole.factory_owner || r === UserRole.transporter || r === UserRole.admin
}

/** Whether a role may create/list/manage trucks. */
export function canManageTrucks(role?: string | null): boolean {
  const r = normalizeRole(role)
  return r === UserRole.truck_driver || r === UserRole.transporter || r === UserRole.admin
}
