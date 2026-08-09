import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Truck, 
  Package, 
  CreditCard, 
  IndianRupee, 
  ShieldAlert, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  CheckCircle2
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, cn } from '../lib/utils'

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

export function Dashboard() {
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
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard statistics'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-surface-800 rounded w-48"></div>
          <div className="h-9 bg-surface-800 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-surface-800 rounded-xl"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-12 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load Dashboard</h2>
        <p className="text-surface-400 text-sm max-w-md mb-6">{error}</p>
        <button onClick={fetchStats} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  const bookingConversion = stats.totalLoads > 0 ? ((stats.totalBookings / stats.totalLoads) * 100).toFixed(1) : '0.0'
  const kycCompliance = stats.totalTrucks > 0 ? (((stats.totalTrucks - stats.pendingDocuments) / stats.totalTrucks) * 100).toFixed(1) : '0.0'
  const monetizationRate = stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : '0.0'

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-info-400', border: 'border-l-info-500', bg: 'bg-info-500/10' },
    { label: 'Total Trucks', value: stats.totalTrucks, icon: Truck, color: 'text-success-400', border: 'border-l-success-500', bg: 'bg-success-500/10' },
    { label: 'Active Loads', value: stats.totalLoads, icon: Package, color: 'text-warning-400', border: 'border-l-warning-500', bg: 'bg-warning-500/10' },
    { label: 'Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-primary-400', border: 'border-l-primary-500', bg: 'bg-primary-500/10' },
    { label: 'Total Revenue', value: formatINR(stats.totalRevenue), icon: IndianRupee, color: 'text-success-400', border: 'border-l-success-500', bg: 'bg-success-500/10' },
    { 
      label: 'Pending KYC', 
      value: stats.pendingDocuments, 
      icon: ShieldAlert, 
      color: stats.pendingDocuments > 0 ? 'text-danger-400' : 'text-success-400', 
      border: stats.pendingDocuments > 0 ? 'border-l-danger-500' : 'border-l-success-500', 
      bg: stats.pendingDocuments > 0 ? 'bg-danger-500/10' : 'bg-success-500/10' 
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Operations Dashboard</h1>
          <p className="text-sm text-surface-400 mt-0.5">Real-time marketplace performance and health metrics</p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={cn(
                'card p-4 border-l-4 transition-all hover:border-surface-600',
                card.border
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn('p-2 rounded-lg', card.bg)}>
                  <Icon className={cn('w-4 h-4', card.color)} />
                </div>
              </div>
              <p className={cn('text-2xl font-black tracking-tight', card.color)}>
                {card.value}
              </p>
              <p className="text-xs text-surface-400 mt-1 font-medium">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Action Banner for KYC */}
      {stats.pendingDocuments > 0 && (
        <div className="card p-4 bg-danger-500/10 border-danger-500/30 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-500/20 rounded-lg text-danger-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Action Required: Pending KYC Documents</p>
              <p className="text-xs text-surface-300">
                {stats.pendingDocuments} document{stats.pendingDocuments !== 1 ? 's' : ''} awaiting admin verification.
              </p>
            </div>
          </div>
          <Link to="/kyc" className="btn-primary text-xs py-1.5 px-3">
            Review Queue →
          </Link>
        </div>
      )}

      {/* Computed Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-surface-400">Booking Conversion</p>
            <TrendingUp className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-3xl font-black text-primary-400">{bookingConversion}%</p>
          <p className="text-xs text-surface-400 mt-2">
            {stats.totalBookings} total bookings created from {stats.totalLoads} posted loads.
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-surface-400">Fleet Compliance</p>
            <CheckCircle2 className="w-4 h-4 text-success-400" />
          </div>
          <p className="text-3xl font-black text-success-400">{kycCompliance}%</p>
          <p className="text-xs text-surface-400 mt-2">
            Verified trucks in the fleet without pending documentation flags.
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-surface-400">Monetization Rate</p>
            <CreditCard className="w-4 h-4 text-info-400" />
          </div>
          <p className="text-3xl font-black text-info-400">{monetizationRate}%</p>
          <p className="text-xs text-surface-400 mt-2">
            {stats.activeSubscriptions} active subscriptions across {stats.totalUsers} registered users.
          </p>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Recent Payment Transactions</h2>
            <p className="text-xs text-surface-400">Latest successful subscription payments from Cashfree</p>
          </div>
          <span className="badge bg-success-500/10 text-success-400 border border-success-500/20">
            {stats.recentPayments.length} recorded
          </span>
        </div>

        {stats.recentPayments.length === 0 ? (
          <div className="py-8 text-center text-surface-400 text-sm">
            No recent payment activity recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left pb-3">User</th>
                  <th className="text-left pb-3">Plan / Purpose</th>
                  <th className="text-right pb-3">Amount</th>
                  <th className="text-right pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {stats.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-700/20 transition-colors">
                    <td className="py-3">
                      <p className="font-semibold text-white">{p.user.name || '—'}</p>
                      <p className="text-xs text-surface-400 font-mono">{p.user.phone}</p>
                    </td>
                    <td className="py-3 capitalize text-surface-300">
                      {(p.metadata as Record<string, string> | null)?.plan?.replace(/_/g, ' ') || p.purpose?.replace(/_/g, ' ') || 'Subscription'}
                    </td>
                    <td className="py-3 text-right font-bold text-success-400">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 text-right text-xs text-surface-400">
                      {new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
