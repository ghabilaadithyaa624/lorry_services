'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  BanknotesIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatINR } from '@/lib/utils'

import { FreightNetworkDiagram } from '@/components/ui/FreightNetworkDiagram'

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getStats()
      setStats(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard stats'
      setError(msg)
      toast.error('Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono font-bold text-surface-400 uppercase tracking-widest">
          Loading command center telemetry...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Unable to Load Operational Data</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchStats}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-mono text-xs font-bold shadow-glow-primary hover:bg-primary-500 transition-colors inline-flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" /> Retry Command Fetch
        </button>
      </div>
    )
  }

  if (!stats) return null

  // Calculate real secondary metrics
  const bookingConversion = stats.totalLoads > 0 ? ((stats.totalBookings / stats.totalLoads) * 100).toFixed(1) : '0.0'
  const kycCompliance = stats.totalTrucks > 0 ? (((stats.totalTrucks - stats.pendingDocuments) / stats.totalTrucks) * 100).toFixed(1) : '0.0'
  const monetizationRate = stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : '0.0'

  const verifiedTrucksCount = Math.max(0, stats.totalTrucks - stats.pendingDocuments)

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* ── HERO COMMAND HEADER WITH RESTRAINED 3D ── */}
      <div className="bg-panel rounded-[20px] border border-white/10 p-6 sm:p-8 shadow-modal relative overflow-hidden">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
                Logistics Command Control Tower
              </span>
              <Badge variant="success" size="sm" className="font-mono text-[10px]">
                Live Telematics
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Operations Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-surface-300 leading-relaxed max-w-xl">
              Real-time marketplace performance and operational health across all active national freight corridors.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={fetchStats}
                className="px-4 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowPathIcon className="w-3.5 h-3.5 text-primary-400" />
                <span>Refresh Telematics</span>
              </button>
            </div>
          </div>

          {/* Freight Network Diagram */}
          <div className="lg:col-span-5">
            <FreightNetworkDiagram />
          </div>
        </div>
      </div>

      {/* ── 7 PRIMARY REQUIRED KPI CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 font-mono">
        <div className="p-4 rounded-2xl bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Total Users</span>
          <span className="text-2xl font-black text-white block">{stats.totalUsers}</span>
          <span className="text-[10px] text-surface-400 block">Registered</span>
        </div>

        <div className="p-4 rounded-2xl bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Total Trucks</span>
          <span className="text-2xl font-black text-emerald-300 block">{stats.totalTrucks}</span>
          <span className="text-[10px] text-emerald-400/80 block">Fleet Capacity</span>
        </div>

        <div className="p-4 rounded-2xl bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">Active Loads</span>
          <span className="text-2xl font-black text-amber-300 block">{stats.totalLoads}</span>
          <span className="text-[10px] text-amber-400/80 block">Open Freight</span>
        </div>

        <div className="p-4 rounded-2xl bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 block">Active Bookings</span>
          <span className="text-2xl font-black text-primary-300 block">{stats.totalBookings}</span>
          <span className="text-[10px] text-primary-400/80 block">Booked Trips</span>
        </div>

        <div className="p-4 rounded-2xl bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block">Active Passes</span>
          <span className="text-2xl font-black text-purple-300 block">{stats.activeSubscriptions}</span>
          <span className="text-[10px] text-purple-400/80 block">Subscriptions</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 shadow-card space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Total Revenue</span>
          <span className="text-xl font-black text-emerald-300 block truncate">{formatINR(stats.totalRevenue)}</span>
          <span className="text-[10px] text-emerald-400/80 block">Settled Gross</span>
        </div>

        <div className="p-4 rounded-2xl bg-danger-950/40 border border-danger-500/30 shadow-card space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-danger-400 block">Pending KYC</span>
          <span className="text-2xl font-black text-danger-300 block">{stats.pendingDocuments}</span>
          <span className="text-[10px] text-danger-400/80 block">Requires Review</span>
        </div>
      </div>

      {/* ── SECONDARY INTELLIGENCE PANELS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
        
        {/* PANEL 1: BOOKING CONVERSION */}
        <div className="p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Booking Conversion</h2>
            </div>
            <Badge variant="primary" size="sm" className="font-mono text-[10px]">{bookingConversion}% Rate</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-surface-400">Loads Posted</span>
              <span className="font-bold text-white">{stats.totalLoads}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-surface-400">Bookings Created</span>
              <span className="font-bold text-white">{stats.totalBookings}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-surface-400">Conversion Efficiency</span>
              <span className="font-bold text-primary-400">{bookingConversion}%</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: FLEET COMPLIANCE */}
        <div className="p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Fleet Compliance</h2>
            </div>
            <Badge variant="success" size="sm" className="font-mono text-[10px]">{kycCompliance}% Verified</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-surface-400">Verified Trucks</span>
              <span className="font-bold text-emerald-400">{verifiedTrucksCount} Vehicles</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-surface-400">Pending Review</span>
              <span className="font-bold text-amber-400">{stats.pendingDocuments} Docs</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-surface-400">Compliance Rate</span>
              <span className="font-bold text-white">{kycCompliance}%</span>
            </div>
          </div>
        </div>

        {/* PANEL 3: MONETIZATION */}
        <div className="p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5 text-purple-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Monetization</h2>
            </div>
            <Badge variant="info" size="sm" className="font-mono text-[10px]">{monetizationRate}% Subscribed</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-surface-400">Active Subscriptions</span>
              <span className="font-bold text-purple-300">{stats.activeSubscriptions} Passes</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-surface-400">Settled Revenue</span>
              <span className="font-bold text-emerald-400">{formatINR(stats.totalRevenue)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-surface-400">Monetization Ratio</span>
              <span className="font-bold text-white">{monetizationRate}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── OPERATIONAL HEALTH CLASSIFICATION BANNER ── */}
      <div className="p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4 font-mono">
        <span className="text-xs font-bold uppercase tracking-wider text-surface-400 block">
          Operational Health & System Exception Feeds
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-danger-950/40 border border-danger-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-danger-400 uppercase">🚨 ACTION REQUIRED</span>
              <Badge variant="danger" size="sm" className="font-mono text-[10px]">{stats.pendingDocuments}</Badge>
            </div>
            <p className="text-white font-bold">{stats.pendingDocuments} Pending KYC Documents</p>
            <p className="text-surface-400 text-[11px]">Requires compliance verification in KYC Queue.</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 uppercase">🟡 ATTENTION REQUIRED</span>
              <Badge variant="warning" size="sm" className="font-mono text-[10px]">{Math.max(0, stats.totalLoads - stats.totalBookings)}</Badge>
            </div>
            <p className="text-white font-bold">{Math.max(0, stats.totalLoads - stats.totalBookings)} Unmatched Open Loads</p>
            <p className="text-surface-400 text-[11px]">Awaiting lorry assignments along corridors.</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 uppercase">✓ ON TRACK</span>
              <Badge variant="success" size="sm" className="font-mono text-[10px]">{verifiedTrucksCount}</Badge>
            </div>
            <p className="text-white font-bold">{verifiedTrucksCount} Verified Fleet Lorries</p>
            <p className="text-surface-400 text-[11px]">Active vehicles operating across national routes.</p>
          </div>
        </div>
      </div>

      {/* ── OPERATIONS WORKSPACES ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <Link href="/admin/kyc" className="p-5 rounded-[20px] bg-panel border border-white/10 hover:border-primary-500/40 transition-colors group">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary-400">Identity & compliance</span><span className="text-primary-400 group-hover:translate-x-1 transition-transform">→</span></div>
          <h2 className="text-sm font-bold text-white mt-2">RC + Vahan verification</h2>
          <p className="text-[11px] text-surface-400 mt-1">Review documents and run a government registration lookup before approving fleet access.</p>
        </Link>
        <Link href="/admin/disputes" className="p-5 rounded-[20px] bg-panel border border-white/10 hover:border-danger-500/40 transition-colors group">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-black uppercase tracking-widest text-danger-300">Trust operations</span><span className="text-danger-300 group-hover:translate-x-1 transition-transform">→</span></div>
          <h2 className="text-sm font-bold text-white mt-2">Resolve booking disputes</h2>
          <p className="text-[11px] text-surface-400 mt-1">Triage counterparty claims, inspect route context, and record a decision note.</p>
        </Link>
        <Link href="/admin/analytics" className="p-5 rounded-[20px] bg-panel border border-white/10 hover:border-sky-500/40 transition-colors group">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-black uppercase tracking-widest text-sky-300">Performance</span><span className="text-sky-300 group-hover:translate-x-1 transition-transform">→</span></div>
          <h2 className="text-sm font-bold text-white mt-2">Trip & route analytics</h2>
          <p className="text-[11px] text-surface-400 mt-1">Compare trip count, settled revenue, and checkpoint efficiency by corridor.</p>
        </Link>
      </div>

      {/* ── RECENT SETTLED PAYMENTS TABLE ── */}
      <div className="p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4 font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Recent Payment Transactions</h2>
          </div>
          <span className="text-xs text-surface-400">Cashfree Sandbox Audit Log</span>
        </div>

        {stats.recentPayments.length === 0 ? (
          <div className="py-8 text-center text-xs text-surface-400">
            No payments recorded yet in the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-surface-400 uppercase text-[10px]">
                  <th className="text-left py-2.5 px-4 font-bold">User</th>
                  <th className="text-left py-2.5 px-4 font-bold">Purpose / Plan</th>
                  <th className="text-right py-2.5 px-4 font-bold">Amount</th>
                  <th className="text-right py-2.5 px-4 font-bold">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {p.user.name || p.user.phone}
                    </td>
                    <td className="py-3 px-4 text-surface-300 capitalize">
                      {(p.metadata as Record<string, string> | null)?.plan?.replace(/_/g, ' ') || p.purpose?.replace(/_/g, ' ') || 'Pass'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-surface-400">
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
