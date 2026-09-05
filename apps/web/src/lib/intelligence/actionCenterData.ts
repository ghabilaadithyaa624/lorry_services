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
  if (role === 'truck_driver') {
    sources.push(['trucks', '/trucks/my-trucks'], ['documents', '/users/documents'])
  } else if (role === 'factory_owner') {
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
