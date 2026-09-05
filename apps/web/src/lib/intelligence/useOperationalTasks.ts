'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeRole, type AppUserRole } from '@/lib/roles'
import {
  deriveDashboardActionTasks,
  getActionCenterUnavailableSources,
  summarizeOperationalTasks,
  type DashboardActionCenterSnapshot,
  type OperationalTask,
} from './actionCenterEngine'
import { fetchOperationalSnapshot } from './actionCenterData'

interface UseOperationalTasksOptions {
  enabled?: boolean
  /** Otherwise resolved from the persisted session. */
  role?: string | null
  /** `0` disables polling. Focus and manual refresh still work. */
  refreshIntervalMs?: number
}

export interface UseOperationalTasksResult {
  tasks: OperationalTask[]
  summary: ReturnType<typeof summarizeOperationalTasks>
  loading: boolean
  loaded: boolean
  unavailableSources: string[]
  refresh: () => Promise<void>
}

/** Live, role-scoped shell tasks; never retain another role's late response. */
export function useOperationalTasks(options: UseOperationalTasksOptions = {}): UseOperationalTasksResult {
  const { enabled = true, role: roleOverride, refreshIntervalMs = 120_000 } = options
  const [sessionRole, setSessionRole] = useState<AppUserRole>()
  const [snapshot, setSnapshot] = useState<DashboardActionCenterSnapshot>()
  const [fetching, setFetching] = useState(false)
  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const role = roleOverride == null ? sessionRole : normalizeRole(roleOverride)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      setSessionRole(stored ? normalizeRole(JSON.parse(stored)?.role) : undefined)
    } catch {
      setSessionRole(undefined)
    }
  }, [roleOverride])

  const refresh = useCallback(async () => {
    if (!enabled || !role) return
    const id = ++requestId.current
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setFetching(true)
    try {
      const next = await fetchOperationalSnapshot(role, request.signal)
      if (!request.signal.aborted && id === requestId.current) setSnapshot(next)
    } catch {
      if (!request.signal.aborted && id === requestId.current) setSnapshot({ role })
    } finally {
      if (!request.signal.aborted && id === requestId.current) setFetching(false)
    }
  }, [enabled, role])

  useEffect(() => {
    if (!enabled || !role) return
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    const interval = refreshIntervalMs > 0 ? setInterval(onFocus, refreshIntervalMs) : undefined
    return () => {
      ++requestId.current
      controller.current?.abort()
      if (interval !== undefined) clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, role, refresh, refreshIntervalMs])

  const loaded = Boolean(enabled && role && snapshot?.role === role)
  const tasks = useMemo(
    () => loaded && snapshot ? deriveDashboardActionTasks(snapshot) : [],
    [loaded, snapshot]
  )
  const unavailableSources = useMemo(
    () => loaded && snapshot ? getActionCenterUnavailableSources(snapshot) : [],
    [loaded, snapshot]
  )
  const summary = useMemo(() => summarizeOperationalTasks(tasks), [tasks])

  return {
    tasks,
    summary,
    loading: Boolean(enabled && role && (fetching || !loaded)),
    loaded,
    unavailableSources,
    refresh,
  }
}
