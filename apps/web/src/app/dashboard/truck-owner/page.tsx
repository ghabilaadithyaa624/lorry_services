'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  TruckIcon,
  ArrowPathIcon,
  ArrowsUpDownIcon,
  ScaleIcon,
  MapPinIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  DocumentCheckIcon,
  ArrowRightIcon,
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
  OperationalEmptyState,
  ReturnLoadOpportunityCard,
} from '@/components/intelligence'
import {
  calculateMatchScore,
  estimateFreightRate,
  deriveOperationalTasks,
  sortMarketplaceItems,
  evaluateBackhaulOpportunities,
  MatchSortOption,
} from '@/lib/intelligence'
import { formatINR } from '@/lib/utils'

interface TruckItem {
  id: string
  registrationNumber: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  currentLat?: number
  currentLng?: number
  serviceableRadiusKm?: number
  preferredDestinations?: string[]
  verificationStatus: 'Pending' | 'Verified' | 'Rejected'
  documents?: Array<{ id: string; type: string; verificationStatus: string }>
}

interface MatchingLoadItem {
  id: string
  tonnageRequired: number
  loadingAddress: string
  loadingPin?: string
  unloadingAddress: string
  unloadingPin?: string
  truckType: 'Open' | 'Container' | 'OpenBody'
  maxPrice?: number
  distanceKm?: number
  createdAt: string
}

