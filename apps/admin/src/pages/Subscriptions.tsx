import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatPhone, cn } from '../lib/utils'

interface SubscriptionItem {
  id: string
  userId: string
  plan: string
  status: 'active' | 'expired' | 'cancelled'
  startedAt: string
  expiresAt: string
  paymentId: string | null
  createdAt: string
  user: { name: string | null; phone: string; role: string }
}

function formatPlanName(plan: string): string {
  return plan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/admin/subscriptions?page=${page}&limit=20`)
      setSubscriptions(res.data.subscriptions)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch subscription records'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const activeCount = subscriptions.filter((s) => s.status === 'active').length
  const expiredCount = subscriptions.filter((s) => s.status === 'expired' || new Date(s.expiresAt) < new Date()).length

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-surface-800 rounded w-48"></div>
          <div className="h-9 bg-surface-800 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-800 rounded-xl"></div>
          ))}
        </div>
        <div className="card p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-700/40 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-12 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load Subscriptions</h2>
        <p className="text-surface-400 text-sm max-w-md mb-6">{error}</p>
        <button onClick={fetchSubscriptions} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Subscription Accounts</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {total} total subscription record{total !== 1 ? 's' : ''} across all users
          </p>
        </div>
        <button
          onClick={fetchSubscriptions}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-l-surface-500">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Total Subscriptions</p>
          <p className="text-2xl font-black text-white">{total}</p>
        </div>

        <div className="card p-4 border-l-4 border-l-success-500">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Active (Current View)</p>
          <p className="text-2xl font-black text-success-400">{activeCount}</p>
        </div>

        <div className="card p-4 border-l-4 border-l-danger-500">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Expired / Inactive</p>
          <p className="text-2xl font-black text-danger-400">{expiredCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="py-12 text-center text-surface-400 text-sm flex flex-col items-center">
            <CreditCard className="w-12 h-12 text-surface-600 mb-3" />
            No subscription records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/80 border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left px-6 py-3.5">User</th>
                  <th className="text-left px-6 py-3.5">Plan</th>
                  <th className="text-left px-6 py-3.5">Status</th>
                  <th className="text-left px-6 py-3.5">Started</th>
                  <th className="text-left px-6 py-3.5">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {subscriptions.map((s) => {
                  const isExpired = new Date(s.expiresAt) < new Date()
                  return (
                    <tr key={s.id} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-surface-300">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{s.user.name || '—'}</p>
                            <p className="text-xs text-surface-400 font-mono">{formatPhone(s.user.phone)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-medium text-surface-200">
                        {formatPlanName(s.plan)}
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={cn(
                            'badge font-semibold',
                            s.status === 'active' && !isExpired
                              ? 'bg-success-500/15 text-success-400 border border-success-500/30'
                              : 'bg-surface-700 text-surface-400'
                          )}
                        >
                          {s.status === 'active' && !isExpired ? 'Active' : 'Expired'}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-xs text-surface-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-xs">
                        <span className={isExpired ? 'text-danger-400 font-semibold' : 'text-surface-300'}>
                          {new Date(s.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {isExpired && <span className="ml-1.5 text-[10px] text-danger-500 font-bold">(Lapsed)</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {subscriptions.length > 0 && pages > 1 && (
          <div className="px-6 py-3 border-t border-surface-700/60 flex items-center justify-between">
            <p className="text-xs text-surface-400">
              Page {page} of {pages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Subscriptions
