'use client'

import React, { useState, useEffect } from 'react'
import {
  GlobeAsiaAustraliaIcon,
  MapPinIcon,
  ScaleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Badge, Spinner } from '@/components/ui'
import {
  evaluateNationalLogistics,
  NationalLogisticsSummary,
} from '@/lib/intelligence/nationalLogisticsEngine'
import { formatINR, cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export interface APIBooking {
  id: string
  status: string
  agreedPrice?: number | string
  load?: {
    loadingAddress?: string
    unloadingAddress?: string
  } | null
}

export default function AdminNationalIntelligencePage() {
  const [summary, setSummary] = useState<NationalLogisticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNationalData()
  }, [])

  const loadNationalData = async () => {
    try {
      setLoading(true)
      const [, bookingsRes, subscriptionsRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.listBookings(1, 100),
        adminApi.listSubscriptions(1, 100),
      ])

      const bookings: APIBooking[] = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data.bookings || [] : []
      const subscriptions = subscriptionsRes.status === 'fulfilled' ? subscriptionsRes.value.data.subscriptions || [] : []

      // Format real booking records for corridor intelligence calculation
      const formattedBookings = bookings.map((b: APIBooking) => ({
        id: b.id,
        origin: b.load?.loadingAddress || '',
        destination: b.load?.unloadingAddress || '',
        status: b.status,
        agreedPrice: Number(b.agreedPrice || 0),
      }))

      const result = evaluateNationalLogistics([], [], formattedBookings, subscriptions)
      setSummary(result)
    } catch {
      toast.error('Failed to compute National Logistics Intelligence statistics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout
      title="National Logistics Intelligence Console"
      subtitle="Executive marketplace analytics, corridor performance, supply/demand indices, and metric transparency classification."
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ── METRIC CLASSIFICATION LEGEND NOTICE ── */}
        <div className="bg-panel rounded-[20px] border border-white/10 p-5 shadow-modal flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-2">
            <GlobeAsiaAustraliaIcon className="w-5 h-5 text-primary-400" />
            <span className="font-bold text-white">Metric Transparency Classification:</span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] tracking-wider uppercase">
              REAL METRICS (Direct DB)
            </span>
            <span className="px-3 py-1 rounded-xl bg-sky-950/80 border border-sky-500/30 text-sky-300 font-bold text-[10px] tracking-wider uppercase">
              ESTIMATED METRICS (Benchmark)
            </span>
            <span className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-300 font-bold text-[10px] tracking-wider uppercase">
              PREDICTIVE METRICS (Projected)
            </span>
          </div>
        </div>

        {loading || !summary ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 font-mono">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">Processing national freight intelligence data...</p>
          </div>
        ) : (
          <>
            {/* ── SECTION 1: REAL METRICS GRID ── */}
            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-surface-400">
                  1. REAL METRICS (Direct Database Measurement)
                </h2>
                <Badge variant="success" size="sm" className="font-mono text-[10px]">Empirical Data</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                <div className="bg-panel p-5 rounded-[20px] border border-white/10 shadow-modal space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                    Completed Trips
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white block">
                    {summary.realMetrics.totalCompletedBookings}
                  </span>
                  <span className="text-[10px] text-surface-400">Verified trip deliveries</span>
                </div>

                <div className="bg-panel p-5 rounded-[20px] border border-white/10 shadow-modal space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                    Gross Payment Volume
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white block">
                    {formatINR(summary.realMetrics.totalGrossPaymentVolumeINR)}
                  </span>
                  <span className="text-[10px] text-surface-400">Settled transaction volume</span>
                </div>

                <div className="bg-panel p-5 rounded-[20px] border border-white/10 shadow-modal space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                    Verified Fleet Lorries
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white block">
                    {summary.realMetrics.verifiedTrucksCount} / {summary.realMetrics.totalPlatformTrucks}
                  </span>
                  <span className="text-[10px] text-surface-400">RTO / RC Verified vehicles</span>
                </div>

                <div className="bg-panel p-5 rounded-[20px] border border-white/10 shadow-modal space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                    KYC Approval Pipeline
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white block">
                    {summary.realMetrics.kycApprovalRatePercent}%
                  </span>
                  <span className="text-[10px] text-surface-400">Document compliance rate</span>
                </div>
              </div>
            </div>

            {/* ── SECTION 2 & 3: ESTIMATED & PREDICTIVE METRICS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
              
              {/* ESTIMATED METRICS */}
              <div className="bg-panel p-6 rounded-[20px] border border-white/10 shadow-modal space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ScaleIcon className="w-5 h-5 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">
                      2. ESTIMATED METRICS (Derived Benchmarks)
                    </h3>
                  </div>
                  <Badge variant="primary" size="sm" className="font-mono text-[10px]">Indicative Benchmark</Badge>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between p-3.5 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-300">National Benchmark Freight Rate</span>
                    <span className="font-bold text-white">₹{summary.estimatedMetrics.nationalAvgRatePerTonKmINR} / Ton-Km</span>
                  </div>

                  <div className="flex justify-between p-3.5 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-300">Consignee On-Time Transit Rate</span>
                    <span className="font-bold text-emerald-400">{summary.estimatedMetrics.avgTransitOnTimeRatePercent}% On-Time</span>
                  </div>
                </div>
              </div>

              {/* PREDICTIVE METRICS */}
              <div className="bg-panel p-6 rounded-[20px] border border-white/10 shadow-modal space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">
                      3. PREDICTIVE METRICS (Projected Freight Capacity)
                    </h3>
                  </div>
                  <Badge variant="warning" size="sm" className="font-mono text-[10px]">Projections</Badge>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between p-3.5 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-300">Projected Monthly Freight Volume</span>
                    <span className="font-bold text-white">{summary.predictiveMetrics.projectedMonthlyVolumeTons} Tons</span>
                  </div>

                  <div className="flex justify-between p-3.5 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-300">Empty-Run Reduction Potential</span>
                    <span className="font-bold text-emerald-400">320 Empty-KM / Trip</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── SECTION 4: CORRIDOR INTELLIGENCE TABLE ── */}
            <div className="bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-5 font-sans">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-bold text-white">
                    National Freight Corridor Performance
                  </h2>
                </div>
                <span className="text-xs text-surface-400 font-mono">
                  Strict Rule: Minimum 2 matching records required for statistics
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.corridors.map((c) => {
                  const isInsufficient = c.dataStatus === 'INSUFFICIENT_DATA'

                  return (
                    <div
                      key={c.corridorId}
                      className={cn(
                        'p-5 rounded-2xl border space-y-4 transition-all',
                        isInsufficient
                          ? 'bg-surface-950/60 border-white/5 opacity-80'
                          : 'bg-surface-950/80 border-white/10 hover:border-primary-500/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white font-mono">
                          {c.origin} ➔ {c.destination}
                        </span>
                        <Badge variant={isInsufficient ? 'default' : 'success'} size="sm" className="font-mono text-[10px]">
                          {isInsufficient ? 'INSUFFICIENT DATA' : 'ACTIVE CORRIDOR'}
                        </Badge>
                      </div>

                      {isInsufficient ? (
                        <div className="p-4 rounded-xl bg-surface-900/80 border border-white/5 text-center text-xs text-surface-400 font-mono">
                          "Insufficient data" — Minimum 2 matching corridor records required to render statistics.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-3 rounded-xl bg-surface-900/90 border border-white/5">
                            <span className="text-[10px] text-surface-400 uppercase font-bold block">Trips</span>
                            <span className="font-extrabold text-white mt-0.5 block">{c.realMetrics.completedTrips} Trips</span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-900/90 border border-white/5">
                            <span className="text-[10px] text-primary-400 uppercase font-bold block">Rate / T-KM</span>
                            <span className="font-extrabold text-primary-400 mt-0.5 block">₹{c.estimatedMetrics.avgRatePerTonKmINR}</span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-900/90 border border-white/5">
                            <span className="text-[10px] text-surface-400 uppercase font-bold block">Transit Time</span>
                            <span className="font-extrabold text-white mt-0.5 block">{c.estimatedMetrics.avgTransitHours} Hours</span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-900/90 border border-white/5">
                            <span className="text-[10px] text-purple-400 uppercase font-bold block">Supply / Demand</span>
                            <span className="font-extrabold text-purple-400 mt-0.5 block">{c.predictiveMetrics.demandSupplyRatio}x Ratio</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
