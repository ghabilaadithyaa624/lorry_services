'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CreditCardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Badge, Button, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone } from '@/lib/utils'

interface Subscription {
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

const STATUS_BADGE: Record<string, { variant: 'success' | 'default' | 'danger'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  expired: { variant: 'default', label: 'Expired' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

function formatPlan(plan: string): string {
  return plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/admin/subscriptions?page=${page}&limit=20`)
      setSubscriptions(res.data.subscriptions)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load subscriptions'
      setError(msg)
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  const activeCount = subscriptions.filter(s => s.status === 'active').length
  const expiredCount = subscriptions.filter(s => s.status === 'expired').length

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mb-4" />
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Failed to load subscriptions</h3>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchSubs} className="btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">Subscriptions</h1>
          <p className="text-sm text-surface-500 mt-0.5">{total} total subscription{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchSubs} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 border-l-4 border-l-surface-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Total</p>
            <p className="text-2xl font-black text-surface-900 dark:text-white">{total}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-success-500">
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Active (this page)</p>
            <p className="text-2xl font-black text-success-600">{activeCount}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-surface-400">
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Expired (this page)</p>
            <p className="text-2xl font-black text-surface-500">{expiredCount}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton width="50%" className="h-4" />
                  <Skeleton width="30%" className="h-3" />
                </div>
                <Skeleton width={70} className="h-5" />
              </div>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCardIcon className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500 font-medium">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-700">
                  {['User', 'Plan', 'Status', 'Started', 'Expires'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {subscriptions.map(s => {
                  const statusBadge = STATUS_BADGE[s.status] || { variant: 'default' as const, label: s.status }
                  const isExpired = new Date(s.expiresAt) < new Date()
                  return (
                    <tr key={s.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-900 dark:text-white">{s.user.name || '—'}</p>
                        <p className="text-xs text-surface-500">{formatPhone(s.user.phone)}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-surface-800 dark:text-surface-200">
                        {formatPlan(s.plan)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadge.variant} size="sm" dot>{statusBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-500 text-xs">
                        {new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`px-4 py-3 text-xs font-medium ${isExpired ? 'text-danger-600' : 'text-surface-500'}`}>
                        {new Date(s.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isExpired && <span className="ml-1 text-danger-500">(expired)</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && subscriptions.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-500">Page {page} of {pages} · {total} total</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
