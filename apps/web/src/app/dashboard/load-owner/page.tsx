'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArchiveBoxIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  SparklesIcon,
  ArrowsUpDownIcon,
  ScaleIcon,
  MapPinIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import {
  Badge,
  Button,
  GlassPanel,
  TelemetryMetric,
  StatusDot,
  AlertBanner,
  Skeleton,
} from '@/components/ui'
import {
  MatchScoreBadge,
  FreightRateEstimatorCard,
  OperationalEmptyState,
} from '@/components/intelligence'
import {
  calculateMatchScore,
  deriveOperationalTasks,
  sortMarketplaceItems,
  MatchSortOption,
} from '@/lib/intelligence'
import { cn, formatINR, timeAgo } from '@/lib/utils'

interface LoadItem {
  id: string
  loadingAddress: string
  loadingPin?: string
  loadingLat?: number
  loadingLng?: number
  unloadingAddress: string
  unloadingPin?: string
  unloadingLat?: number
  unloadingLng?: number
  truckType: 'Open' | 'Container' | 'OpenBody'
  tonnageRequired: number
  maxPrice?: number
  status: 'Open' | 'Matched' | 'InTransit' | 'Completed' | 'Cancelled'
  createdAt: string
  _count?: { bookings: number }
}

interface NearbyTruckItem {
  id: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  tonnageCapacity: number
  distanceKm: number
  verificationStatus: 'Verified' | 'Pending' | 'Rejected'
}

export default function LoadOwnerDashboard() {
  const [loads, setLoads] = useState<LoadItem[]>([])
  const [nearbyTrucks, setNearbyTrucks] = useState<NearbyTruckItem[]>([])
  const [hasSubscription, setHasSubscription] = useState<boolean>(true)
  const [user, setUser] = useState<{ name?: string; phone?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [recSortBy, setRecSortBy] = useState<MatchSortOption>('BEST_MATCH')
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // Ignore user parse errors
    }

    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [loadsRes, subRes] = await Promise.allSettled([
        api.get('/loads/my-loads'),
        api.get('/search/subscription-status'),
      ])

      let userLoads: LoadItem[] = []
      if (loadsRes.status === 'fulfilled') {
        userLoads = loadsRes.value.data || []
        setLoads(userLoads)
      }

      if (subRes.status === 'fulfilled') {
        setHasSubscription(Boolean(subRes.value.data?.hasSubscription))
      }

      const openLoad = userLoads.find((l) => l.status === 'Open' || (l.status as string) === 'Open')
      if (openLoad && openLoad.loadingLat && openLoad.loadingLng) {
        try {
          const trucksRes = await api.get(
            `/search/trucks?lat=${openLoad.loadingLat}&lng=${openLoad.loadingLng}&radius=100`
          )
          setNearbyTrucks(trucksRes.data || [])
        } catch {
          setNearbyTrucks([])
        }
      }
    } catch {
      setLoads([])
    } finally {
      setLoading(false)
    }
  }

  // Real metric aggregations from API payload
  const activeCount = loads.filter((l) => l.status === 'Open' || l.status === 'Matched').length
  const inTransitCount = loads.filter((l) => l.status === 'InTransit').length
  const completedCount = loads.filter((l) => l.status === 'Completed').length
  const openCount = loads.filter((l) => l.status === 'Open').length
  const matchedCount = loads.filter((l) => l.status === 'Matched').length
  const cancelledCount = loads.filter((l) => l.status === 'Cancelled').length
  const totalBids = loads.reduce((acc, curr) => acc + (curr._count?.bookings || 0), 0)
  const totalSpending = loads.reduce((acc, curr) => acc + (Number(curr.maxPrice) || 0), 0)

  const statusVariantMap: Record<string, 'success' | 'warning' | 'info' | 'default' | 'danger'> = {
    Open: 'success',
    Matched: 'info',
    InTransit: 'warning',
    Completed: 'default',
    Cancelled: 'danger',
  }

  const activeFocusLoad = loads.find((l) => l.status === 'Open') || loads[0]

  const operationalTasks = deriveOperationalTasks({
    userRole: 'load_owner',
    loads: loads.map((l) => ({
      id: l.id,
      status: l.status,
      tonnageRequired: l.tonnageRequired,
      loadingAddress: l.loadingAddress,
    })),
    hasSubscription,
  })

  const evaluatedTrucks = nearbyTrucks.map((t) => {
    const match = activeFocusLoad
      ? calculateMatchScore(activeFocusLoad, {
          id: t.id,
          bodyType: t.bodyType,
          tonnageCapacity: t.tonnageCapacity,
          distanceKm: t.distanceKm,
          verificationStatus: t.verificationStatus,
        })
      : undefined

    return {
      ...t,
      match,
    }
  })

  const sortedTrucks = sortMarketplaceItems(
    evaluatedTrucks,
    recSortBy,
    activeFocusLoad?.tonnageRequired
  )

  return (
    <DashboardLayout
      title="Shipper freight cockpit"
      subtitle="Cargo lifecycle tracking, matched lorry intelligence, booking pipeline, and spend analytics."
    >
      <div className="space-y-6">

        {/* ── 1. PAGE HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <StatusDot variant="active" pulse />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-400 font-sans">
                Network online
              </span>
              <Badge variant="primary" size="sm" className="text-[10px]">
                Load owner
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight text-white leading-tight font-sans">
              Good morning, {user?.name || user?.phone || 'Shipper'}
            </h1>
            <p className="text-sm text-surface-400 font-sans">
              Direct freight marketplace · Zero broker commissions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/post-load')}
              leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
              className="shadow-glow-primary"
            >
              Post freight
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/search?type=truck')}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
              className="border-white/10"
            >
              Find trucks
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => router.push('/my-loads')}
              leftIcon={<CalendarDaysIcon className="w-4 h-4 shrink-0 text-surface-400" />}
              className="text-surface-300 hover:text-white"
            >
              View bookings
            </Button>
          </div>
        </div>

        {/* ── 2. FREIGHT TELEMETRY — 4 col, no truncation ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryMetric
            label="Active loads"
            value={loading ? <Skeleton className="h-8 w-12" /> : activeCount}
            subtitle="Open & matched"
            classification="REAL METRIC"
            variant="primary"
          />
          <TelemetryMetric
            label="Nearby trucks"
            value={loading ? <Skeleton className="h-8 w-12" /> : nearbyTrucks.length}
            subtitle="Within 100 km"
            classification="REAL METRIC"
            variant="info"
          />
          <TelemetryMetric
            label="In transit"
            value={loading ? <Skeleton className="h-8 w-12" /> : inTransitCount}
            subtitle="Live consignments"
            classification="REAL METRIC"
            variant="warning"
          />
          <TelemetryMetric
            label="Completed"
            value={loading ? <Skeleton className="h-8 w-12" /> : completedCount}
            subtitle="POD verified"
            classification="REAL METRIC"
            variant="success"
          />
        </div>

        {/* ── 3. OPERATIONAL ALERTS ── */}
        <div className="space-y-2">
          {operationalTasks.length > 0 ? (
            operationalTasks.map((task) => (
              <AlertBanner
                key={task.id}
                variant={task.urgency === 'HIGH' ? 'danger' : task.urgency === 'MEDIUM' ? 'warning' : 'info'}
                title={task.title}
                action={
                  <Button variant="secondary" size="sm" onClick={() => router.push(task.actionUrl)}>
                    {task.actionLabel}
                  </Button>
                }
              >
                {task.description}
              </AlertBanner>
            ))
          ) : (
            <AlertBanner variant="success" title="All clear">
              No operational actions require your attention. All cargo requirements are on track.
            </AlertBanner>
          )}
        </div>

        {/* ── 4. ACTIVE FREIGHT ── */}
        <GlassPanel padding="lg" className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <ArchiveBoxIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-[15px] font-semibold text-white font-sans">
                Active freight
              </h2>
              <span className="text-sm text-surface-500 font-sans">{loads.length} loads</span>
            </div>
            <Link
              href="/my-loads"
              className="text-xs font-semibold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1 font-sans"
            >
              View all
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : loads.length === 0 ? (
            <OperationalEmptyState
              role="load_owner"
              title="No freight posted yet"
              description="Post your freight tonnage and loading details to activate smart 50 km proximity matching with verified transporters."
              actionLabel="Post freight load"
              actionHref="/post-load"
              secondaryActionLabel="Explore available lorries"
              secondaryActionHref="/search?type=truck"
            />
          ) : (
            <div className="space-y-3">
              {loads.slice(0, 5).map((l) => {
                const stages = ['Posted', 'Matched', 'Booked', 'In transit', 'Completed']
                const currentStageIndex =
                  l.status === 'Open'
                    ? 0
                    : l.status === 'Matched'
                    ? 1
                    : l.status === 'InTransit'
                    ? 3
                    : l.status === 'Completed'
                    ? 4
                    : 0

                return (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl bg-surface-950/80 border border-white/8 space-y-3 hover:border-white/20 transition-all"
                  >
                    {/* Load header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" size="sm">
                            <span className="font-mono">LOAD-{l.id.slice(0, 8).toUpperCase()}</span>
                          </Badge>
                          <Badge variant={statusVariantMap[l.status] || 'default'} size="sm">
                            {l.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-white font-sans mt-1.5">
                          {l.loadingAddress}
                          <span className="text-primary-400 mx-2">→</span>
                          {l.unloadingAddress}
                        </p>
                      </div>
                      <span className="text-[15px] font-bold text-emerald-400 font-mono shrink-0">
                        {l.maxPrice ? formatINR(Number(l.maxPrice)) : 'Open target'}
                      </span>
                    </div>

                    {/* Load metadata row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-400 font-sans">
                      <span>
                        <span className="text-surface-500">Tonnage</span>
                        <span className="text-white font-mono ml-1">{l.tonnageRequired} T</span>
                      </span>
                      <span>
                        <span className="text-surface-500">Type</span>
                        <span className="text-white ml-1">{l.truckType}</span>
                      </span>
                      <span>
                        <span className="text-surface-500">Quotes</span>
                        <span className="text-white font-mono ml-1">{l._count?.bookings || 0}</span>
                      </span>
                      <span>
                        <span className="text-surface-500">Posted</span>
                        <span className="text-white ml-1">{timeAgo(l.createdAt)}</span>
                      </span>
                    </div>

                    {/* Stage pipeline */}
                    <div className="flex items-center gap-1 pt-1 overflow-x-auto scrollbar-none">
                      {stages.map((stage, idx) => {
                        const isPassed = idx < currentStageIndex
                        const isCurrent = idx === currentStageIndex
                        return (
                          <div key={stage} className="flex items-center gap-1 shrink-0">
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-sans transition-all',
                                isCurrent
                                  ? 'bg-primary-500 text-white'
                                  : isPassed
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-surface-900 text-surface-500'
                              )}
                            >
                              {stage}
                            </span>
                            {idx < stages.length - 1 && (
                              <span className={cn('text-[9px]', isPassed ? 'text-emerald-400' : 'text-surface-700')}>›</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassPanel>

        {/* ── 5. BOOKING PIPELINE & SPEND ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Booking Pipeline */}
          <div className="lg:col-span-7">
            <GlassPanel padding="lg" className="space-y-5 h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <CalendarDaysIcon className="w-5 h-5 text-primary-400" />
                  <h3 className="text-[15px] font-semibold text-white font-sans">Booking pipeline</h3>
                </div>
                <Badge variant="primary" size="sm">{loads.length} total</Badge>
              </div>

              <div className="grid grid-cols-5 gap-3 text-center flex-1">
                {[
                  { label: 'Open', value: openCount, color: 'text-emerald-400' },
                  { label: 'Matched', value: matchedCount, color: 'text-sky-400' },
                  { label: 'Quotes', value: totalBids, color: 'text-primary-400' },
                  { label: 'In transit', value: inTransitCount, color: 'text-amber-400' },
                  { label: 'Cancelled', value: cancelledCount, color: 'text-danger-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1.5 flex flex-col items-center justify-center">
                    <span className={cn('text-2xl font-bold font-mono', color)}>{value}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 font-sans">{label}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => router.push('/my-loads')}
                className="border-white/10 mt-auto"
              >
                Manage all bookings
              </Button>
            </GlassPanel>
          </div>

          {/* Freight Spend Summary */}
          <div className="lg:col-span-5">
            <GlassPanel padding="lg" className="space-y-5 h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <BanknotesIcon className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-[15px] font-semibold text-white font-sans">Freight spend</h3>
                </div>
                <Badge variant="success" size="sm">Zero broker fees</Badge>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 space-y-2 flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-400 font-sans block">
                  Total budget committed
                </span>
                <span className="text-3xl font-bold text-white font-mono block">{formatINR(totalSpending)}</span>
                <p className="text-xs text-surface-400 leading-relaxed font-sans">
                  Direct marketplace dispatches eliminate middleman broker commissions across all active freight corridors.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => router.push('/analytics')}
                className="text-primary-400 hover:text-white mt-auto"
              >
                View full analytics
              </Button>
            </GlassPanel>
          </div>
        </div>

        {/* ── 6. MATCHED TRUCKS & RATE INTELLIGENCE ── */}
        {activeFocusLoad && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Rate Estimator */}
            <div className="lg:col-span-5 space-y-4">
              <FreightRateEstimatorCard
                input={{
                  tonnage: Number(activeFocusLoad.tonnageRequired) || 10,
                  truckType: activeFocusLoad.truckType || 'Open',
                  loadingLat: activeFocusLoad.loadingLat,
                  loadingLng: activeFocusLoad.loadingLng,
                  unloadingLat: activeFocusLoad.unloadingLat,
                  unloadingLng: activeFocusLoad.unloadingLng,
                }}
              />
            </div>

            {/* Matched Trucks */}
            <div className="lg:col-span-7">
              <GlassPanel padding="lg" className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <SparklesIcon className="w-5 h-5 text-primary-400" />
                    <h3 className="text-[15px] font-semibold text-white font-sans">Nearby trucks</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <ArrowsUpDownIcon className="w-3.5 h-3.5 text-surface-400" />
                    <select
                      value={recSortBy}
                      onChange={(e) => setRecSortBy(e.target.value as MatchSortOption)}
                      className="px-2.5 py-1 bg-surface-950/80 border border-white/10 rounded-xl text-xs font-sans font-semibold text-white outline-none focus:border-primary-500"
                    >
                      <option value="BEST_MATCH">Best match</option>
                      <option value="NEAREST">Nearest</option>
                      <option value="CAPACITY_FIT">Capacity fit</option>
                      <option value="VERIFIED">Verified</option>
                    </select>
                  </div>
                </div>

                {/* Focus load context */}
                <div className="p-3 rounded-xl bg-surface-950/80 border border-white/5 text-xs font-sans">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-semibold leading-snug min-w-0">
                      {activeFocusLoad.loadingAddress}
                      <span className="text-primary-400 mx-1.5">→</span>
                      {activeFocusLoad.unloadingAddress}
                    </p>
                    <Badge variant="primary" size="sm" className="shrink-0">
                      <span className="font-mono">{activeFocusLoad.tonnageRequired}T</span>
                      <span className="ml-1">{activeFocusLoad.truckType}</span>
                    </Badge>
                  </div>
                </div>

                {/* Truck list */}
                <div className="space-y-2 flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">
                    {sortedTrucks.length > 0
                      ? `${sortedTrucks.length} compatible lorries within 100 km`
                      : 'Searching national corridor for verified lorries…'}
                  </span>

                  {sortedTrucks.length > 0 ? (
                    sortedTrucks.slice(0, 3).map((t) => {
                      const match = t.match!
                      return (
                        <div
                          key={t.id}
                          className="p-3 rounded-xl bg-surface-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/15 transition-all"
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white font-sans">
                                <span className="font-mono">{t.tonnageCapacity}T</span> {t.bodyType}
                              </span>
                              {match && <MatchScoreBadge match={match} />}
                            </div>

                            {match && (
                              <div className="flex flex-wrap gap-2 text-xs text-surface-400 font-sans">
                                <span className="flex items-center gap-1">
                                  <ScaleIcon className="w-3 h-3 text-emerald-400" />
                                  {match.factors.capacity.value}
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3 text-blue-400" />
                                  {match.factors.proximity.value}
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <ShieldCheckIcon className="w-3 h-3 text-purple-400" />
                                  {match.factors.verification.value}
                                </span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/search?type=truck&location=${encodeURIComponent(
                                  activeFocusLoad.loadingAddress
                                )}`
                              )
                            }
                            className="shrink-0 border-white/10"
                          >
                            View
                          </Button>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-surface-400 text-center py-4 font-sans">
                      Explore verified trucks active along this highway corridor.
                    </p>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => router.push('/search?type=truck')}
                  className="mt-auto border-white/10"
                >
                  Explore all verified lorries
                </Button>
              </GlassPanel>
            </div>
          </div>
        )}

        {/* ── 7. RECENT ACTIVITY ── */}
        <GlassPanel padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-[15px] font-semibold text-white font-sans">Recent activity</h3>
            <span className="text-xs text-surface-500 font-sans">Live operational feed</span>
          </div>

          {loads.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6 font-sans">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {loads.slice(0, 4).map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-surface-950/60 border border-white/5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white font-sans">
                        {l.loadingAddress}
                        <span className="text-primary-400 mx-1.5">→</span>
                        {l.unloadingAddress}
                      </p>
                      <span className="text-xs text-surface-400 font-sans">
                        <span className="font-mono">{l.tonnageRequired} T</span>
                        {' · '}{l.truckType}
                        {' · '}{timeAgo(l.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Badge variant={statusVariantMap[l.status] || 'default'} size="sm" className="shrink-0">
                    {l.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

      </div>
    </DashboardLayout>
  )
}
