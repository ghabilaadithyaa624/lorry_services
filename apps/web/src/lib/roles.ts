export type AppUserRole = 'load_owner' | 'truck_owner' | 'driver' | 'admin'
export type PublicRegistrationRole = Exclude<AppUserRole, 'admin'>

export interface RegistrationRoleOption {
  value: PublicRegistrationRole
  label: string
  eyebrow: string
  description: string
  benefits: string[]
  dashboard: string
}

/**
 * Product-facing names deliberately differ from the stable marketplace values:
 * factory owners use the established load_owner permissions and transporters
 * use truck_owner permissions. This keeps existing accounts compatible.
 */
export const REGISTRATION_ROLES: RegistrationRoleOption[] = [
  {
    value: 'driver',
    label: 'Driver',
    eyebrow: 'ON THE ROAD',
    description: 'Find verified loads, manage trips, and stay ahead of every route.',
    benefits: ['Find relevant freight', 'Trip updates in one place'],
    dashboard: '/dashboard/driver',
  },
  {
    value: 'load_owner',
    label: 'Factory Owner',
    eyebrow: 'SHIP GOODS',
    description: 'Post freight requirements and connect with verified transport partners.',
    benefits: ['Post loads in minutes', 'Compare nearby transporters'],
    dashboard: '/dashboard/load-owner',
  },
  {
    value: 'truck_owner',
    label: 'Transporter',
    eyebrow: 'GROW YOUR FLEET',
    description: 'List vehicles, reduce empty runs, and keep your fleet earning.',
    benefits: ['Find return loads', 'Manage vehicles and bookings'],
    dashboard: '/dashboard/truck-owner',
  },
]

export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'driver':
      return 'Driver'
    case 'load_owner':
      return 'Factory owner'
    case 'truck_owner':
      return 'Transporter'
    case 'admin':
      return 'Administrator'
    default:
      return 'Operator'
  }
}

export function getDashboardForRole(role?: string | null): string {
  return REGISTRATION_ROLES.find((option) => option.value === role)?.dashboard || '/dashboard/load-owner'
}

export function isVehicleSideRole(role?: string | null): boolean {
  return role === 'driver' || role === 'truck_owner'
}
