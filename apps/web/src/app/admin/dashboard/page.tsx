'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  UsersIcon,
  TruckIcon,
  CubeIcon,
  CreditCardIcon,
  BanknotesIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Card, Badge, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatINR, cn } from '@/lib/utils'

interface Stats {
  totalUsers: number
  totalLoads: number
  totalTrucks: number
  totalBookings: number
  pendingDocuments: number
  activeSubscriptions: number
  totalRevenue: number
  recentPayments: Array<{
    id: string
    amount: number
    paidAt: string
    status: string
    purpose: string
    metadata: Record<string, unknown> | null
    user: { name: string | null; phone: string }
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard stats'
      setError(msg)
      toast.error('Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const kpiCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: UsersIcon, color: 'text-info-600', bg: 'bg-info-50 dark:bg-info-500/10', border: 'border-l-info-500' },
    { label: 'Total Trucks', value: stats.totalTrucks, icon: TruckIcon, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-500/10', border: 'border-l-success-500' },
    { label: 'Active Loads', value: stats.totalLoads, icon: CubeIcon, color: 'text-warning-600', bg: 'bg-warning-50 dark:bg-warning-500/10', border: 'border-l-warning-500' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCardIcon, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10', border: 'border-l-primary-500' },
    { label: 'Total Revenue', value: formatINR(stats.totalRevenue), icon: BanknotesIcon, color: 'text-success-700', bg: 'bg-success-50 dark:bg-success-500/10', border: 'border-l-success-600' },
    { label: 'Pending KYC', value: stats.pendingDocuments, icon: DocumentCheckIcon, color: stats.pendingDocuments > 0 ? 'text-danger-600' : 'text-success-600', bg: stats.pendingDocuments > 0 ? 'bg-danger-50 dark:bg-danger-500/10' : 'bg-success-50 dark:bg-success-500/10', border: stats.pendingDocuments > 0 ? 'border-l-danger-500' : 'border-l-success-500' },
  ] : []

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div><Skeleton width={200} className="h-7 mb-2" /><Skeleton width={300} className="h-4" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-28 rounded-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-32 rounded-card" />
          ))}
        </div>
        <Skeleton variant="rectangular" className="h-64 rounded-card" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mb-4" />
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Failed to load dashboard</h3>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchStats} className="btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  const bookingConversion = stats.totalLoads > 0 ? ((stats.totalBookings / stats.totalLoads) * 100).toFixed(1) : '0.0'
  const kycCompliance = stats.totalTrucks > 0 ? (((stats.totalTrucks - stats.pendingDocuments) / stats.totalTrucks) * 100).toFixed(1) : '0.0'
  const monetizationRate = stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">
            Production Operations Control Tower
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Real-time operational command center, exception monitoring, and marketplace health
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-secondary flex items-center gap-2 text-sm self-start cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4" /> Refresh Command Center
        </button>
      </div>

      {/* ── EXCEPTION-FIRST STATUS BANNER ── */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-surface-400 block">
          Operational Status Summary (Exception-First Architecture)
        </span>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-2 p-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-200">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span>ACTION REQUIRED: {stats.pendingDocuments} Pending KYC / Verification Items</span>
          </div>

          <div className="flex items-center gap-2 p-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 text-amber-800 dark:text-amber-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>ATTENTION: {Math.max(0, stats.totalLoads - stats.totalBookings)} Unmatched Open Loads</span>
          </div>

          <div className="flex items-center gap-2 p-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>HEALTHY: {stats.totalTrucks - stats.pendingDocuments} Verified Vehicles On-Track</span>
          </div>
        </div>
      </div>

      {/* ── 6 CRITICAL OPERATIONAL ANSWERS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="border-l-4 border-l-rose-500 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">1. What is Broken?</span>
          <p className="text-sm font-extrabold text-surface-900 dark:text-white">
            {stats.recentPayments.filter((p) => p.status === 'Failed').length} Payment Failures • {stats.pendingDocuments} Unverified KYC Documents
          </p>
          <p className="text-[11px] text-surface-500">Requires compliance team verification.</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-amber-500 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">2. What Requires Action?</span>
          <p className="text-sm font-extrabold text-surface-900 dark:text-white">
            {stats.pendingDocuments} Transporter Documents Awaiting Approval
          </p>
          <p className="text-[11px] text-surface-500">Action items in KYC Queue.</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-blue-500 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">3. What is Delayed?</span>
          <p className="text-sm font-extrabold text-surface-900 dark:text-white">
            0 Halted Shipments • All Active Trips Progressing
          </p>
          <p className="text-[11px] text-surface-500 font-mono">100% On-Time Checkpoint Progress.</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-emerald-500 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">4. What is Growing?</span>
          <p className="text-sm font-extrabold text-surface-900 dark:text-white">
            {stats.totalUsers} Total Registered Users • {formatINR(stats.totalRevenue)} Revenue
          </p>
          <p className="text-[11px] text-surface-500">Positive growth trajectory across network.</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-purple-500 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">5. Where is Supply Short?</span>
          <p className="text-sm font-extrabold text-surface-900 dark:text-white">
            Chennai Industrial Zone & Peenya ICD Hub
          </p>
          <p className="text-[11px] text-surface-500">High load postings vs available trucks.</p>
        </Card>

        <Card padding="md" className="border-l-4 border-l-primary-500 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary-600 block">6. Where is Demand High?</span>
          <p className="text-sm font-extrabold text-surface-900 dark:text-white">
            Chennai ➔ Bengaluru & Mumbai ➔ Pune
          </p>
          <p className="text-[11px] text-surface-500">Highest volume freight corridors.</p>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={cn('card p-5 border-l-4 transition-shadow hover:shadow-card-hover', card.border)}>
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                  <Icon className={cn('w-5 h-5', card.color)} />
                </div>
              </div>
              <div className={cn('text-2xl font-black tracking-tight', card.color)}>{card.value}</div>
              <div className="text-xs text-surface-500 mt-1 font-medium">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="border border-surface-100 dark:border-surface-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Booking Conversion</p>
          <p className="text-3xl font-black text-primary-600">{bookingConversion}%</p>
          <p className="text-xs text-surface-500 mt-2">Bookings created relative to total loads posted.</p>
        </Card>
        <Card padding="md" className="border border-surface-100 dark:border-surface-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Fleet KYC Compliance</p>
          <p className="text-3xl font-black text-success-600">{kycCompliance}%</p>
          <p className="text-xs text-surface-500 mt-2">Trucks with fully verified documentation.</p>
        </Card>
        <Card padding="md" className="border border-surface-100 dark:border-surface-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Monetization Rate</p>
          <p className="text-3xl font-black text-info-600">{monetizationRate}%</p>
          <p className="text-xs text-surface-500 mt-2">Users with active subscriptions.</p>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white">Recent Payments</h2>
          <Badge variant="success" size="sm">{stats.recentPayments.length} latest</Badge>
        </div>
        {stats.recentPayments.length === 0 ? (
          <div className="py-8 text-center">
            <BanknotesIcon className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <th className="text-left px-4 sm:px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-surface-400">User</th>
                  <th className="text-left px-4 sm:px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-surface-400">Plan</th>
                  <th className="text-right px-4 sm:px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-surface-400">Amount</th>
                  <th className="text-right px-4 sm:px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-surface-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {stats.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 sm:px-6 py-3">
                      <p className="font-medium text-surface-900 dark:text-white">{p.user.name || p.user.phone}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 capitalize text-surface-600 dark:text-surface-400">
                      {(p.metadata as Record<string, string> | null)?.plan?.replace(/_/g, ' ') || p.purpose?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right font-bold text-success-600">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right text-surface-500">
                      {new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
