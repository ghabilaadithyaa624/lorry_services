'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArchiveBoxIcon,
  TruckIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Badge, Button, Skeleton } from '@/components/ui'
import {
  MatchScoreBadge,
  FreightRateEstimatorCard,
  ActionCenterCard,
  OperationalEmptyState,
} from '@/components/intelligence'
import {
  calculateMatchScore,
  deriveOperationalTasks,
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
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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

      // If user has open loads with coordinates, fetch nearby trucks for real match intelligence
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

  const activeCount = loads.filter((l) => l.status === 'Open' || l.status === 'Matched').length
  const inTransitCount = loads.filter((l) => l.status === 'InTransit').length
  const completedCount = loads.filter((l) => l.status === 'Completed').length
  const totalBids = loads.reduce((acc, curr) => acc + (curr._count?.bookings || 0), 0)

  const stats = [
    {
      label: 'Active Loads',
      value: activeCount,
      icon: ArchiveBoxIcon,
      color: 'text-primary-600 bg-primary-50 dark:bg-primary-950/40',
    },
    {
      label: 'Bids / Inquiries',
      value: totalBids,
      icon: ChatBubbleBottomCenterTextIcon,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'In-Transit Trips',
      value: inTransitCount,
      icon: TruckIcon,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Completed Deliveries',
      value: completedCount,
      icon: ShieldCheckIcon,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
  ]

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white">
                Shipper Workspace
              </h1>
              <Badge variant="primary" size="sm">
                Freight Intelligence
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
              Direct load matching, real-time transporter proximity, and milestone trip tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/search?type=truck')}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            >
              Search Lorries
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/post-load')}
              leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
              className="font-bold"
            >
              Post New Load
            </Button>
          </div>
        </div>

        {/* Action Center (Only rendered when real operational actions exist) */}
        {operationalTasks.length > 0 && <ActionCenterCard tasks={operationalTasks} />}

        {/* 4 Metric Stats Cards */}
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

        {/* ── FREIGHT INTELLIGENCE SECTION ── */}
        {activeFocusLoad && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Active Load Compatibility & Market Rate Intelligence */}
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

            {/* Right: Smart Matching Engine Preview for Active Load */}
            <div className="lg:col-span-7 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-success-50 dark:bg-success-950/60 text-success-600 dark:text-success-400 flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                    Smart Lorry Matching Engine
                  </h3>
                </div>
                <Badge variant="success" size="sm">
                  Active Requirement
                </Badge>
              </div>

              {/* Active Load Quick Summary */}
              <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-surface-900 dark:text-white">
                    {activeFocusLoad.loadingAddress} ➔ {activeFocusLoad.unloadingAddress}
                  </span>
                  <Badge variant="primary" size="sm">
                    {activeFocusLoad.tonnageRequired} Tons • {activeFocusLoad.truckType}
                  </Badge>
                </div>
                <p className="text-[11px] text-surface-500">
                  Target Budget: {activeFocusLoad.maxPrice ? formatINR(Number(activeFocusLoad.maxPrice)) : 'Open for quotes'}
                </p>
              </div>

              {/* Matching Lorries Result List */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400 block">
                  {nearbyTrucks.length > 0
                    ? `${nearbyTrucks.length} Compatible Lorries Available Within 50km`
                    : 'Searching National Corridor for Verified Lorries...'}
                </span>

                {nearbyTrucks.length > 0 ? (
                  nearbyTrucks.slice(0, 3).map((t) => {
                    const match = calculateMatchScore(activeFocusLoad, {
                      id: t.id,
                      bodyType: t.bodyType,
                      tonnageCapacity: t.tonnageCapacity,
                      distanceKm: t.distanceKm,
                      verificationStatus: t.verificationStatus,
                    })

                    return (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-700 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-surface-900 dark:text-white">
                              {t.tonnageCapacity}T {t.bodyType}
                            </span>
                            <MatchScoreBadge match={match} />
                          </div>
                          <p className="text-[11px] text-surface-500">
                            {t.distanceKm ? `${t.distanceKm.toFixed(1)} km from pickup` : 'Within corridor'} • {t.verificationStatus === 'Verified' ? '✓ RC Verified' : 'Verification pending'}
                          </p>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/search?type=truck&location=${encodeURIComponent(activeFocusLoad.loadingAddress)}`)}
                          className="shrink-0 text-xs py-1.5"
                        >
                          View Direct
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/50 dark:border-surface-700 text-center space-y-2">
                    <p className="text-xs text-surface-500">
                      Explore verified trucks active along this highway corridor.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/search?type=truck&location=${encodeURIComponent(activeFocusLoad.loadingAddress)}`)}
                      className="text-xs"
                    >
                      Find Trucks on This Route
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Posted Loads List & Operational Empty State */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <h2 className="text-sm sm:text-base font-bold text-surface-900 dark:text-white">
              My Posted Loads & Requirements
            </h2>
            <Link
              href="/my-loads"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <span>View All ({loads.length})</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : loads.length === 0 ? (
            <OperationalEmptyState
              role="load_owner"
              title="No Active Cargo Requirements Posted"
              description="Post your freight tonnage and loading details to activate smart 50km proximity matching with verified transporters."
              actionLabel="Post Freight Load"
              actionHref="/post-load"
              secondaryActionLabel="Explore Available Lorries"
              secondaryActionHref="/search?type=truck"
            />
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {loads.slice(0, 5).map((l) => (
                <div
                  key={l.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-surface-900 dark:text-white">
                        {l.loadingAddress} ➔ {l.unloadingAddress}
                      </span>
                      <Badge variant={statusVariantMap[l.status] || 'default'} size="sm">
                        {l.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-surface-500">
                      {l.tonnageRequired} Tons • {l.truckType} • Posted {timeAgo(l.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-surface-900 dark:text-white block">
                        {l.maxPrice ? formatINR(Number(l.maxPrice)) : 'Flexible'}
                      </span>
                      <span className="text-[10px] text-surface-400">
                        {l._count?.bookings || 0} Inquiries
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/search?type=truck&location=${encodeURIComponent(l.loadingAddress)}`)}
                      className="text-xs"
                    >
                      Find Trucks
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
