'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, api, notificationsApi, subscriptionsApi, usersApi } from '@/lib/api'
import { normalizeRole, type AppUserRole } from '@/lib/roles'
import {
  deriveDashboardActionTasks,
  summarizeOperationalTasks,
  type OperationalTask,
} from '@/lib/intelligence/actionCenterEngine'

interface UseOperationalTasksOptions {
  /** Skip all network calls (e.g. on public pages). */
  enabled?: boolean
  /** Role override — otherwise resolved from the persisted session. */
  role?: string | null
  /** Poll interval in ms. `0` disables polling. */
  refreshIntervalMs?: number
}

interface UseOperationalTasksResult {
  tasks: OperationalTask[]
  summary: ReturnType<typeof summarizeOperationalTasks>
  loading: boolean
  /** `true` once at least one fetch cycle has settled. */
  loaded: boolean
  refresh: () => Promise<void>
}

function settled<T>(result: PromiseSettledResult<{ data: T }>): T | undefined {
  return result.status === 'fulfilled' ? result.value?.data : undefined
}

function asList(value: unknown): Array<Record<string, any>> | undefined {
  if (Array.isArray(value)) return value as Array<Record<string, any>>
  return undefined
}

/**
 * Operational Action Center data hook.
 *
 * Fetches only endpoints the signed-in role is allowed to call, and feeds the
 * real responses into the shared derivation engine. Any endpoint that fails is
 * omitted from the input (rather than replaced with placeholder data), so the
 * action center never shows fabricated work.
 */
export function useOperationalTasks(
  options: UseOperationalTasksOptions = {}
): UseOperationalTasksResult {
  const { enabled = true, role: roleOverride, refreshIntervalMs = 120_000 } = options

  const [role, setRole] = useState<AppUserRole | undefined>(() => normalizeRole(roleOverride))
  const [tasks, setTasks] = useState<OperationalTask[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fromOverride = normalizeRole(roleOverride)
    if (fromOverride) {
      setRole(fromOverride)
      return
    }
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (stored) setRole(normalizeRole(JSON.parse(stored)?.role))
    } catch {
      // Malformed session data — the API stays the source of truth.
    }
  }, [roleOverride])

  const refresh = useCallback(async () => {
    if (!enabled || !role) return
    setLoading(true)

    try {
      if (role === 'admin') {
        const [statsRes] = await Promise.allSettled([adminApi.getStats()])
        setTasks(
          deriveDashboardActionTasks({
            role,
            adminStats: (settled(statsRes as PromiseSettledResult<{ data: any }>) as any) || undefined,
          })
        )
        return
      }

      const isTruckDriver = role === 'truck_driver'

      const [entitlementRes, notificationsRes, bookingsRes, documentsRes, primaryRes] =
        await Promise.allSettled([
          subscriptionsApi.getStatus(),
          notificationsApi.getNotifications(),
          api.get('/bookings/my-bookings'),
          // Fleet documents only exist on the vehicle side.
          isTruckDriver ? usersApi.getDocuments() : Promise.resolve({ data: undefined }),
          isTruckDriver ? api.get('/trucks/my-trucks') : api.get('/loads/my-loads'),
        ])

      const notificationsPayload = settled(
        notificationsRes as PromiseSettledResult<{ data: any }>
      ) as any

      setTasks(
        deriveDashboardActionTasks({
          role,
          entitlement: (settled(entitlementRes as PromiseSettledResult<{ data: any }>) as any) || undefined,
          notifications:
            asList(notificationsPayload?.notifications) || asList(notificationsPayload),
          bookings: asList(settled(bookingsRes as PromiseSettledResult<{ data: any }>)),
          documents: isTruckDriver
            ? asList(settled(documentsRes as PromiseSettledResult<{ data: any }>))
            : undefined,
          trucks: isTruckDriver
            ? asList(settled(primaryRes as PromiseSettledResult<{ data: any }>))
            : undefined,
          loads: isTruckDriver
            ? undefined
            : asList(settled(primaryRes as PromiseSettledResult<{ data: any }>)),
        })
      )
    } catch {
      // Supplementary intelligence only — never break the shell.
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [enabled, role])

  useEffect(() => {
    if (!enabled || !role) return
    void refresh()

    if (!refreshIntervalMs) return
    const interval = setInterval(() => void refresh(), refreshIntervalMs)
    return () => clearInterval(interval)
  }, [enabled, role, refresh, refreshIntervalMs])

  const summary = useMemo(() => summarizeOperationalTasks(tasks), [tasks])

  return { tasks, summary, loading, loaded, refresh }
}
