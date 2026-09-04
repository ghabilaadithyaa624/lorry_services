'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Truck, Package, MapPin, ArrowRight, Phone, ExternalLink, Sparkles, Filter, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { matchesApi, type MatchRecord, type MatchStatus } from '@/lib/api'
import { Badge } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatINR, formatPhone, whatsappLink } from '@/lib/utils'

interface MatchesPanelProps {
  role?: 'factory_owner' | 'truck_driver'
  compact?: boolean
}

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'primary' | 'success' | 'danger'> = {
  Pending: 'warning',
  Booked: 'primary',
  Completed: 'success',
  Cancelled: 'danger',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  Pending: <Clock className="w-3.5 h-3.5" />,
  Booked: <CheckCircle2 className="w-3.5 h-3.5" />,
  Completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  Cancelled: <XCircle className="w-3.5 h-3.5" />,
}

function MatchStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? 'default'
  return (
    <Badge variant={variant} size="sm" className="font-mono font-bold">
      <span className="inline-flex items-center gap-1">
        {STATUS_ICON[status] ?? null}
        {status}
      </span>
    </Badge>
  )
}

export function MatchesPanel({ role, compact = false }: MatchesPanelProps) {
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'ALL'>('ALL')
  const [radius, setRadius] = useState(50)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const limit = compact ? 5 : 10

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true)
      const res = await matchesApi.getMyMatches({
        status: statusFilter !== 'ALL' ? (statusFilter as MatchStatus) : undefined,
        radius,
        page,
        limit,
      })
      const payload = res.data as any
      // Handle both wrapped {data: {data, total}} and raw array fallback
      if (Array.isArray(payload)) {
        setMatches(payload)
        setTotal(payload.length)
      } else if (payload?.data && Array.isArray(payload.data)) {
        setMatches(payload.data)
        setTotal(payload.total ?? payload.data.length)
      } else if (payload?.data?.data) {
        setMatches(payload.data.data)
        setTotal(payload.data.total ?? 0)
      } else {
        setMatches([])
        setTotal(0)
      }
    } catch (e: any) {
      // Fallback to empty on error (e.g., no matches yet or unauthenticated)
      if (e?.response?.status !== 404) {
        // silent for 404/no matches
      }
      setMatches([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, radius, page, limit])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const handleStatusChange = async (id: string, newStatus: MatchStatus) => {
    try {
      await matchesApi.updateStatus(id, newStatus)
      toast.success(`Match marked as ${newStatus}`)
      fetchMatches()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update match status')
    }
  }

  return (
    <div className="bg-panel rounded-2xl border border-white/10 shadow-modal overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center border border-primary-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {role === 'truck_driver' ? 'Matched Freight Loads' : role === 'factory_owner' ? 'Matched Lorries' : 'Smart Matches'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold">
                ≤ {radius} km
              </span>
            </div>
            <p className="text-xs sm:text-sm text-surface-400 max-w-2xl">
              Backend engine compares <span className="text-surface-200 font-semibold">tonnage</span>,{' '}
              <span className="text-surface-200 font-semibold">route proximity (≤50km)</span> and{' '}
              <span className="text-surface-200 font-semibold">budget</span> between your{' '}
              {role === 'truck_driver' ? 'Need Vehicle' : role === 'factory_owner' ? 'Need Load' : 'Need Load ↔ Need Vehicle'} entries. WhatsApp alerts fire automatically on new high-fit matches.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchMatches}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-surface-200 text-xs font-semibold transition-colors disabled:opacity-60 shrink-0 cursor-pointer"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 mt-4">
          <div className="inline-flex items-center gap-1.5 bg-surface-950 p-1 rounded-xl border border-white/10">
            {(['ALL', 'Pending', 'Booked', 'Completed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s as any)
                  setPage(1)
                }}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  statusFilter === s ? 'bg-primary-500 text-white shadow-glow-primary' : 'text-surface-400 hover:text-white',
                )}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 bg-surface-950 rounded-xl border border-white/10 px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs font-semibold text-surface-300">Proximity</span>
            <select
              value={radius}
              onChange={(e) => {
                setRadius(parseInt(e.target.value, 10))
                setPage(1)
              }}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-surface-950">10 km</option>
              <option value={25} className="bg-surface-950">25 km</option>
              <option value={50} className="bg-surface-950">50 km (max)</option>
            </select>
          </div>

          <span className="text-xs text-surface-400 font-mono">
            {total} match{total === 1 ? '' : 'es'} • WhatsApp auto-trigger on <span className="text-emerald-300 font-semibold">Pending</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-xl bg-surface-950/60 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-10 sm:py-12 space-y-3 bg-surface-950/60 rounded-2xl border border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto border border-primary-500/20">
              {role === 'truck_driver' ? <Package className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} matches within {radius} km</h3>
            <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto">
              {role === 'truck_driver'
                ? 'Post a Need Vehicle or update your truck location to discover nearby freight within 50km.'
                : 'Post a Need Load to trigger tonnage/route/budget matching and receive WhatsApp alerts when a verified lorry is within 50km.'}
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Link
                href={role === 'truck_driver' ? '/my-trucks' : '/post-load'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-colors"
              >
                <span>{role === 'truck_driver' ? 'View My Trucks' : 'Post Need Load'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-surface-200 text-xs font-semibold transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-primary-400" />
                <span>Open Marketplace</span>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.map((m) => {
              const isLoadOwnerView = role === 'factory_owner'
              const counterpart = isLoadOwnerView ? m.truck : m.load
              const primaryTitle = isLoadOwnerView
                ? m.truck?.registrationNumber || `TRUCK-${m.truckId.slice(0, 6).toUpperCase()}`
                : `${m.load?.loadingAddress?.split(',')[0] ?? 'Load'} → ${m.load?.unloadingAddress?.split(',')[0] ?? 'Destination'}`
              const subtitle = isLoadOwnerView
                ? `${m.truck?.bodyType ?? 'Open'} • ${m.truck?.tonnageCapacity ?? '?'}T • ${Number(m.distanceKm ?? 0).toFixed(1)} km away`
                : `${m.load?.tonnageRequired ?? '?'}T • ${m.load?.truckType ?? 'Open'} • ${m.load?.maxPrice ? formatINR(Number(m.load.maxPrice)) : 'Open budget'}`
              const phone = isLoadOwnerView ? m.truck?.user?.phone : m.load?.user?.phone
              const name = isLoadOwnerView ? m.truck?.user?.name : m.load?.user?.name
              const score = m.matchScore ?? m.computedMatch?.score ?? 72
              const reasons = m.computedMatch?.reasons ?? []
              const distanceKm = Number(m.distanceKm ?? 0).toFixed(1)

              return (
                <li
                  key={m.id}
                  className="p-4 sm:p-5 rounded-2xl bg-surface-950/80 border border-white/5 hover:border-white/10 transition-colors space-y-3 shadow-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
                        {isLoadOwnerView ? <Truck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm sm:text-base truncate">{primaryTitle}</span>
                          <MatchStatusBadge status={m.status} />
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 text-xs font-mono font-bold">
                            <Sparkles className="w-3 h-3" />
                            {score}% match
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-surface-300 font-medium truncate">{subtitle}</p>
                        {m.load && m.truck && (
                          <p className="text-xs text-surface-400">
                            <span className="font-semibold text-surface-300">{m.load.loadingAddress}</span>
                            <span className="mx-1.5 text-primary-400">→</span>
                            <span className="font-semibold text-surface-300">{m.load.unloadingAddress}</span>
                            <span className="mx-2">•</span>
                            <span className="font-mono">{distanceKm} km • within 50km</span>
                            {m.tonnageCompatible !== undefined && (
                              <span className={cn('ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold border', m.tonnageCompatible ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20')}>
                                Tonnage {m.tonnageCompatible ? 'OK' : 'mismatch'}
                              </span>
                            )}
                            {m.budgetCompatible !== undefined && (
                              <span className={cn('ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border', m.budgetCompatible ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20')}>
                                Budget {m.budgetCompatible ? 'OK' : 'tight'}
                              </span>
                            )}
                          </p>
                        )}
                        {reasons.length > 0 && !compact && (
                          <p className="text-xs text-surface-400 line-clamp-2">
                            {reasons.slice(0, 2).join(' • ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 self-start">
                      <select
                        value={m.status}
                        onChange={(e) => handleStatusChange(m.id, e.target.value as MatchStatus)}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-900 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Booked">Booked</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <span className="text-[11px] font-mono text-surface-400">
                        {new Date(m.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Contact & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                      {phone ? (
                        <>
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-200 border border-emerald-500/20 text-xs font-mono font-bold">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            {formatPhone(phone)} {name ? `(${name})` : ''}
                          </span>
                          <a
                            href={whatsappLink(phone, `Hi ${name ?? 'there'}, your LorryCarry match ${m.id.slice(0, 8)} is ${m.status}. Dist ${distanceKm}km • Score ${score}%`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-surface-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          Contact masked — unlock via subscription or booking
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link
                        href={`/booking/${m.bookingId ?? ''}`}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors',
                          m.status === 'Booked' || m.status === 'Completed'
                            ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-glow-primary'
                            : 'bg-surface-900 hover:bg-surface-800 border border-white/10 text-surface-200',
                        )}
                      >
                        <span>{m.status === 'Pending' ? 'View & Book' : m.status === 'Booked' ? 'Track Trip' : 'View POD'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-xl bg-surface-900 border border-white/10 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-surface-400">
              Page {page} • {total} total
            </span>
            <button
              type="button"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 rounded-xl bg-surface-900 border border-white/10 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchesPanel
