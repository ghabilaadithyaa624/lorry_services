import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BarChart3, CheckCircle2, Clock3, IndianRupee, Map, RefreshCw, Truck } from 'lucide-react'
import { adminApi } from '../lib/api'
import { formatINR } from '../lib/utils'

interface AnalyticsData {
  rangeDays: number
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
  routes: Array<{ origin: string; destination: string; trips: number; completed: number; value: number; efficiencyPercent: number; checkpoints: number; crossed: number }>
}

const ranges = [7, 30, 90, 365]

export function Analytics() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.getAnalytics(range)
      setData(result.data)
    } catch {
      setError('Analytics service is unavailable. Check the API and retry.')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { load() }, [load])

  const maxTrips = useMemo(() => Math.max(...(data?.trend || []).map((point) => point.trips), 1), [data])

  if (loading && !data) return <LoadingState label="Aggregating trip telemetry..." />
  if (error && !data) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-400 text-xs font-bold uppercase tracking-widest"><BarChart3 className="w-4 h-4" /> Operations intelligence</div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-2">Performance Analytics</h1>
          <p className="text-sm text-surface-400 mt-1">Trip throughput, revenue, and route efficiency from the booking ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-[#0F131D] border border-white/10">
            {ranges.map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${range === value ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'}`}>{value === 365 ? '12 mo' : `${value}d`}</button>)}
          </div>
          <button type="button" onClick={load} disabled={loading} className="btn-secondary !px-3 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <Metric label="Total trips" value={data.summary.totalTrips} detail={`${data.rangeDays}-day window`} icon={Truck} color="text-white" />
        <Metric label="Completed" value={data.summary.completedTrips} detail={`${data.summary.inTransitTrips} in transit`} icon={CheckCircle2} color="text-success-400" />
        <Metric label="Settled revenue" value={formatINR(data.summary.revenue)} detail="Successful payments" icon={IndianRupee} color="text-primary-400" />
        <Metric label="Route efficiency" value={`${data.summary.routeEfficiencyPercent}%`} detail="Checkpoint completion" icon={Map} color="text-info-400" />
        <Metric label="Avg transit" value={data.summary.averageTransitHours === null ? '—' : `${data.summary.averageTransitHours}h`} detail={`${data.summary.openDisputes} open disputes`} icon={Clock3} color="text-warning-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><h2 className="font-bold text-white">Trip throughput</h2><p className="text-xs text-surface-400 mt-1">Bookings created in each period bucket</p></div><span className="badge bg-success-500/10 text-success-400">LIVE</span></div>
          {data.trend.length === 0 ? <EmptyState /> : <div className="h-56 flex items-end gap-3 pt-6">{data.trend.map((point) => <div key={point.label} className="flex-1 h-full flex flex-col items-center justify-end gap-2"><span className="text-[10px] text-surface-400">{point.trips}</span><div className="w-full max-w-10 rounded-t-lg bg-primary-500/80 hover:bg-primary-400" style={{ height: `${Math.max(5, point.trips / maxTrips * 82)}%` }} /><span className="text-[10px] text-surface-500 truncate max-w-full">{point.label}</span></div>)}</div>}
        </section>
        <section className="card p-5 lg:col-span-2">
          <div className="border-b border-white/10 pb-4"><h2 className="font-bold text-white">Revenue pulse</h2><p className="text-xs text-surface-400 mt-1">Gross freight value in the same window</p></div>
          <div className="space-y-4 mt-5">{data.trend.map((point) => { const max = Math.max(...data.trend.map((item) => item.revenue), 1); return <div key={point.label} className="grid grid-cols-[42px_1fr_70px] items-center gap-2 text-[10px]"><span className="text-surface-500">{point.label}</span><div className="h-2 bg-[#070A11] rounded-full overflow-hidden"><div className="h-full bg-success-400 rounded-full" style={{ width: `${point.revenue ? Math.max(4, point.revenue / max * 100) : 0}%` }} /></div><span className="text-right text-surface-300">{formatINR(point.revenue)}</span></div> })}</div>
          <div className="mt-5 pt-4 border-t border-white/10 flex justify-between text-xs"><span className="text-surface-400">Average value / trip</span><strong className="text-white">{formatINR(data.summary.averageRevenuePerTrip)}</strong></div>
        </section>
      </div>

      <section className="card overflow-hidden"><div className="p-5 border-b border-white/10 flex items-center justify-between"><div><h2 className="font-bold text-white flex items-center gap-2"><Map className="w-4 h-4 text-info-400" /> Route efficiency by corridor</h2><p className="text-xs text-surface-400 mt-1">{data.summary.routeEfficiencyBasis}</p></div><span className="badge bg-info-500/10 text-info-400">{data.routes.length} corridors</span></div>{data.routes.length === 0 ? <EmptyState /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-surface-800/70 border-b border-white/10 text-[10px] uppercase text-surface-400"><th className="text-left px-5 py-3">Corridor</th><th className="text-right px-5 py-3">Trips</th><th className="text-right px-5 py-3">Completed</th><th className="text-right px-5 py-3">Value</th><th className="text-right px-5 py-3">Efficiency</th></tr></thead><tbody className="divide-y divide-white/5">{data.routes.map((route) => <tr key={`${route.origin}-${route.destination}`} className="hover:bg-white/5"><td className="px-5 py-4"><p className="font-bold text-white">{route.origin} <span className="text-primary-400 mx-1">→</span> {route.destination}</p><p className="text-[10px] text-surface-500">{route.checkpoints ? `${route.crossed}/${route.checkpoints} checkpoints crossed` : 'No checkpoint telemetry'}</p></td><td className="px-5 py-4 text-right font-bold text-white">{route.trips}</td><td className="px-5 py-4 text-right text-success-400">{route.completed}</td><td className="px-5 py-4 text-right text-surface-200">{formatINR(route.value)}</td><td className="px-5 py-4 text-right font-bold text-info-400">{route.efficiencyPercent}%</td></tr>)}</tbody></table></div>}</section>
    </div>
  )
}

function Metric({ label, value, detail, icon: Icon, color }: { label: string; value: React.ReactNode; detail: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return <div className="card p-4 border-l-4 border-l-primary-500/50"><div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-surface-400">{label}</span><Icon className={`w-4 h-4 ${color}`} /></div><p className={`text-2xl font-black mt-2 ${color}`}>{value}</p><p className="text-[10px] text-surface-400 mt-1">{detail}</p></div>
}

function LoadingState({ label }: { label: string }) { return <div className="card p-16 flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary-400 animate-spin" /><p className="text-xs font-bold uppercase tracking-widest text-surface-400">{label}</p></div> }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="card p-12 text-center space-y-4"><AlertCircle className="w-10 h-10 mx-auto text-danger-400" /><p className="text-white font-bold">Could not load analytics</p><p className="text-xs text-surface-400">{message}</p><button type="button" onClick={onRetry} className="btn-primary inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Retry</button></div> }
function EmptyState() { return <div className="py-16 text-center text-surface-400 text-sm">No trip data in the selected window.</div> }
