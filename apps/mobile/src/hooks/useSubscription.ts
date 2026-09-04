import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage, subscriptionsApi } from '../services/api'
import type { SubscriptionEntitlement } from '../services/types'

interface UseSubscriptionResult {
  entitlement: SubscriptionEntitlement | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<SubscriptionEntitlement | null>
}

/**
 * Loads the caller's entitlement from GET /subscriptions/status.
 *
 * The server is the single source of truth: the first call auto-grants the
 * 90-day trial, so the UI never needs to assume access it has not been told
 * about. Failures leave `entitlement` untouched and expose `error`.
 */
interface UseSubscriptionOptions {
  /**
   * Fetch on mount. Screens that already refresh on focus (useFocusEffect)
   * should pass `false` to avoid a duplicate request; `loading` stays true
   * until the first refresh resolves either way.
   */
  autoLoad?: boolean
}

export function useSubscription(options: UseSubscriptionOptions = {}): UseSubscriptionResult {
  const { autoLoad = true } = options
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(
    async (options?: { silent?: boolean }): Promise<SubscriptionEntitlement | null> => {
      if (!options?.silent) setRefreshing(true)
      try {
        const response = await subscriptionsApi.getStatus()
        if (mounted.current) {
          setEntitlement(response.data)
          setError(null)
        }
        return response.data
      } catch (err) {
        if (mounted.current) {
          setError(getApiErrorMessage(err, 'Could not load your subscription status.'))
        }
        return null
      } finally {
        if (mounted.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    if (autoLoad) refresh({ silent: true })
  }, [autoLoad, refresh])

  return { entitlement, loading, refreshing, error, refresh }
}
