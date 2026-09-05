import {
  DEFAULT_DASHBOARD,
  LEGACY_DASHBOARD_REDIRECTS,
  REGISTRATION_ROLES,
  canManageFleet,
  canManageFreight,
  getDashboardForRole,
  getListingsAccess,
  getRoleLabel,
  isAdminRole,
  isFreightSideRole,
  isTransporterRole,
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
      expect(normalizeRole('transporter')).toBe('transporter')
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
      expect(getDashboardForRole('transporter')).toBe('/dashboard/transporter')
      expect(getDashboardForRole('admin')).toBe('/admin/dashboard')
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
      '/dashboard/transporter',
    ])
    // Admin is never a public self-service registration option.
    expect(REGISTRATION_ROLES.map((r) => r.value)).not.toContain('admin')
  })

  it('lists the three selector options with canonical role values', () => {
    expect(REGISTRATION_ROLES.map((r) => r.label)).toEqual([
      'Factory Owner',
      'Truck Driver',
      'Transporter',
    ])
    // The value stored on signup / login must be the canonical role key.
    expect(REGISTRATION_ROLES.map((r) => r.value)).toEqual([
      'factory_owner',
      'truck_driver',
      'transporter',
    ])
  })

  it('explains the transporter role with the agreed copy', () => {
    const transporter = REGISTRATION_ROLES.find((r) => r.value === 'transporter')
    expect(transporter).toBeDefined()
    expect(transporter?.description).toBe(
      'Manage both freight postings and truck listings from one workspace.'
    )
    expect(transporter?.benefits.length).toBeGreaterThan(0)
  })

  it('labels legacy and canonical roles identically', () => {
    expect(getRoleLabel('load_owner')).toBe(getRoleLabel('factory_owner'))
    expect(getRoleLabel('truck_owner')).toBe(getRoleLabel('truck_driver'))
    expect(getRoleLabel('driver')).toBe('Truck driver')
    expect(getRoleLabel('transporter')).toBe('Transporter')
    expect(getRoleLabel('nope')).toBe('Operator')
  })

  it('routes transporters to the unified transporter dashboard', () => {
    expect(getDashboardForRole('transporter')).toBe('/dashboard/transporter')
  })

  it('classifies marketplace sides from legacy labels too', () => {
    expect(isVehicleSideRole('truck_owner')).toBe(true)
    expect(isVehicleSideRole('driver')).toBe(true)
    expect(isFreightSideRole('load_owner')).toBe(true)
    expect(isFreightSideRole('driver')).toBe(false)
  })

  describe('transporter side access', () => {
    it('recognizes the transporter role', () => {
      expect(isTransporterRole('transporter')).toBe(true)
      expect(isTransporterRole('factory_owner')).toBe(false)
      expect(isTransporterRole(undefined)).toBe(false)
    })

    it('lets factory owners and transporters manage freight', () => {
      expect(canManageFreight('factory_owner')).toBe(true)
      expect(canManageFreight('transporter')).toBe(true)
      expect(canManageFreight('admin')).toBe(true)
      expect(canManageFreight('truck_driver')).toBe(false)
      expect(canManageFreight('load_owner')).toBe(true) // legacy alias
    })

    it('lets truck drivers and transporters manage the fleet', () => {
      expect(canManageFleet('truck_driver')).toBe(true)
      expect(canManageFleet('transporter')).toBe(true)
      expect(canManageFleet('admin')).toBe(true)
      expect(canManageFleet('factory_owner')).toBe(false)
      expect(canManageFleet('truck_owner')).toBe(true) // legacy alias
    })

    it('is the union of both marketplace sides', () => {
      expect(canManageFreight('transporter') && canManageFleet('transporter')).toBe(true)
    })
  })

  describe('getListingsAccess (unified /my-listings tabs)', () => {
    it('gives transporters both tabs fully, opening on freight', () => {
      expect(getListingsAccess('transporter')).toEqual({
        canFreight: true,
        canFleet: true,
        defaultTab: 'freight',
      })
    })

    it('gives admins both tabs too (override, mirroring the API)', () => {
      expect(getListingsAccess('admin')).toEqual({
        canFreight: true,
        canFleet: true,
        defaultTab: 'freight',
      })
    })

    it('defaults factory owners to the freight tab without fleet management', () => {
      const access = getListingsAccess('factory_owner')
      expect(access.canFreight).toBe(true)
      expect(access.canFleet).toBe(false)
      expect(access.defaultTab).toBe('freight')
    })

    it('defaults truck drivers to the fleet tab without freight management', () => {
      const access = getListingsAccess('truck_driver')
      expect(access.canFreight).toBe(false)
      expect(access.canFleet).toBe(true)
      expect(access.defaultTab).toBe('trucks')
    })

    it('normalizes legacy session labels to the same tab access', () => {
      expect(getListingsAccess('load_owner')).toEqual(getListingsAccess('factory_owner'))
      expect(getListingsAccess('truck_owner')).toEqual(getListingsAccess('truck_driver'))
      expect(getListingsAccess('driver')).toEqual(getListingsAccess('truck_driver'))
    })

    it('falls back to the freight-led shipper view for unknown roles', () => {
      const access = getListingsAccess(undefined)
      expect(access.canFreight).toBe(false)
      expect(access.canFleet).toBe(false)
      expect(access.defaultTab).toBe('freight')
    })
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
