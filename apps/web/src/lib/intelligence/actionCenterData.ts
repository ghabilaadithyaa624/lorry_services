import { api } from '@/lib/api'
import type { AppUserRole } from '@/lib/roles'
import type { DashboardActionCenterSnapshot } from './actionCenterEngine'

type SourceKey = 'entitlement' | 'notifications' | 'bookings' | 'documents' | 'trucks' | 'loads' | 'adminStats'

/**
 * Shared by the overview and the dashboard-shell menu. Requests are scoped by
 * role and settled independently; a failed source is unknown, never an empty
 * fleet, a missing document set or an expired pass. No sample-data fallback.
 */
export async function fetchOperationalSnapshot(
  role: AppUserRole,
  signal?: AbortSignal
): Promise<DashboardActionCenterSnapshot> {
  const sources: Array<[SourceKey, string]> = role === 'admin'
    ? [['adminStats', '/admin/stats']]
    : [
        ['entitlement', '/subscriptions/status'],
        ['notifications', '/notifications'],
        ['bookings', '/bookings/my-bookings'],
      ]
  // Transporters run both sides of the marketplace, so they need the union of
  // the freight-side and fleet-side sources. Mirrors the API RBAC (Prompt 3).
  if (role === 'truck_driver' || role === 'transporter') {
    sources.push(['trucks', '/trucks/my-trucks'], ['documents', '/users/documents'])
  }
  if (role === 'factory_owner' || role === 'transporter') {
    sources.push(['loads', '/loads/my-loads'])
  }

  const responses = await Promise.allSettled(
    sources.map(([, url]) => api.get<unknown>(url, { signal }))
  )
  const snapshot: DashboardActionCenterSnapshot = { role }
  sources.forEach(([key], index) => {
    const response = responses[index]
    snapshot[key] = response.status === 'fulfilled' ? response.value.data : undefined
  })
  return snapshot
}
