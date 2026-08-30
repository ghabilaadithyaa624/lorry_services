'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  CreditCardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Button, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone, formatINR, cn } from '@/lib/utils'

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
  active: { variant: 'success', label: 'Active Pass' },
  expired: { variant: 'default', label: 'Expired' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

function formatPlan(plan: string): string {
  return plan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getPlanPrice(plan: string): number {
  const p = plan.toLowerCase()
  if (p.includes('quarterly')) return 2499
  if (p.includes('annual') || p.includes('yearly')) return 7999
  return 999
}

export default function RevenueSubscriptionsPage() {
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
      const res = await adminApi.listSubscriptions(page, 20)
      setSubscriptions(res.data.subscriptions || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load subscriptions'
      setError(msg)
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchSubs()
  }, [fetchSubs])

  const activeCount = subscriptions.filter((s) => s.status === 'active').length
  const expiredCount = subscriptions.filter((s) => s.status === 'expired').length

  // Calculate estimated page revenue based on actual plans
  const pageRevenue = subscriptions.reduce((sum, s) => sum + getPlanPrice(s.plan), 0)

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 font-mono">
        <Spinner size="lg" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
          Loading revenue & subscription operations...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Failed to Load Revenue Subscriptions</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchSubs}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-mono text-xs font-bold shadow-glow-primary hover:bg-primary-500 transition-colors inline-flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" /> Retry Fetch
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel p-6 rounded-[20px] border border-white/10 shadow-modal relative overflow-hidden">
        {/* Ambient Background Glow & Grid */}

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Revenue & Subscription Operations
            </h1>
          </div>
          <p className="text-xs font-mono text-surface-400 mt-1">
            Cashfree direct contact access pass records, subscriber accounts, and plan monetization metrics.
          </p>
        </div>

        <button
          onClick={fetchSubs}
          className="px-4 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4 text-primary-400" />
          <span>Refresh Subscriptions ({total})</span>
        </button>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Total Passes</span>
          <span className="text-2xl sm:text-3xl font-black text-white block">{total}</span>
          <span className="text-[11px] text-surface-400 block">All-time passes issued</span>
        </div>

        <div className="p-5 rounded-[20px] bg-emerald-950/40 border border-emerald-500/30 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Active Passes</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-300 block">{activeCount}</span>
          <span className="text-[11px] text-emerald-300/80 block">Active subscribers on page</span>
        </div>

        <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Expired Passes</span>
          <span className="text-2xl sm:text-3xl font-black text-surface-300 block">{expiredCount}</span>
          <span className="text-[11px] text-surface-400 block">Renewal candidate passes</span>
        </div>

        <div className="p-5 rounded-[20px] bg-purple-950/40 border border-purple-500/30 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block">PLAN-LIST-PRICE ESTIMATE</span>
          <span className="text-2xl sm:text-3xl font-black text-purple-300 block truncate">{formatINR(pageRevenue)}</span>
          <span className="text-[11px] text-purple-300/80 block">Indicative list price value on page</span>
        </div>
      </div>

      {/* Subscriptions Table Card */}
      <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden font-mono">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Subscription Pass Records (Page {page} of {pages})
          </span>
          <span className="text-[11px] text-surface-400">Cashfree Sandbox Gateway</span>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-surface-400 space-y-2">
            <CreditCardIcon className="w-12 h-12 text-surface-500 mx-auto" />
            <p className="font-bold text-white">No active subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[10px]">
                  <th className="text-left py-3 px-4 font-bold">User</th>
                  <th className="text-left py-3 px-4 font-bold">Plan</th>
                  <th className="text-left py-3 px-4 font-bold">Status</th>
                  <th className="text-left py-3 px-4 font-bold">Started</th>
                  <th className="text-left py-3 px-4 font-bold">Expires</th>
                  <th className="text-right py-3 px-4 font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map((s) => {
                  const statusBadge = STATUS_BADGE[s.status] || { variant: 'default' as const, label: s.status }
                  const isExpired = new Date(s.expiresAt) < new Date()
                  const planPrice = getPlanPrice(s.plan)

                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{s.user.name || 'User'}</p>
                        <p className="text-[11px] text-surface-400">{formatPhone(s.user.phone)}</p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-purple-300">
                        {formatPlan(s.plan)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={statusBadge.variant} size="sm" className="font-mono text-[10px]">
                          {statusBadge.label}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-surface-300">
                        {new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      <td className={cn('py-3.5 px-4 font-bold', isExpired ? 'text-danger-400' : 'text-emerald-400')}>
                        {new Date(s.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isExpired && <span className="ml-1 text-[10px] text-danger-500 font-mono">(expired)</span>}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                        {formatINR(planPrice)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="p-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="text-surface-400">Page {page} of {pages} · {total} Total Subscriptions</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
                className="font-bold border-white/10"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="font-bold border-white/10"
              >
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
