'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  PlusCircleIcon,
  TrashIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { api, usersApi, loadsApi, matchesApi } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import {
  Badge,
  Button,
  GlassPanel,
  TelemetryMetric,
  Skeleton,
  ConfirmDialog,
} from '@/components/ui'
import { OperationalEmptyState } from '@/components/intelligence'
import { MatchesPanel } from '@/components/matching/MatchesPanel'
import { EditLoadModal } from '@/components/freight/EditLoadModal'
import { toast } from '@/lib/toast'
import { cn, formatINR, timeAgo, formatPhone, whatsappLink } from '@/lib/utils'

interface Load {
  id: string
  userId?: string
  tonnageRequired: number
  loadingAddress: string
  loadingPin?: string | null
  unloadingAddress: string
  unloadingPin?: string | null
  truckType: string
  status: 'Open' | 'Matched' | 'Assigned' | 'Booked' | 'Pickup' | 'InTransit' | 'Delivered' | 'Completed' | 'Cancelled'
  urgent: boolean
  maxPrice?: number | null
  minLengthFt?: number | null
  minHeightFt?: number | null
  expectedDeliveryAt?: string | null
  distanceKm?: number
  createdAt: string
  _count?: { bookings: number }
}

const LIFECYCLE_STAGES = [
  { key: 'POSTED', label: 'Posted', statuses: ['Open'] },
  { key: 'MATCHED', label: 'Matched', statuses: ['Matched'] },
  { key: 'BOOKED', label: 'Booked', statuses: ['Assigned', 'Booked'] },
  { key: 'IN_TRANSIT', label: 'In transit', statuses: ['Pickup', 'InTransit'] },
  { key: 'COMPLETED', label: 'Done', statuses: ['Delivered', 'Completed'] },
]

function getStageIndex(status: string): number {
  if (status === 'Open') return 0
  if (status === 'Matched') return 1
  if (status === 'Assigned' || status === 'Booked') return 2
  if (status === 'Pickup' || status === 'InTransit') return 3
  if (status === 'Delivered' || status === 'Completed') return 4
  return 0
}

