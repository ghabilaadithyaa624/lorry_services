import {
  DEFAULT_DASHBOARD,
  LEGACY_DASHBOARD_REDIRECTS,
  REGISTRATION_ROLES,
  getDashboardForRole,
  getRoleLabel,
  isFreightSideRole,
  isVehicleSideRole,
  normalizeRole,
} from './roles'

describe('web role helpers', () => {
  describe('normalizeRole', () => {
    it('maps legacy roles to canonical roles', () => {
      expect(normalizeRole('load_owner')).toBe('factory_owner')
      expect(normalizeRole('truck_owner')).toBe('truck_driver')
      expect(normalizeRole('driver')).toBe('truck_driver')
    })

    it('passes canonical roles through', () => {
      expect(normalizeRole('factory_owner')).toBe('factory_owner')
      expect(normalizeRole('truck_driver')).toBe('truck_driver')
      expect(normalizeRole('admin')).toBe('admin')
    })

    it('returns undefined for unknown roles', () => {
      expect(normalizeRole('broker')).toBeUndefined()
      expect(normalizeRole(null)).toBeUndefined()
    })
  })

  describe('getDashboardForRole', () => {
    it('routes canonical roles to canonical dashboards', () => {
      expect(getDashboardForRole('factory_owner')).toBe('/dashboard/factory-owner')
      expect(getDashboardForRole('truck_driver')).toBe('/dashboard/truck-driver')
      expect(getDashboardForRole('admin')).toBe('/admin')
    })

    it('routes legacy roles to the canonical dashboard, never the legacy route', () => {
      expect(getDashboardForRole('load_owner')).toBe('/dashboard/factory-owner')
      expect(getDashboardForRole('truck_owner')).toBe('/dashboard/truck-driver')
      expect(getDashboardForRole('driver')).toBe('/dashboard/truck-driver')
    })

    it('falls back to the factory-owner dashboard for unknown roles', () => {
      expect(getDashboardForRole(undefined)).toBe(DEFAULT_DASHBOARD)
      expect(getDashboardForRole('broker')).toBe(DEFAULT_DASHBOARD)
    })
  })

  it('maps every legacy dashboard route to a canonical route', () => {
    expect(LEGACY_DASHBOARD_REDIRECTS).toEqual({
      '/dashboard/load-owner': '/dashboard/factory-owner',
      '/dashboard/truck-owner': '/dashboard/truck-driver',
      '/dashboard/driver': '/dashboard/truck-driver',
    })
    for (const target of Object.values(LEGACY_DASHBOARD_REDIRECTS)) {
      expect(Object.keys(LEGACY_DASHBOARD_REDIRECTS)).not.toContain(target)
    }
  })

  it('offers exactly the two public registration roles', () => {
    expect(REGISTRATION_ROLES.map((r) => r.value)).toEqual(['factory_owner', 'truck_driver'])
    expect(REGISTRATION_ROLES.map((r) => r.dashboard)).toEqual([
      '/dashboard/factory-owner',
      '/dashboard/truck-driver',
    ])
  })

  it('labels legacy and canonical roles identically', () => {
    expect(getRoleLabel('load_owner')).toBe(getRoleLabel('factory_owner'))
    expect(getRoleLabel('truck_owner')).toBe(getRoleLabel('truck_driver'))
    expect(getRoleLabel('driver')).toBe('Truck driver')
    expect(getRoleLabel('nope')).toBe('Operator')
  })

  it('classifies marketplace sides from legacy labels too', () => {
    expect(isVehicleSideRole('truck_owner')).toBe(true)
    expect(isVehicleSideRole('driver')).toBe(true)
    expect(isFreightSideRole('load_owner')).toBe(true)
    expect(isFreightSideRole('driver')).toBe(false)
  })
})