export default function TruckOwnerDashboard() {
  const [trucks, setTrucks] = useState<TruckItem[]>([])
  const [matchingLoads, setMatchingLoads] = useState<MatchingLoadItem[]>([])
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
      const [trucksRes, subRes] = await Promise.allSettled([
        api.get('/trucks/my-trucks'),
        api.get('/search/subscription-status'),
      ])

      let userTrucks: TruckItem[] = []
      if (trucksRes.status === 'fulfilled') {
        userTrucks = trucksRes.value.data || []
        setTrucks(userTrucks)
      }

      if (subRes.status === 'fulfilled') {
        setHasSubscription(Boolean(subRes.value.data?.hasSubscription))
      }

      const primaryTruck = userTrucks[0]
      if (primaryTruck && primaryTruck.currentLat && primaryTruck.currentLng) {
        try {
          const loadsRes = await api.get(
            `/search/loads?lat=${primaryTruck.currentLat}&lng=${primaryTruck.currentLng}&radius=150`
          )
          setMatchingLoads(loadsRes.data || [])
        } catch {
          setMatchingLoads([])
        }
      }
    } catch {
      setTrucks([])
    } finally {
      setLoading(false)
    }
  }

  const verifiedCount = trucks.filter((t) => t.verificationStatus === 'Verified').length
  const pendingKYCCount = trucks.filter((t) => t.verificationStatus === 'Pending').length
  const primaryTruck = trucks[0]
  const availableTrucks = trucks.length

  // Deterministic Fleet Utilization = (Verified Active Lorries / Total Fleet Size) * 100
  const fleetUtilization = trucks.length > 0 ? `${Math.round((verifiedCount / trucks.length) * 100)}%` : '0%'

  const operationalTasks = deriveOperationalTasks({
    userRole: 'truck_owner',
    trucks: trucks.map((t) => ({
      id: t.id,
      registrationNumber: t.registrationNumber,
      verificationStatus: t.verificationStatus,
      documents: t.documents,
    })),
    hasSubscription,
  })

  const evaluatedLoads = matchingLoads.map((load) => {
    const match = primaryTruck
      ? calculateMatchScore(
          {
            id: load.id,
            tonnageRequired: load.tonnageRequired,
            loadingAddress: load.loadingAddress,
            unloadingAddress: load.unloadingAddress,
            truckType: load.truckType,
          },
          {
            id: primaryTruck.id,
            bodyType: primaryTruck.bodyType,
            tonnageCapacity: primaryTruck.tonnageCapacity,
            distanceKm: load.distanceKm,
            verificationStatus: primaryTruck.verificationStatus,
            preferredDestinations: primaryTruck.preferredDestinations,
          }
        )
      : undefined

    return {
      ...load,
      match,
    }
  })

  const sortedLoads = sortMarketplaceItems(
    evaluatedLoads,
    recSortBy,
    primaryTruck?.tonnageCapacity
  )

  return (
    <DashboardLayout
      title="Transporter fleet cockpit"
      subtitle="Fleet utilization, return load capture, document compliance, and direct shipper dispatches."
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
              <Badge variant="success" size="sm" className="text-[10px]">
                Truck owner
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight text-white leading-tight font-sans">
              Good morning, {user?.name || user?.phone || 'Transporter'}
            </h1>
            <p className="text-sm text-surface-400 font-sans">
              Direct transporter fleet command · Zero broker commissions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/my-trucks')}
              leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
              className="shadow-glow-primary"
            >
              Add truck
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/search?type=load')}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
              className="border-white/10"
            >
              Find loads
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => router.push('/search?type=load')}
              className="text-surface-300 hover:text-white"
            >
              View trips
            </Button>
          </div>
        </div>

        {/* ── 2. FLEET TELEMETRY — 4 col ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryMetric
            label="Fleet size"
            value={loading ? <Skeleton className="h-8 w-12" /> : availableTrucks}
            subtitle="Total registered"
            classification="REAL METRIC"
            variant="primary"
          />
          <TelemetryMetric
            label="Vahan verified"
            value={loading ? <Skeleton className="h-8 w-12" /> : verifiedCount}
            subtitle="RTO compliant"
            classification="REAL METRIC"
            variant="success"
          />
          <TelemetryMetric
            label="Nearby loads"
            value={loading ? <Skeleton className="h-8 w-12" /> : matchingLoads.length}
            subtitle="Within 150 km"
            classification="REAL METRIC"
            variant="info"
          />
          <TelemetryMetric
            label="Fleet utilization"
            value={loading ? <Skeleton className="h-8 w-14" /> : fleetUtilization}
            subtitle="Verified capacity"
            classification="REAL METRIC"
            variant="warning"
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
            <AlertBanner variant="success" title="Fleet compliant">
              All registered vehicles and RTO documents are active. Your fleet is fully operational.
            </AlertBanner>
          )}
        </div>

        {/* ── 4. FLEET ROSTER ── */}
        <GlassPanel padding="lg" className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <TruckIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-[15px] font-semibold text-white font-sans">Fleet roster</h2>
              <span className="text-sm text-surface-500 font-sans">{trucks.length} lorries</span>
            </div>
            <Link
              href="/my-trucks"
              className="text-xs font-semibold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1 font-sans"
            >
              Manage fleet
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : trucks.length === 0 ? (
            <OperationalEmptyState
              role="truck_owner"
              title="No lorries registered"
              description="Register your truck vehicle registration, body type, and tonnage capacity to receive direct freight leads without broker cuts."
              actionLabel="Add truck to fleet"
              actionHref="/my-trucks"
              secondaryActionLabel="Get direct transporter pass"
              secondaryActionHref="/subscribe"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trucks.map((t) => {
                const isVerified = t.verificationStatus === 'Verified'
                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-surface-950/80 border border-white/8 space-y-4 hover:border-white/20 transition-all"
                  >
                    {/* Truck identity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-base font-bold text-white font-mono block tracking-wider">
                          {t.registrationNumber}
                        </span>
                        <span className="text-xs text-surface-400 font-sans">
                          <span className="font-mono">{t.tonnageCapacity} T</span> capacity · {t.bodyType}
                        </span>
                      </div>
                      <Badge
                        variant={isVerified ? 'success' : 'warning'}
                        size="sm"
                      >
                        {isVerified ? 'Verified' : 'KYC pending'}
                      </Badge>
                    </div>

                    {/* Truck specs */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-900/80 border border-white/5">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Service radius</span>
                        <strong className="text-sm text-white font-mono">{t.serviceableRadiusKm || 50} km</strong>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Availability</span>
                        <strong className="text-sm text-emerald-400 font-sans">Ready</strong>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-xs text-surface-400 font-sans">
                        Status:{' '}
                        <strong className={isVerified ? 'text-emerald-400' : 'text-amber-400'}>
                          {t.verificationStatus}
                        </strong>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push('/search?type=load')}
                        className="border-white/10"
                      >
                        Find cargo
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassPanel>

        {/* ── 5. DOCUMENT COMPLIANCE ── */}
        <GlassPanel padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <DocumentCheckIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="text-[15px] font-semibold text-white font-sans">Document compliance</h3>
            </div>
            <Badge variant={pendingKYCCount > 0 ? 'warning' : 'success'} size="sm">
              {pendingKYCCount > 0 ? `${pendingKYCCount} pending` : '100% compliant'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">RC registration</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white font-sans">RTO database check</span>
                <Badge variant={verifiedCount > 0 ? 'success' : 'warning'} size="sm">
                  <span className="font-mono">{verifiedCount}/{trucks.length}</span> verified
                </Badge>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Commercial insurance</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white font-sans">Policy validity</span>
                <Badge variant="success" size="sm">Compliant</Badge>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Transporter pass</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white font-sans">{hasSubscription ? 'Unlimited access' : 'Basic tier'}</span>
                <Badge variant={hasSubscription ? 'success' : 'default'} size="sm">
                  {hasSubscription ? 'Active' : 'Free'}
                </Badge>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* ── 6. MATCHING FREIGHT LEADS ── */}
        <GlassPanel padding="lg" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <ArrowPathIcon className="w-5 h-5 text-primary-400" />
                <h2 className="text-[15px] font-semibold text-white font-sans">
                  Available loads
                  <span className="ml-2 text-surface-500 font-normal text-sm">{matchingLoads.length} nearby</span>
                </h2>
              </div>
              <p className="text-xs text-surface-400 mt-1 font-sans">
                Proximity-matched cargo requirements along active highway corridors.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
                <option value="RETURN_LOAD">Return load</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/search?type=load')}
                className="border-white/10"
              >
                Full board
              </Button>
            </div>
          </div>

          {sortedLoads.length > 0 && primaryTruck ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedLoads.slice(0, 6).map((load) => {
                const match = load.match!

                if (recSortBy === 'RETURN_LOAD' || match.isReturnLoad) {
                  const opp = evaluateBackhaulOpportunities(
                    {
                      id: primaryTruck.id || 'truck-primary',
                      bodyType: primaryTruck.bodyType || 'Open',
                      currentLat: primaryTruck.currentLat,
                      currentLng: primaryTruck.currentLng,
                      tonnageCapacity: primaryTruck.tonnageCapacity,
                      verificationStatus: primaryTruck.verificationStatus,
                      preferredDestinations: primaryTruck.preferredDestinations,
                    },
                    [load]
                  )[0]

                  if (opp) {
                    return (
                      <ReturnLoadOpportunityCard
                        key={load.id}
                        opportunity={opp}
                        onConnect={() =>
                          router.push(
                            `/search?type=load&location=${encodeURIComponent(load.loadingAddress)}`
                          )
                        }
                      />
                    )
                  }
                }

                const priceEstimate = estimateFreightRate({
                  tonnage: load.tonnageRequired,
                  truckType: load.truckType,
                })

                return (
                  <div
                    key={load.id}
                    className="p-5 rounded-2xl bg-surface-950/70 border border-white/8 flex flex-col justify-between space-y-4 hover:border-primary-500/30 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Badge row */}
                      <div className="flex items-center justify-between">
                        <Badge variant="primary" size="sm">
                          <span className="font-mono">{load.tonnageRequired}T</span>
                          <span className="ml-1">{load.truckType}</span>
                        </Badge>
                        {match && <MatchScoreBadge match={match} />}
                      </div>

                      {/* Route */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans">Corridor</span>
                        <p className="text-sm font-semibold text-white leading-snug font-sans">
                          {load.loadingAddress}
                          <span className="text-primary-400 mx-1.5">→</span>
                          {load.unloadingAddress}
                        </p>
                      </div>

                      {/* Match factors */}
                      {match && (
                        <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-surface-900/80 border border-white/5 text-xs font-sans">
                          <div className="flex items-center gap-1 text-surface-300">
                            <ScaleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{match.factors.capacity.value}</span>
                          </div>
                          <div className="flex items-center gap-1 text-surface-300">
                            <MapPinIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{match.factors.proximity.value}</span>
                          </div>
                        </div>
                      )}

                      {/* Price row */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-xs text-surface-400 font-sans">
                          {load.distanceKm ? (
                            <span className="font-mono">{load.distanceKm.toFixed(1)} km</span>
                          ) : 'Nearby hub'}
                        </span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          {load.maxPrice
                            ? formatINR(Number(load.maxPrice))
                            : `Est. ${formatINR(priceEstimate.recommendedTarget)}`}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/search?type=load&location=${encodeURIComponent(load.loadingAddress)}`
                        )
                      }
                      className="w-full shadow-glow-primary"
                    >
                      Connect with shipper
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-surface-950/60 border border-white/5 text-center space-y-4">
              <p className="text-sm text-surface-400 max-w-md mx-auto font-sans">
                No active freight loads found at your current coordinates. Search open freight requirements across national corridors.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/search?type=load')}
                className="shadow-glow-primary"
              >
                Search national corridors
              </Button>
            </div>
          )}
        </GlassPanel>

        {/* ── 7. FLEET ACTIVITY LOG ── */}
        <GlassPanel padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-[15px] font-semibold text-white font-sans">Fleet activity</h3>
            <span className="text-xs text-surface-500 font-sans">Live operational feed</span>
          </div>

          {trucks.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6 font-sans">No fleet activity recorded.</p>
          ) : (
            <div className="space-y-2">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-surface-950/60 border border-white/5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <div>
                      <span className="text-sm font-semibold text-white font-sans block">
                        <span className="font-mono">{t.registrationNumber}</span>
                        {' '}· {t.bodyType}
                      </span>
                      <span className="text-xs text-surface-400 font-sans">
                        Radius <span className="font-mono">{t.serviceableRadiusKm || 50} km</span>
                        {' · '}Capacity <span className="font-mono">{t.tonnageCapacity} T</span>
                      </span>
                    </div>
                  </div>
                  <Badge variant={t.verificationStatus === 'Verified' ? 'success' : 'warning'} size="sm" className="shrink-0">
                    {t.verificationStatus}
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