function FreightLifecycleTimeline({ status }: { status: string }) {
  if (status === 'Cancelled') {
    return (
      <div className="p-3 rounded-xl bg-danger-950/40 border border-danger-900/60 text-danger-300 text-xs font-sans font-semibold flex items-center gap-2">
        <span>Freight requirement cancelled</span>
      </div>
    )
  }

  const currentStageIndex = getStageIndex(status)

  return (
    <div className="w-full space-y-2 pt-2">
      <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-surface-400 mb-1.5">
        <span>Progress</span>
        <span className="text-primary-400">
          {LIFECYCLE_STAGES[currentStageIndex].label}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isPassed = idx <= currentStageIndex
          const isCurrent = idx === currentStageIndex

          return (
            <div key={stage.key} className="space-y-1">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  isCurrent
                    ? 'bg-primary-500 shadow-glow-primary ring-1 ring-primary-400'
                    : isPassed
                    ? 'bg-emerald-500'
                    : 'bg-surface-950 border border-white/5'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-sans font-semibold block text-center truncate',
                  isCurrent
                    ? 'text-primary-400'
                    : isPassed
                    ? 'text-emerald-400'
                    : 'text-surface-600'
                )}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MyLoadsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loads, setLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedMatches, setExpandedMatches] = useState<Record<string, { loading: boolean; items: any[] }>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingLoad, setEditingLoad] = useState<Load | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Load | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Your freight load was published successfully!')
    }
  }, [searchParams])

  useEffect(() => {
    fetchLoads()
    // Resolve the signed-in user id so action buttons render only for own loads.
    usersApi
      .getProfile()
      .then((res) => setCurrentUserId(res.data?.id ?? null))
      .catch(() => setCurrentUserId(null))
  }, [])

  const fetchLoads = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/loads/my-loads')
      setLoads(res.data || [])
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch loads'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Owner gate — `/loads/my-loads` only returns the signed-in user's posts, but
   * the Edit/Delete controls stay hidden unless the row provably belongs to the
   * current user (defence in depth alongside the server-side check).
   */
  const canManage = (load: Load) => !load.userId || !currentUserId || load.userId === currentUserId

  const canEdit = (load: Load) => canManage(load) && load.status === 'Open'

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await loadsApi.deleteLoad(deleteTarget.id)
      setLoads((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      toast.success('Load removed successfully')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete load')
    } finally {
      setDeleteBusy(false)
    }
  }

  const toggleMatches = async (loadId: string) => {
    if (expandedMatches[loadId]) {
      setExpandedMatches((prev) => {
        const copy = { ...prev }
        delete copy[loadId]
        return copy
      })
      return
    }
    setExpandedMatches((prev) => ({ ...prev, [loadId]: { loading: true, items: [] } }))
    try {
      const res = await matchesApi.getMatchesForLoad(loadId, 50)
      const items = Array.isArray(res.data) ? res.data : []
      setExpandedMatches((prev) => ({ ...prev, [loadId]: { loading: false, items } }))
      if (items.length === 0) toast.info('No verified lorries within 50 km for this Need Load — try adjusting tonnage or budget')
      // Also trigger persisted evaluation (WhatsApp) in background
      matchesApi.evaluateForLoad(loadId, 50).catch(() => null)
    } catch (err: any) {
      setExpandedMatches((prev) => ({ ...prev, [loadId]: { loading: false, items: [] } }))
      toast.error(err?.response?.data?.message || 'Failed to fetch matches')
    }
  }

  // Telemetry Aggregations
  const totalCount = loads.length
  const openCount = loads.filter((l) => l.status === 'Open').length
  const inTransitCount = loads.filter((l) => l.status === 'InTransit' || (l.status as string) === 'Pickup').length
  const completedCount = loads.filter((l) => l.status === 'Completed' || (l.status as string) === 'Delivered').length

  const filteredLoads = loads.filter((load) => {
    if (activeFilter !== 'ALL' && load.status !== activeFilter) {
      if (activeFilter === 'Booked' && (load.status === 'Assigned' || load.status === 'Booked')) {
        // match
      } else if (activeFilter === 'InTransit' && (load.status === 'InTransit' || load.status === 'Pickup')) {
        // match
      } else if (activeFilter === 'Completed' && (load.status === 'Completed' || load.status === 'Delivered')) {
        // match
      } else {
        return false
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const idStr = load.id.toLowerCase()
      const origin = (load.loadingAddress || '').toLowerCase()
      const dest = (load.unloadingAddress || '').toLowerCase()
      return idStr.includes(q) || origin.includes(q) || dest.includes(q)
    }

    return true
  })

  return (
    <DashboardLayout
      title="My loads"
      subtitle="Live cargo lifecycle tracking, matched lorries, and direct quotes."
      action={
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/post-load')}
          leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
          className="shadow-glow-primary"
        >
          Post freight
        </Button>
      }
    >
      <div className="space-y-6 font-sans max-w-7xl mx-auto">
        
        {/* ── LOAD TELEMETRY — 4 col ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryMetric
            label="Total loads"
            value={loading ? <Skeleton className="h-8 w-12" /> : totalCount}
            subtitle="All freight"
            classification="REAL METRIC"
            variant="primary"
          />
          <TelemetryMetric
            label="Open"
            value={loading ? <Skeleton className="h-8 w-12" /> : openCount}
            subtitle="Broadcasting"
            classification="REAL METRIC"
            variant="info"
          />
          <TelemetryMetric
            label="In transit"
            value={loading ? <Skeleton className="h-8 w-12" /> : inTransitCount}
            subtitle="Live corridor"
            classification="REAL METRIC"
            variant="warning"
          />
          <TelemetryMetric
            label="Completed"
            value={loading ? <Skeleton className="h-8 w-12" /> : completedCount}
            subtitle="POD confirmed"
            classification="REAL METRIC"
            variant="success"
          />
        </div>

        {/* ── SEARCH & FILTER TOOLBAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel p-4 rounded-2xl border border-white/10 shadow-card">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by load ID, origin, destination…"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-white/10 rounded-xl text-white text-sm font-sans focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {['ALL', 'Open', 'Matched', 'Booked', 'InTransit', 'Completed', 'Cancelled'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all whitespace-nowrap cursor-pointer',
                  activeFilter === f
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-950/80 border border-white/10 text-surface-400 hover:text-white hover:bg-white/5'
                )}
              >
                {f === 'ALL' ? 'All' : f === 'InTransit' ? 'In transit' : f}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5b. Global Smart Matches (both dashboards) — Pending/Booked/Completed with ≤50km & WhatsApp ── */}
        <MatchesPanel role="factory_owner" compact />

        {/* ── LOADS LIST / CARDS ── */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        ) : error ? (
          <GlassPanel padding="lg" className="text-center space-y-3">
            <div className="p-4 rounded-xl bg-danger-950/40 border border-danger-900/60 text-danger-300 text-sm font-sans font-semibold">
              {error}
            </div>
            <Button variant="secondary" size="sm" onClick={fetchLoads} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              Retry
            </Button>
          </GlassPanel>
        ) : filteredLoads.length === 0 ? (
          <OperationalEmptyState
            role="factory_owner"
            title="No freight posted"
            description="Publish your cargo tonnage and warehouse coordinates to activate direct 50 km proximity matching with verified transporters."
            actionLabel="Post your first load"
            actionHref="/post-load"
            secondaryActionLabel="Explore available lorries"
            secondaryActionHref="/search?type=truck"
          />
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => (
              <GlassPanel key={load.id} padding="lg" className="space-y-4 hover:border-white/20 transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary" size="sm">
                        <span className="font-mono">LOAD-{load.id.slice(0, 8).toUpperCase()}</span>
                      </Badge>
                      <Badge variant="default" size="sm">
                        {load.status}
                      </Badge>
                      {load.urgent && (
                        <Badge variant="danger" size="sm">
                          Urgent
                        </Badge>
                      )}
                      <span className="text-xs text-surface-500 font-sans">
                        {timeAgo(load.createdAt)}
                      </span>
                    </div>

                    <p className="text-base font-semibold text-white font-sans">
                      {load.loadingAddress}
                      <span className="text-primary-400 mx-2">→</span>
                      {load.unloadingAddress}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-400 font-sans border-t border-white/5 pt-2">
                      <span>
                        <span className="text-surface-500">Tonnage</span>
                        <span className="text-white font-mono ml-1">{load.tonnageRequired} T</span>
                      </span>
                      <span>
                        <span className="text-surface-500">Type</span>
                        <span className="text-white ml-1">{load.truckType}</span>
                      </span>
                      {load.maxPrice && (
                        <span className="text-emerald-400 font-semibold">
                          Target <span className="font-mono">{formatINR(load.maxPrice)}</span>
                        </span>
                      )}
                      {load.distanceKm && (
                        <span>
                          <span className="font-mono">{load.distanceKm} km</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-start">
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-surface-500 font-sans block">Quotes</span>
                      <span className="text-sm font-bold text-primary-400 font-mono">
                        {load._count?.bookings || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleMatches(load.id)}
                        leftIcon={<SparklesIcon className="w-4 h-4" />}
                        className="border-white/10 hover:border-white/20"
                      >
                        {expandedMatches[load.id] ? 'Hide matches' : 'Match lorries ≤50km'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/search?type=truck&location=${encodeURIComponent(load.loadingAddress)}`)}
                        className="border-white/10 hover:border-white/20 hidden sm:inline-flex"
                      >
                        Marketplace
                      </Button>

                      {canEdit(load) && (
                        <button
                          type="button"
                          onClick={() => setEditingLoad(load)}
                          className="p-2 text-surface-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-white/10"
                          title="Edit this load"
                          aria-label={`Edit load ${load.loadingAddress} to ${load.unloadingAddress}`}
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      )}

                      {canEdit(load) && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(load)}
                          className="p-2 text-danger-400 hover:bg-danger-950/40 rounded-xl transition-colors cursor-pointer border border-danger-900/40"
                          title="Delete this load"
                          aria-label={`Delete load ${load.loadingAddress} to ${load.unloadingAddress}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <FreightLifecycleTimeline status={load.status} />

                {/* Per-Load Smart Matches (tonnage/route/budget, ≤50km, WhatsApp, status tags) */}
                {expandedMatches[load.id] && (
                  <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-primary-400" />
                        <span>Matching Need Vehicles ≤50km</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 text-xs font-mono">
                          {expandedMatches[load.id].items.length} match{expandedMatches[load.id].items.length === 1 ? '' : 'es'}
                        </span>
                      </h4>
                      <span className="text-xs text-surface-400 font-mono">WhatsApp auto-triggered on Pending</span>
                    </div>
                    {expandedMatches[load.id].loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : expandedMatches[load.id].items.length === 0 ? (
                      <div className="p-6 rounded-xl bg-surface-950/60 border border-white/5 text-center">
                        <p className="text-sm font-semibold text-surface-300">No verified lorries within 50 km for this tonnage & budget</p>
                        <p className="text-xs text-surface-400 mt-1">Matching checks tonnage (truck ≥ load), route proximity ≤50km, and budget (maxPrice ≥ estimate).</p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {expandedMatches[load.id].items.map((m: any) => {
                          const truck = m.truck
                          const match = m.match
                          const dist = Number(m.distanceKm ?? match?.distanceKm ?? 0).toFixed(1)
                          const score = match?.score ?? 70
                          const isPending = true
                          return (
                            <li key={truck.id} className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-white text-sm">{truck.registrationNumber || truck.id.slice(0, 8)}</span>
                                  <Badge variant={isPending ? 'warning' : 'primary'} size="sm">Pending</Badge>
                                  <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 text-xs font-mono font-bold">{score}% match</span>
                                  <span className="text-xs font-mono text-surface-400">{dist} km • ≤50km</span>
                                </div>
                                <p className="text-xs text-surface-400">
                                  {truck.bodyType} • {truck.tonnageCapacity}T • {truck.verificationStatus} • {match?.factors?.capacity?.detail ?? ''} • {match?.factors?.budget?.detail ?? ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                {truck.ownerPhone || truck.user?.phone ? (
                                  <a
                                    href={whatsappLink(truck.ownerPhone || truck.user?.phone, `Hi, your lorry ${truck.registrationNumber} matches my Need Load ${load.loadingAddress} → ${load.unloadingAddress} (${load.tonnageRequired}T, ₹${load.maxPrice ?? 'open'}). Distance ${dist}km, score ${score}%.`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors"
                                  >
                                    WhatsApp
                                  </a>
                                ) : (
                                  <span className="text-xs text-surface-500">Contact locked</span>
                                )}
                                <Button variant="primary" size="sm" onClick={() => router.push(`/search?type=truck`)}>
                                  Book
                                </Button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </GlassPanel>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation gate — destructive and irreversible */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleteBusy ? undefined : setDeleteTarget(null))}
        onConfirm={handleDelete}
        title="Delete this load?"
        destructive
        loading={deleteBusy}
        confirmLabel="Delete load"
        message={
          <>
            This permanently removes{' '}
            <span className="font-semibold text-ink">
              {deleteTarget?.loadingAddress} → {deleteTarget?.unloadingAddress}
            </span>{' '}
            from the marketplace. Nearby lorries will no longer see this freight, and this
            cannot be undone.
          </>
        }
      />

      {/* Owner-only editor for an open load */}
      {editingLoad && (
        <EditLoadModal
          load={editingLoad}
          onClose={() => setEditingLoad(null)}
          onSaved={async () => {
            setEditingLoad(null)
            await fetchLoads()
          }}
        />
      )}
    </DashboardLayout>
  )
}

export default function MyLoadsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <Skeleton.Card />
        </div>
      }
    >
      <MyLoadsContent />
    </Suspense>
  )
}
