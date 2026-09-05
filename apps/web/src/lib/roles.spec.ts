import {
  DEFAULT_DASHBOARD,
  LEGACY_DASHBOARD_REDIRECTS,
  REGISTRATION_ROLES,
  getDashboardForRole,
  getRoleLabel,
  isAdminRole,
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

  it('offers exactly the public registration roles', () => {
    expect(REGISTRATION_ROLES.map((r) => r.value)).toEqual([
      'factory_owner',
      'truck_driver',
      'transporter',
    ])
    expect(REGISTRATION_ROLES.map((r) => r.dashboard)).toEqual([
      '/dashboard/factory-owner',
      '/dashboard/truck-driver',
      '/dashboard',
    ])
    // Admin is never a public self-service registration option.
    expect(REGISTRATION_ROLES.map((r) => r.value)).not.toContain('admin')
  })

  it('labels legacy and canonical roles identically', () => {
    expect(getRoleLabel('load_owner')).toBe(getRoleLabel('factory_owner'))
    expect(getRoleLabel('truck_owner')).toBe(getRoleLabel('truck_driver'))
    expect(getRoleLabel('driver')).toBe('Truck driver')
    expect(getRoleLabel('transporter')).toBe('Transporter')
    expect(getRoleLabel('nope')).toBe('Operator')
  })

  it('routes transporters to the unified dashboard', () => {
    expect(getDashboardForRole('transporter')).toBe('/dashboard')
  })

  it('classifies marketplace sides from legacy labels too', () => {
    expect(isVehicleSideRole('truck_owner')).toBe(true)
    expect(isVehicleSideRole('driver')).toBe(true)
    expect(isFreightSideRole('load_owner')).toBe(true)
    expect(isFreightSideRole('driver')).toBe(false)
  })

  describe('isAdminRole', () => {
    it('identifies platform operators', () => {
      expect(isAdminRole('admin')).toBe(true)
    })

    it('never promotes a marketplace or legacy role to admin', () => {
      for (const role of ['factory_owner', 'truck_driver', 'load_owner', 'truck_owner', 'driver']) {
        expect(isAdminRole(role)).toBe(false)
      }
      expect(isAdminRole(undefined)).toBe(false)
      expect(isAdminRole('administrator')).toBe(false)
    })
  })

  /**
   * Regression guard for the cleanup: a session cached before the role rename
   * still holds a legacy label. Every side-classifier must agree with the
   * canonical role so such a user keeps the exact same permissions.
   */
  describe('legacy sessions behave identically to canonical ones', () => {
    const equivalents: Array<[string, string]> = [
      ['load_owner', 'factory_owner'],
      ['truck_owner', 'truck_driver'],
      ['driver', 'truck_driver'],
    ]

    it.each(equivalents)('treats %s exactly like %s', (legacy, canonical) => {
      expect(normalizeRole(legacy)).toBe(canonical)
      expect(getDashboardForRole(legacy)).toBe(getDashboardForRole(canonical))
      expect(getRoleLabel(legacy)).toBe(getRoleLabel(canonical))
      expect(isVehicleSideRole(legacy)).toBe(isVehicleSideRole(canonical))
      expect(isFreightSideRole(legacy)).toBe(isFreightSideRole(canonical))
      expect(isAdminRole(legacy)).toBe(isAdminRole(canonical))
    })

    it('never resolves a legacy label back to a legacy value', () => {
      for (const [legacy] of equivalents) {
        expect(['factory_owner', 'truck_driver', 'admin']).toContain(normalizeRole(legacy))
      }
    })
  })
})
