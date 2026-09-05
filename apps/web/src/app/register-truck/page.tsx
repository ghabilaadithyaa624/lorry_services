import { redirect } from 'next/navigation'

/**
 * Register Truck — the fleet-side counterpart of `/post-load`.
 *
 * Truck registration lives inside the fleet workspace (`/my-trucks`), which
 * owns the registration form/modal. This route exists so navigation (sidebar,
 * middleware fleet RBAC, robots) can link a stable, meaningful URL instead of
 * a deep link with query state.
 */
export default function RegisterTruckPage() {
  redirect('/my-trucks?register=1')
}
