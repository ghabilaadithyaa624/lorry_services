'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  MapIcon,
  BoltIcon,
  TruckIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatINR, cn } from '@/lib/utils'
import {
  efficiencyTone,
  type AnalyticsPayload,
  type AnalyticsHeatmapRow,
} from '@/lib/analytics'
import { downloadAnalyticsCsv, downloadAnalyticsPdf } from '@/lib/analyticsExport'

const RANGE_OPTIONS = [
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 180, label: '180D' },
  { days: 365, label: '1Y' },
] as const

type RangeDays = (typeof RANGE_OPTIONS)[number]['days']

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <Badge variant="neutral" size="sm" className="font-mono text-[10px]">— no prior data</Badge>
  }
  const up = value >= 0
  return (
    <Badge variant={up ? 'success' : 'danger'} size="sm" className="font-mono text-[10px]">
      {up ? <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
      {up ? '+' : ''}{value}% vs prev.
    </Badge>
  )
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1.5 h-16" aria-hidden="true">
      {values.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t-md bg-primary-500/70 hover:bg-primary-400 transition-colors"
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          title={String(value)}
        />
      ))}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: React.ReactNode
  tone: string
  children?: React.ReactNode
}) {
  return (
    <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-3 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon className="w-[18px] h-[18px]" />
          </span>
          <p className="text-[10px] font-mono font-black text-surface-400 uppercase tracking-widest">
            {label}
          </p>
        </div>
        {hint}
      </div>
      <div className="flex-1">
        <p className={cn('text-3xl font-black font-mono tracking-tight', tone)}>{value}</p>
      </div>
      {children}
    </div>
  )
}

