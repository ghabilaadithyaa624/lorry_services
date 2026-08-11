'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ArrowPathIcon,
  ArrowsUpDownIcon,
  ScaleIcon,
  MapPinIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Badge, Button, Skeleton } from '@/components/ui'
import {
  MatchScoreBadge,
  ActionCenterCard,
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
import { cn, formatINR } from '@/lib/utils'

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
  const [loading, setLoading] = useState(true)
  const [recSortBy, setRecSortBy] = useState<MatchSortOption>('BEST_MATCH')
  const router = useRouter()

  useEffect(() => {
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

      // Fetch matching freight loads for the primary truck's location or corridor
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
  const primaryTruck = trucks[0]

  const stats = [
    {
      label: 'Registered Fleet',
      value: trucks.length,
      icon: TruckIcon,
      color: 'text-primary-600 bg-primary-50 dark:bg-primary-950/40',
    },
    {
      label: 'Verified Lorries',
      value: verifiedCount,
      icon: ShieldCheckIcon,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Matching Freight Leads',
      value: matchingLoads.length,
      icon: SparklesIcon,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Direct Pass Status',
      value: hasSubscription ? 'Active' : 'Free Pass',
      icon: CheckBadgeIcon,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
  ]

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

  // Calculate Match Intelligence for recommended loads
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
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white">
                Transporter Workspace
              </h1>
              <Badge variant="primary" size="sm">
                Smart Match Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
              Find nearby freight, capture return loads at destination hubs, and connect directly with cargo owners.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/search?type=load&sort=RETURN_LOAD')}
              leftIcon={<ArrowPathIcon className="w-4 h-4 shrink-0 text-purple-500" />}
              className="font-bold"
            >
              Find Return Loads
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/search?type=load')}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            >
              Search Loads
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/subscribe')}
              leftIcon={<CheckBadgeIcon className="w-4 h-4 shrink-0" />}
              className="font-bold"
            >
              Direct Transporter Pass
            </Button>
          </div>
        </div>

        {/* Action Center */}
        {operationalTasks.length > 0 && <ActionCenterCard tasks={operationalTasks} />}

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 font-medium">{s.label}</span>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.color)}>
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white font-mono">
                  {loading ? <Skeleton className="h-8 w-12" /> : s.value}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── RETURN LOAD & SMART MATCH FREIGHT RECOMMENDATIONS SECTION ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 sm:p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-100 dark:border-surface-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <ArrowPathIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-surface-900 dark:text-white">
                  Smart Match Freight Recommendations
                </h2>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Proximity-ranked cargo requirements and return haul opportunities matched to your registered lorries.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sorting Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-surface-500 flex items-center gap-1">
                  <ArrowsUpDownIcon className="w-3 h-3" />
                  Sort:
                </span>
                <select
                  value={recSortBy}
                  onChange={(e) => setRecSortBy(e.target.value as MatchSortOption)}
                  className="px-2.5 py-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-900 dark:text-white outline-hidden"
                >
                  <option value="BEST_MATCH">Best Match</option>
                  <option value="NEAREST">Nearest</option>
                  <option value="CAPACITY_FIT">Capacity Fit</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="RETURN_LOAD">Potential Return Load</option>
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/search?type=load')}
                className="text-xs shrink-0"
              >
                Full Load Board
              </Button>
            </div>
          </div>

          {sortedLoads.length > 0 && primaryTruck ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedLoads.slice(0, 6).map((load) => {
                const match = load.match!
                
                // If rendering in RETURN_LOAD mode or if explicitly a return load, render full ReturnLoadOpportunityCard
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
                    className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/80 flex flex-col justify-between space-y-3 hover:shadow-card transition-shadow"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="primary" size="sm">
                          {load.tonnageRequired}T • {load.truckType}
                        </Badge>
                        {match && <MatchScoreBadge match={match} />}
                      </div>

                      <div>
                        <span className="text-[10px] text-surface-400 uppercase font-bold">Route</span>
                        <p className="text-xs font-bold text-surface-900 dark:text-white leading-tight">
                          {load.loadingAddress} ➔ {load.unloadingAddress}
                        </p>
                      </div>

                      {/* Match Factor Pills */}
                      {match && (
                        <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 text-[11px]">
                          <div className="flex items-center gap-1 text-surface-600 dark:text-surface-300">
                            <ScaleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{match.factors.capacity.value}</span>
                          </div>
                          <div className="flex items-center gap-1 text-surface-600 dark:text-surface-300">
                            <MapPinIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{match.factors.proximity.value}</span>
                          </div>
                          {match.isReturnLoad && (
                            <div className="col-span-2 flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                              <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>Potential Return Load</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-200/60 dark:border-surface-700">
                        <span className="text-surface-500 font-medium">
                          {load.distanceKm ? `${load.distanceKm.toFixed(1)} km away` : 'Nearby hub'}
                        </span>
                        <span className="font-bold text-primary-600 dark:text-primary-400">
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
                      className="w-full text-xs font-bold py-2"
                    >
                      Connect with Shipper
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60 dark:border-surface-700 text-center space-y-3">
              <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 max-w-md mx-auto">
                No active freight loads found immediately at your vehicle GPS coordinates. Search open freight requirements across national corridors.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/search?type=load')}
                className="font-bold text-xs"
              >
                Search National Freight Corridors
              </Button>
            </div>
          )}
        </div>

        {/* ── REGISTERED FLEET & KYC COMPLIANCE SECTION ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-primary-500" />
              <h2 className="text-sm sm:text-base font-bold text-surface-900 dark:text-white">
                Registered Fleet & Vehicle Documents ({trucks.length})
              </h2>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/search?type=load')}
              className="text-xs"
            >
              Find Matching Cargo
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : trucks.length === 0 ? (
            <OperationalEmptyState
              role="truck_owner"
              title="No Lorries Registered in Fleet"
              description="Register your truck vehicle registration, body type, and tonnage capacity to receive direct freight leads without broker cuts."
              actionLabel="Find Open Loads"
              actionHref="/search?type=load"
              secondaryActionLabel="Get Direct Transporter Pass"
              secondaryActionHref="/subscribe"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm font-black text-surface-900 dark:text-white block">
                        {t.registrationNumber}
                      </span>
                      <span className="text-xs text-surface-500">
                        {t.tonnageCapacity} Tons Capacity • {t.bodyType}
                      </span>
                    </div>

                    <Badge
                      variant={t.verificationStatus === 'Verified' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {t.verificationStatus === 'Verified' ? '✓ RC Verified' : 'KYC Pending'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-200/60 dark:border-surface-700 text-xs">
                    <span className="text-surface-500">
                      Radius: {t.serviceableRadiusKm || 50} km
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/search?type=load`)}
                      className="text-xs py-1 text-primary-600"
                    >
                      Find Nearby Cargo ➔
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
