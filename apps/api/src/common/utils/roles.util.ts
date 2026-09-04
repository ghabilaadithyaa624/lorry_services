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
  UserRole.admin,
]

/** Roles a member of the public may self-select at registration. */
export const PUBLIC_REGISTRATION_ROLES: UserRole[] = [
  UserRole.factory_owner,
  UserRole.truck_driver,
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

/** Vehicle side of the marketplace (truck drivers / transporters). */
export function isVehicleSideRole(role?: string | null): boolean {
  return normalizeRole(role) === UserRole.truck_driver
}

/** Freight side of the marketplace (factory owners / shippers). */
export function isFreightSideRole(role?: string | null): boolean {
  return normalizeRole(role) === UserRole.factory_owner
}