/** Route × month traffic heatmap with an efficiency column. */
function RouteHeatmap({ rows }: { rows: AnalyticsHeatmapRow[] }) {
  const maxCell = useMemo(
    () => Math.max(1, ...rows.flatMap(row => row.months.map(month => month.trips))),
    [rows],
  )

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <MapIcon className="w-8 h-8 text-surface-500 mx-auto" />
        <p className="text-xs font-mono text-surface-400">
          No completed trips in this window — route heatmap will populate as deliveries close.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-left text-[9px] uppercase tracking-widest text-surface-400 font-black px-2 pb-1 min-w-[180px]">
              Route corridor
            </th>
            {rows[0].months.map(month => (
              <th
                key={month.key}
                className="text-center text-[9px] uppercase tracking-widest text-surface-400 font-black px-2 pb-1 min-w-[52px]"
              >
                {month.label}
              </th>
            ))}
            <th className="text-left text-[9px] uppercase tracking-widest text-surface-400 font-black px-2 pb-1 min-w-[150px]">
              Efficiency
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const tone = efficiencyTone(row.efficiencyScore)
            return (
              <tr key={row.route}>
                <td className="px-2 py-1.5">
                  <p className="font-bold text-white leading-tight">{row.route}</p>
                  <p className="text-[10px] text-surface-500">{row.trips} trip{row.trips !== 1 ? 's' : ''}</p>
                </td>
                {row.months.map(month => {
                  const intensity = month.trips / maxCell
                  return (
                    <td
                      key={month.key}
                      title={`${row.route} · ${month.label}: ${month.trips} trip${month.trips !== 1 ? 's' : ''}`}
                      className="rounded-md text-center h-9 font-bold transition-transform hover:scale-105"
                      style={{
                        backgroundColor:
                          month.trips > 0
                            ? `rgba(249, 115, 22, ${0.15 + intensity * 0.8})`
                            : 'rgba(255, 255, 255, 0.03)',
                        color: intensity > 0.55 ? '#fff' : undefined,
                      }}
                    >
                      {month.trips > 0 ? month.trips : <span className="text-surface-600">·</span>}
                    </td>
                  )
                })}
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <span
                        className={cn('block h-full rounded-full', tone.bar)}
                        style={{ width: `${Math.max(4, row.efficiencyScore)}%` }}
                      />
                    </span>
                    <span className={cn('text-[10px] font-bold', tone.text)}>
                      {row.efficiencyScore}%
                    </span>
                    <Badge variant="default" size="sm" className={cn('text-[9px]', tone.text, tone.bg, tone.border)}>
                      {row.efficiencyLabel}
                    </Badge>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeDays>(30)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getAnalytics(range)
      setData(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard analytics'
      setError(msg)
      toast.error('Failed to load dashboard analytics')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExportCsv = () => {
    if (!data) return
    setExporting('csv')
    try {
      downloadAnalyticsCsv(data)
      toast.success('Analytics exported as CSV')
    } catch {
      toast.error('CSV export failed')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    if (!data) return
    setExporting('pdf')
    try {
      await downloadAnalyticsPdf(data)
      toast.success('Analytics report exported as PDF')
    } catch {
      toast.error('PDF export failed')
    } finally {
      setExporting(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono font-bold text-surface-400 uppercase tracking-widest">
          Computing fleet analytics telemetry...
        </p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Unable to Load Analytics</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-mono text-xs font-bold shadow-glow-primary hover:bg-primary-500 transition-colors inline-flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const { trips, earnings, bookings, routes } = data
  const topRoute = routes.topRoutes[0]
  const weakestRoute = routes.topRoutes.length > 1
    ? routes.topRoutes[routes.topRoutes.length - 1]
    : undefined
  const monthlyEarnings = trips.completedByMonth.map(point => point.earnings)
  const maxMonthEarnings = Math.max(...monthlyEarnings, 1)

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── HEADER ── */}
      <div className="bg-panel rounded-[20px] border border-white/10 p-5 sm:p-6 shadow-modal relative overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
                Dashboard Analytics
              </span>
              <Badge variant="success" size="sm" className="font-mono text-[10px]">
                Live Operational Data
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Fleet Analytics &amp; Route Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-surface-300 leading-relaxed max-w-2xl">
              Trip completion, earnings, active booking pipeline and corridor-level route efficiency —
              exported as a single CSV or branded PDF report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Range selector */}
            <div className="flex items-center rounded-xl bg-surface-950 border border-white/10 p-1 gap-0.5">
              {RANGE_OPTIONS.map(option => (
                <button
                  key={option.days}
                  onClick={() => setRange(option.days)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase transition-colors cursor-pointer',
                    range === option.days
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'text-surface-400 hover:text-white',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowPathIcon className={cn('w-3.5 h-3.5 text-primary-400', loading && 'animate-spin')} />
              Refresh
            </button>

            <button
              onClick={handleExportCsv}
              disabled={exporting !== null}
              className="px-3.5 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {exporting === 'csv'
                ? <ArrowDownTrayIcon className="w-3.5 h-3.5 text-primary-400 animate-bounce" />
                : <DocumentArrowDownIcon className="w-3.5 h-3.5 text-primary-400" />}
              Export CSV
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exporting !== null}
              className="px-3.5 py-2 rounded-xl bg-primary-600 text-white text-xs font-mono font-bold shadow-glow-primary hover:bg-primary-500 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {exporting === 'pdf'
                ? <ArrowDownTrayIcon className="w-3.5 h-3.5 animate-bounce" />
                : <DocumentArrowDownIcon className="w-3.5 h-3.5" />}
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 REQUIRED DASHBOARD CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Total trips completed */}
        <StatCard
          icon={TruckIcon}
          label="Total Trips Completed"
          value={trips.totalCompleted.toLocaleString('en-IN')}
          tone="text-white"
          hint={<DeltaBadge value={trips.changePercent} />}
        >
          <div className="space-y-2">
            <MiniBars values={trips.completedByMonth.map(point => point.trips)} />
            <div className="flex items-center justify-between text-[10px] font-mono text-surface-400">
              <span>{trips.periodCompleted} in last {data.rangeDays}d</span>
              <span>{trips.averageDurationHours === null ? '—' : `${trips.averageDurationHours}h avg`}</span>
            </div>
          </div>
        </StatCard>

        {/* 2. Earnings summary */}
        <StatCard
          icon={BanknotesIcon}
          label="Earnings Summary"
          value={formatINR(earnings.grossBookingValue)}
          tone="text-emerald-400"
          hint={<span className="text-[10px] font-mono text-emerald-400/80">Gross booking value</span>}
        >
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-surface-950/80 border border-white/5">
                <p className="text-[9px] uppercase tracking-widest text-surface-500 font-mono">This period</p>
                <p className="text-sm font-black font-mono text-white mt-0.5">{formatINR(earnings.periodEarnings)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-950/80 border border-white/5">
                <p className="text-[9px] uppercase tracking-widest text-surface-500 font-mono">Avg / trip</p>
                <p className="text-sm font-black font-mono text-white mt-0.5">{formatINR(earnings.averageTripEarnings)}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono text-surface-400 mb-1">
                <span>Advance · {formatINR(earnings.advanceCollected)}</span>
                <span>Balance · {formatINR(earnings.balanceCollected)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                <span
                  className="h-full bg-emerald-500/80 rounded-l-full"
                  style={{
                    width: `${earnings.advanceCollected + earnings.balanceCollected > 0
                      ? (earnings.advanceCollected / (earnings.advanceCollected + earnings.balanceCollected)) * 100
                      : 0}%`,
                  }}
                />
                <span
                  className="h-full bg-primary-500/80 rounded-r-full"
                  style={{
                    width: `${earnings.advanceCollected + earnings.balanceCollected > 0
                      ? (earnings.balanceCollected / (earnings.advanceCollected + earnings.balanceCollected)) * 100
                      : 0}%`,
                  }}
                />
              </div>
              <p className="text-[10px] font-mono text-surface-500 mt-1.5">
                Platform revenue · {formatINR(earnings.platformRevenue)}
              </p>
            </div>
          </div>
        </StatCard>

        {/* 3. Active bookings */}
        <StatCard
          icon={CalendarDaysIcon}
          label="Active Bookings"
          value={bookings.active.toLocaleString('en-IN')}
          tone="text-primary-400"
          hint={<Badge variant="primary" size="sm" className="font-mono text-[10px]">{bookings.completionRate}% closure</Badge>}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              {[
                { label: 'Pending', count: bookings.pending, tone: 'text-amber-400 border-amber-500/25 bg-amber-500/10' },
                { label: 'Confirmed', count: bookings.confirmed, tone: 'text-sky-400 border-sky-500/25 bg-sky-500/10' },
                { label: 'In transit', count: bookings.inTransit, tone: 'text-primary-400 border-primary-500/25 bg-primary-500/10' },
              ].map(status => (
                <div key={status.label} className={cn('flex-1 p-2.5 rounded-xl border text-center', status.tone)}>
                  <p className="text-base font-black font-mono">{status.count}</p>
                  <p className="text-[9px] uppercase tracking-widest opacity-80 mt-0.5">{status.label}</p>
                </div>
              ))}
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
              {[
                { count: bookings.pending, cls: 'bg-amber-500/80' },
                { count: bookings.confirmed, cls: 'bg-sky-500/80' },
                { count: bookings.inTransit, cls: 'bg-primary-500/80' },
              ].map((segment, index) => (
                <span
                  key={index}
                  className={cn('h-full', segment.cls)}
                  style={{ width: `${bookings.active > 0 ? (segment.count / bookings.active) * 100 : 0}%` }}
                />
              ))}
            </div>
            <p className="text-[10px] font-mono text-surface-500">
              {bookings.completed} completed · {bookings.cancelled} cancelled (lifetime)
            </p>
          </div>
        </StatCard>

        {/* 4. Route efficiency summary */}
        <StatCard
          icon={BoltIcon}
          label="Route Efficiency"
          value={`${routes.averageEfficiency}%`}
          tone={efficiencyTone(routes.averageEfficiency).text}
          hint={
            <Badge
              variant="default"
              size="sm"
              className={cn(
                'font-mono text-[10px]',
                efficiencyTone(routes.averageEfficiency).text,
                efficiencyTone(routes.averageEfficiency).bg,
                efficiencyTone(routes.averageEfficiency).border,
              )}
            >
              {efficiencyTone(routes.averageEfficiency).label}
            </Badge>
          }
        >
          <div className="space-y-2.5">
            {topRoute ? (
              <div className="p-2.5 rounded-xl bg-surface-950/80 border border-white/5 space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-mono">Best corridor</p>
                <p className="text-xs font-bold text-white truncate">{topRoute.route}</p>
                <p className="text-[10px] font-mono text-surface-400">
                  {topRoute.efficiencyScore}% · {topRoute.trips} trips · {topRoute.onTimeRate === null ? '—' : `${topRoute.onTimeRate}% on-time`}
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-surface-950/80 border border-white/5 text-[10px] font-mono text-surface-400">
                No route data yet.
              </div>
            )}
            {weakestRoute && (
              <>
                <p className="text-[9px] uppercase tracking-widest text-surface-500 font-mono">{routes.totalRoutes} corridors tracked</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-surface-400">
                  <span className="truncate">Weakest: {weakestRoute.route}</span>
                  <span className={efficiencyTone(weakestRoute.efficiencyScore).text}>{weakestRoute.efficiencyScore}%</span>
                </div>
              </>
            )}
            <p className="text-[10px] font-mono text-surface-500">
              Transit pace × 50% · On-time × 30% · Checkpoint × 20%
            </p>
          </div>
        </StatCard>
      </div>

      {/* ── ROUTE EFFICIENCY HEATMAP ── */}
      <div className="p-5 sm:p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/25 text-primary-400 flex items-center justify-center">
              <ChartBarIcon className="w-[18px] h-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white font-mono">
                Route Efficiency Heatmap
              </h2>
              <p className="text-[10px] font-mono text-surface-400 mt-0.5">
                Trip density by corridor × month · intensity = load frequency
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-surface-400">
            <span>Low</span>
            <div
              className="h-2.5 w-28 rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(249,115,22,0.4), rgba(249,115,22,0.95))' }}
            />
            <span>High</span>
          </div>
        </div>
        <RouteHeatmap rows={routes.heatmap} />
      </div>

      {/* ── MONTHLY TREND + ROUTE RANKING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 sm:p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-[18px] h-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white font-mono">Monthly Earnings Trend</h2>
              <p className="text-[10px] font-mono text-surface-400 mt-0.5">Completed-trip value · last 6 months</p>
            </div>
          </div>
          <div className="flex items-end gap-3 h-44">
            {trips.completedByMonth.map(point => (
              <div key={point.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-mono text-surface-400">{formatINR(point.earnings)}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600/60 to-emerald-400/90 hover:to-emerald-300 transition-colors"
                  style={{ height: `${Math.max(3, (point.earnings / maxMonthEarnings) * 70)}%` }}
                  title={`${point.label}: ${point.trips} trips · ${formatINR(point.earnings)}`}
                />
                <span className="text-[9px] font-mono text-surface-500 uppercase">{point.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-[20px] bg-panel border border-white/10 shadow-modal space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <span className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center justify-center">
              <ClipboardDocumentCheckIcon className="w-[18px] h-[18px]" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white font-mono">Route Efficiency Ranking</h2>
              <p className="text-[10px] font-mono text-surface-400 mt-0.5">Top corridors by completed trip volume</p>
            </div>
          </div>
          {routes.topRoutes.length === 0 ? (
            <p className="py-8 text-center text-[11px] font-mono text-surface-400">No completed corridor data.</p>
          ) : (
            <div className="space-y-2">
              {routes.topRoutes.slice(0, 6).map((route, index) => {
                const tone = efficiencyTone(route.efficiencyScore)
                return (
                  <div key={route.route} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-950/60 border border-white/5">
                    <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono font-black text-surface-400 flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{route.route}</p>
                      <p className="text-[10px] font-mono text-surface-500">
                        {route.trips} trips · {route.averageDurationHours === null ? '—' : `${route.averageDurationHours}h avg`}
                      </p>
                    </div>
                    <Badge variant="default" size="sm" className={cn('font-mono text-[10px]', tone.text, tone.bg, tone.border)}>
                      {route.efficiencyScore}%
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
