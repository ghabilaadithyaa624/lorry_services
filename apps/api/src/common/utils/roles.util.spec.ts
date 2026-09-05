import { UserRole } from '@prisma/client'
import {
  CANONICAL_ROLES,
  LEGACY_ROLE_MAP,
  PUBLIC_REGISTRATION_ROLES,
  LOAD_MANAGER_ROLES,
  TRUCK_MANAGER_ROLES,
  canManageLoads,
  canManageTrucks,
  isFreightSideRole,
  isTransporterRole,
  isVehicleSideRole,
  normalizeRole,
} from './roles.util'

describe('roles.util', () => {
  describe('normalizeRole', () => {
    it('maps legacy roles onto their canonical replacement', () => {
      expect(normalizeRole('load_owner')).toBe(UserRole.factory_owner)
      expect(normalizeRole('truck_owner')).toBe(UserRole.truck_driver)
      expect(normalizeRole('driver')).toBe(UserRole.truck_driver)
    })

    it('passes canonical roles through unchanged', () => {
      expect(normalizeRole('factory_owner')).toBe(UserRole.factory_owner)
      expect(normalizeRole('truck_driver')).toBe(UserRole.truck_driver)
      expect(normalizeRole('admin')).toBe(UserRole.admin)
    })

    it('returns undefined for empty or unknown input', () => {
      expect(normalizeRole(undefined)).toBeUndefined()
      expect(normalizeRole(null)).toBeUndefined()
      expect(normalizeRole('')).toBeUndefined()
      expect(normalizeRole('broker')).toBeUndefined()
    })

    it('is idempotent', () => {
      for (const role of [...Object.keys(LEGACY_ROLE_MAP), ...CANONICAL_ROLES]) {
        const once = normalizeRole(role)
        expect(normalizeRole(once)).toBe(once)
      }
    })
  })

  it('exposes exactly the canonical roles from the Prisma enum', () => {
    expect(CANONICAL_ROLES.sort()).toEqual(Object.values(UserRole).sort())
    expect(CANONICAL_ROLES).toHaveLength(4)
    expect(CANONICAL_ROLES).toContain(UserRole.transporter)
  })

  it('never allows admin as a public registration role but includes transporter', () => {
    expect(PUBLIC_REGISTRATION_ROLES).not.toContain(UserRole.admin)
    expect(PUBLIC_REGISTRATION_ROLES).toEqual([
      UserRole.factory_owner,
      UserRole.truck_driver,
      UserRole.transporter,
    ])
  })

  describe('side helpers', () => {
    it('treats every legacy vehicle-side label as a truck driver', () => {
      expect(isVehicleSideRole('truck_owner')).toBe(true)
      expect(isVehicleSideRole('driver')).toBe(true)
      expect(isVehicleSideRole('truck_driver')).toBe(true)
      expect(isVehicleSideRole('load_owner')).toBe(false)
    })

    it('treats every legacy freight-side label as a factory owner', () => {
      expect(isFreightSideRole('load_owner')).toBe(true)
      expect(isFreightSideRole('factory_owner')).toBe(true)
      expect(isFreightSideRole('truck_driver')).toBe(false)
      expect(isFreightSideRole(undefined)).toBe(false)
    })

    it('keeps the single-role side helpers mutually exclusive for transporters', () => {
      // Transporters are neither exclusively vehicle-side nor freight-side; the
      // dedicated helper identifies them, and the mutually-exclusive helpers
      // both return false so legacy callers assuming exclusivity keep working.
      expect(isTransporterRole('transporter')).toBe(true)
      expect(isVehicleSideRole('transporter')).toBe(false)
      expect(isFreightSideRole('transporter')).toBe(false)
      expect(isTransporterRole('truck_driver')).toBe(false)
      expect(isTransporterRole('factory_owner')).toBe(false)
    })
  })

  describe('management-permission helpers', () => {
    it('lets factory owners and transporters manage loads', () => {
      expect(LOAD_MANAGER_ROLES).toEqual([UserRole.factory_owner, UserRole.transporter])
      expect(canManageLoads('factory_owner')).toBe(true)
      expect(canManageLoads('transporter')).toBe(true)
      expect(canManageLoads('admin')).toBe(true)
      expect(canManageLoads('truck_driver')).toBe(false)
      // Legacy labels normalize before the check.
      expect(canManageLoads('load_owner')).toBe(true)
    })

    it('lets truck drivers and transporters manage trucks', () => {
      expect(TRUCK_MANAGER_ROLES).toEqual([UserRole.truck_driver, UserRole.transporter])
      expect(canManageTrucks('truck_driver')).toBe(true)
      expect(canManageTrucks('transporter')).toBe(true)
      expect(canManageTrucks('admin')).toBe(true)
      expect(canManageTrucks('factory_owner')).toBe(false)
      // Legacy labels normalize before the check.
      expect(canManageTrucks('truck_owner')).toBe(true)
    })
  })
})
