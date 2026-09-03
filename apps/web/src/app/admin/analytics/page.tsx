'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  ExclamationTriangleIcon,
  MapIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Spinner } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { toast } from '@/lib/toast'

interface AnalyticsResponse {
  rangeDays: number
  generatedAt: string
  summary: {
    totalTrips: number
    completedTrips: number
    inTransitTrips: number
    cancelledTrips: number
    revenue: number
    bookingValue: number
    averageRevenuePerTrip: number
    routeEfficiencyPercent: number
    routeEfficiencyBasis: string
    averageTransitHours: number | null
    openDisputes: number
  }
  trend: Array<{ label: string; trips: number; revenue: number }>
  routes: Array<{
    origin: string
    destination: string
    trips: number
    completed: number
    value: number
    checkpoints: number
    crossed: number
    efficiencyPercent: number
  }>
}

const RANGE_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '12 months' },
]

function percent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [range, setRange] = useState(30)
  const [loading, setLoading] = useState(true)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminApi.getAnalytics(range)
      setAnalytics(response.data)
    } catch {
      toast.error('Could not load performance analytics')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const maxTrendRevenue = useMemo(
    () => Math.max(...(analytics?.trend || []).map((point) => point.revenue), 1),
    [analytics],
  )
  const maxTrendTrips = useMemo(
    () => Math.max(...(analytics?.trend || []).map((point) => point.trips), 1),
    [analytics],
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <section className="bg-panel rounded-[20px] border border-white/10 shadow-modal p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,#000_65%,transparent_100%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChartBarIcon className="w-5 h-5 text-primary-400" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary-400 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full">
                Operations intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Performance analytics</h1>
            <p className="text-xs sm:text-sm text-surface-400 mt-2 max-w-2xl leading-relaxed">
              Trip throughput, settled revenue, and checkpoint-based route efficiency from the live booking ledger. Every metric is scoped to the selected period.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-950/80 border border-white/10">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                    range === option.value ? 'bg-primary-500 text-white shadow-glow-primary' : 'text-surface-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-surface-950 border border-white/10 text-xs font-mono font-bold text-white hover:border-white/20 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-4 h-4 text-primary-400 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {loading && !analytics ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 font-mono">
          <Spinner size="lg" />
          <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">Aggregating trip telemetry...</p>
        </div>
      ) : analytics ? (
        <>
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 font-mono">
            <MetricCard label="Total trips" value={analytics.summary.totalTrips} detail={`${analytics.rangeDays}-day window`} icon={TruckIcon} tone="text-white" />
            <MetricCard label="Completed trips" value={analytics.summary.completedTrips} detail={`${analytics.summary.inTransitTrips} currently in transit`} icon={CheckCircleIcon} tone="text-emerald-300" />
            <MetricCard label="Settled revenue" value={formatINR(analytics.summary.revenue)} detail="Successful platform payments" icon={CurrencyRupeeIcon} tone="text-primary-300" />
            <MetricCard label="Route efficiency" value={percent(analytics.summary.routeEfficiencyPercent)} detail="Checkpoint completion rate" icon={MapIcon} tone="text-sky-300" />
            <MetricCard label="Avg transit" value={analytics.summary.averageTransitHours === null ? '—' : `${analytics.summary.averageTransitHours}h`} detail={`${analytics.summary.openDisputes} open disputes`} icon={ClockIcon} tone="text-amber-300" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
            <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-primary-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Trip throughput</h2>
                  </div>
                  <p className="text-[11px] text-surface-400 font-mono mt-1">Bookings created across the selected period</p>
                </div>
                <Badge variant="success" size="sm" className="font-mono text-[10px]">LIVE LEDGER</Badge>
              </div>
              {analytics.trend.length === 0 ? (
                <EmptyAnalyticsState />
              ) : (
                <div className="mt-6 h-56 flex items-end gap-2 sm:gap-4">
                  {analytics.trend.map((point) => (
                    <div key={point.label} className="flex-1 h-full flex flex-col items-center justify-end gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-surface-400">{point.trips}</span>
                      <div className="w-full max-w-12 rounded-t-lg bg-primary-500/80 hover:bg-primary-400 transition-colors" style={{ height: `${Math.max(5, (point.trips / maxTrendTrips) * 78)}%` }} title={`${point.trips} trips`} />
                      <span className="text-[10px] font-mono text-surface-500 truncate max-w-full">{point.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <CurrencyRupeeIcon className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Revenue pulse</h2>
                  </div>
                  <p className="text-[11px] text-surface-400 font-mono mt-1">Gross booking value by period bucket</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">{formatINR(analytics.summary.bookingValue)}</span>
              </div>
              {analytics.trend.length === 0 ? (
                <EmptyAnalyticsState />
              ) : (
                <div className="space-y-3 mt-5">
                  {analytics.trend.map((point) => (
                    <div key={point.label} className="grid grid-cols-[42px_1fr_76px] items-center gap-3 text-[10px] font-mono">
                      <span className="text-surface-500">{point.label}</span>
                      <div className="h-2 rounded-full bg-surface-950 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${Math.max(point.revenue ? 4 : 0, (point.revenue / maxTrendRevenue) * 100)}%` }} />
                      </div>
                      <span className="text-right text-surface-300">{formatINR(point.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-surface-400">Average freight value / trip</span>
                <span className="font-bold text-white">{formatINR(analytics.summary.averageRevenuePerTrip)}</span>
              </div>
            </div>
          </section>

          <section className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-sky-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Route efficiency by corridor</h2>
                </div>
                <p className="text-[11px] text-surface-400 font-mono mt-1">Ranked by trip volume · {analytics.summary.routeEfficiencyBasis.toLowerCase()}</p>
              </div>
              <span className="text-[10px] font-mono text-sky-300 bg-sky-950/50 border border-sky-500/20 px-3 py-1.5 rounded-lg">{analytics.routes.length} corridors in window</span>
            </div>
            {analytics.routes.length === 0 ? (
              <EmptyAnalyticsState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-surface-950/60 border-b border-white/10 text-[10px] uppercase text-surface-400">
                      <th className="text-left py-3 px-5 font-bold">Corridor</th>
                      <th className="text-right py-3 px-5 font-bold">Trips</th>
                      <th className="text-right py-3 px-5 font-bold">Completed</th>
                      <th className="text-right py-3 px-5 font-bold">Freight value</th>
                      <th className="text-right py-3 px-5 font-bold">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analytics.routes.map((route) => (
                      <tr key={`${route.origin}-${route.destination}`} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 text-white font-bold">
                            <span className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300">→</span>
                            <span>{route.origin} <span className="text-surface-500 mx-1">to</span> {route.destination}</span>
                          </div>
                          <span className="text-[10px] text-surface-500 ml-8">{route.checkpoints ? `${route.crossed}/${route.checkpoints} checkpoints crossed` : 'No checkpoint telemetry'}</span>
                        </td>
                        <td className="py-4 px-5 text-right font-bold text-white">{route.trips}</td>
                        <td className="py-4 px-5 text-right text-emerald-300">{route.completed}</td>
                        <td className="py-4 px-5 text-right text-surface-200">{formatINR(route.value)}</td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-surface-950 overflow-hidden"><div className="h-full rounded-full bg-sky-400" style={{ width: percent(route.efficiencyPercent) }} /></div>
                            <span className="font-bold text-sky-300 w-9">{percent(route.efficiencyPercent)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20"><p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Completed delivery rate</p><p className="text-2xl font-black text-white mt-1">{analytics.summary.totalTrips ? percent((analytics.summary.completedTrips / analytics.summary.totalTrips) * 100) : '0%'}</p><p className="text-[10px] text-surface-400 mt-1">{analytics.summary.cancelledTrips} cancelled trips excluded from delivery count</p></div>
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20"><p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Cancellation signal</p><p className="text-2xl font-black text-white mt-1">{analytics.summary.totalTrips ? percent((analytics.summary.cancelledTrips / analytics.summary.totalTrips) * 100) : '0%'}</p><p className="text-[10px] text-surface-400 mt-1">Monitor for corridor or counterparty intervention</p></div>
            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/20"><p className="text-[10px] uppercase tracking-widest text-sky-400 font-bold">Metric note</p><p className="text-xs font-bold text-white mt-2 leading-relaxed">Route efficiency uses crossed scheduled checkpoints when telemetry exists, otherwise completed trips.</p></div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: React.ReactNode; detail: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-panel border border-white/10 shadow-card space-y-2">
      <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span><Icon className={`w-4 h-4 ${tone}`} /></div>
      <span className={`text-2xl sm:text-3xl font-black block ${tone}`}>{value}</span>
      <span className="text-[10px] text-surface-400 block">{detail}</span>
    </div>
  )
}

function EmptyAnalyticsState() {
  return (
    <div className="py-14 flex flex-col items-center justify-center text-center gap-2">
      <ExclamationTriangleIcon className="w-9 h-9 text-surface-500" />
      <p className="text-sm font-bold text-white">No trip data in this period</p>
      <p className="text-[11px] text-surface-400">New booking activity will appear here automatically.</p>
    </div>
  )
}
