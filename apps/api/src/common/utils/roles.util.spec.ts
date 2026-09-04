import { UserRole } from '@prisma/client'
import {
  CANONICAL_ROLES,
  LEGACY_ROLE_MAP,
  PUBLIC_REGISTRATION_ROLES,
  isFreightSideRole,
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

  it('exposes exactly the three canonical roles from the Prisma enum', () => {
    expect(CANONICAL_ROLES.sort()).toEqual(Object.values(UserRole).sort())
    expect(CANONICAL_ROLES).toHaveLength(3)
  })

  it('never allows admin as a public registration role', () => {
    expect(PUBLIC_REGISTRATION_ROLES).not.toContain(UserRole.admin)
    expect(PUBLIC_REGISTRATION_ROLES).toEqual([UserRole.factory_owner, UserRole.truck_driver])
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
  })
})
