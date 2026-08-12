'use client'

import React, { useState, useEffect } from 'react'
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Badge, Skeleton } from '@/components/ui'
import {
  evaluateNationalLogistics,
  CorridorStat,
} from '@/lib/intelligence/nationalLogisticsEngine'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function NationalCorridorsPage() {
  const [corridors, setCorridors] = useState<CorridorStat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCorridorsData()
  }, [])

  const loadCorridorsData = async () => {
    try {
      setLoading(true)
      const [loadsRes, trucksRes, bookingsRes] = await Promise.allSettled([
        api.get('/loads').catch(() => ({ data: [] })),
        api.get('/trucks').catch(() => ({ data: [] })),
        api.get('/bookings').catch(() => ({ data: [] })),
      ])

      const loads: any[] = loadsRes.status === 'fulfilled' ? (loadsRes.value as any)?.data || [] : []
      const trucks: any[] = trucksRes.status === 'fulfilled' ? (trucksRes.value as any)?.data || [] : []
      const bookings: any[] = bookingsRes.status === 'fulfilled' ? (bookingsRes.value as any)?.data || [] : []

      const summary = evaluateNationalLogistics(loads, trucks, bookings, [])
      setCorridors(summary.corridors)
    } catch {
      toast.error('Failed to load Corridor Intelligence statistics')
    } finally {
      setLoading(false)
    }
  }

  const filteredCorridors = corridors.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return c.origin.toLowerCase().includes(q) || c.destination.toLowerCase().includes(q)
  })

  return (
    <DashboardLayout
      title="National freight corridor intelligence"
      subtitle="Corridor density, indicative benchmark rate/ton-km, transit performance, and empty-run reduction metrics."
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ── HEADER BANNER ── */}
        <div className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 shadow-modal flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-6 h-6 text-primary-400" />
              <h1 className="text-[15px] font-semibold text-white font-sans">
                Major Indian logistics & industrial corridors
              </h1>
            </div>
            <p className="text-xs text-surface-300 max-w-2xl">
              Real-time corridor freight rates, vehicle density, transit duration, and return load availability. Metrics strictly obey empirical sample verification.
            </p>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <MagnifyingGlassIcon className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search origin or destination..."
              className="input text-xs pl-9 py-2.5 bg-surface-950/80 border-white/10 text-white placeholder:text-surface-400"
            />
          </div>
        </div>

        {/* ── CORRIDORS GRID ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        ) : filteredCorridors.length === 0 ? (
          <div className="p-12 text-center bg-[#0F131D] rounded-[20px] border border-white/10 space-y-3 shadow-modal">
            <h3 className="text-sm font-semibold text-white font-sans">
              No corridor metrics available
            </h3>
            <p className="text-xs text-surface-400 max-w-sm mx-auto font-sans">
              Corridor metrics will generate automatically as trips are booked and completed along national highways.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
            {filteredCorridors.map((c) => {
              const isInsufficient = c.dataStatus === 'INSUFFICIENT_DATA'

              return (
                <div
                  key={c.corridorId}
                  className={cn(
                    'bg-[#0F131D] rounded-[20px] border p-6 shadow-modal space-y-4 transition-all',
                    isInsufficient
                      ? 'border-white/5 opacity-80'
                      : 'border-white/10 hover:border-primary-500/40'
                  )}
                >
                  {/* Corridor Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white font-mono">
                        {c.origin}
                      </span>
                      <ArrowRightIcon className="w-4 h-4 text-primary-400" />
                      <span className="text-base font-black text-white font-mono">
                        {c.destination}
                      </span>
                    </div>

                    <Badge variant={isInsufficient ? 'default' : 'primary'} size="sm">
                      {isInsufficient ? 'Insufficient data' : 'Active corridor'}
                    </Badge>
                  </div>

                  {/* Insufficient Data State */}
                  {isInsufficient ? (
                    <div className="p-6 rounded-2xl bg-surface-950/60 border border-white/5 text-center space-y-2">
                      <InformationCircleIcon className="w-6 h-6 text-surface-400 mx-auto" />
                      <span className="font-semibold text-sm text-white block font-sans">
                        Insufficient data
                      </span>
                      <p className="text-xs font-sans text-surface-400 max-w-xs mx-auto">
                        This corridor requires at least 2 completed trips or open loads before displaying benchmark rates and transit metrics.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Metric Callouts */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-2xl bg-surface-950/70 border border-white/5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Trips</span>
                          <span className="text-lg font-black text-white font-mono mt-0.5 block">
                            {c.realMetrics.completedTrips}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-surface-950/70 border border-white/5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Rate / T-KM</span>
                          <span className="text-lg font-black text-primary-400 font-mono mt-0.5 block">
                            ₹{c.estimatedMetrics.avgRatePerTonKmINR}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-surface-950/70 border border-white/5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Avg transit</span>
                          <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
                            {c.estimatedMetrics.avgTransitHours} hrs
                          </span>
                        </div>
                      </div>

                      {/* Explicit Metric Labels */}
                      <div className="p-3.5 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1.5 text-sm font-sans">
                        <div className="flex justify-between">
                          <span className="text-surface-400">Total freight volume:</span>
                          <span className="font-semibold text-white">
                            {c.realMetrics.totalTonnage} Tons
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-surface-400">Total corridor bookings:</span>
                          <span className="font-semibold text-white">
                            {c.realMetrics.totalBookings} bookings
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
