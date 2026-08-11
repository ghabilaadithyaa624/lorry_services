'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Badge, Button, Spinner } from '@/components/ui'
import {
  assessShipmentIntelligence,
  summarizeActiveShipmentsControlTower,
  BookingData,
} from '@/lib/intelligence'
import { formatINR, cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function ControlTowerTrackingPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'ATTENTION_REQUIRED' | 'ON_TRACK' | 'COMPLETED'>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveBookings()
  }, [])

  const fetchActiveBookings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/bookings')
      setBookings(res.data || [])
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch active shipments')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAdvance = async (bookingId: string) => {
    try {
      setActionLoading(`advance-${bookingId}`)
      await api.patch(`/bookings/${bookingId}/confirm-advance`)
      toast.success('50% Loading advance confirmed!')
      fetchActiveBookings()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm advance')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmBalance = async (bookingId: string) => {
    try {
      setActionLoading(`balance-${bookingId}`)
      await api.patch(`/bookings/${bookingId}/confirm-balance`)
      toast.success('Delivery balance confirmed!')
      fetchActiveBookings()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm balance')
    } finally {
      setActionLoading(null)
    }
  }

  const summary = summarizeActiveShipmentsControlTower(bookings)

  const filteredBookings = bookings.filter((bk) => {
    const intel = assessShipmentIntelligence(bk)
    if (activeTab === 'ACTION_REQUIRED') return intel.statusTier === 'ACTION REQUIRED'
    if (activeTab === 'ATTENTION_REQUIRED') return intel.statusTier === 'ATTENTION REQUIRED'
    if (activeTab === 'ON_TRACK') return intel.statusTier === 'ON TRACK' || intel.statusTier === 'LOW RISK'
    if (activeTab === 'COMPLETED') return intel.statusTier === 'COMPLETED'
    return true
  })

  return (
    <DashboardLayout
      title="Shipment Control Tower"
      subtitle="Real-time operational risk monitoring, milestone tracking, and commercial compliance for active shipments."
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ── KPI OPERATIONAL RISK CONTROL SUMMARY ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Action Required KPI */}
          <div
            onClick={() => setActiveTab('ACTION_REQUIRED')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer space-y-2',
              activeTab === 'ACTION_REQUIRED'
                ? 'bg-danger-50 dark:bg-danger-950/60 border-danger-400 shadow-md ring-2 ring-danger-400'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:shadow-card'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-danger-600 dark:text-danger-400">
                Action Required
              </span>
              <ShieldExclamationIcon className="w-5 h-5 text-danger-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-danger-700 dark:text-danger-300">
                {summary.actionRequiredCount}
              </span>
              <span className="text-xs text-surface-500 font-medium">Pending Commercials</span>
            </div>
            <p className="text-[11px] text-danger-700 dark:text-danger-300 font-semibold leading-tight">
              50% advance or POD balance confirmation pending
            </p>
          </div>

          {/* Attention Required KPI */}
          <div
            onClick={() => setActiveTab('ATTENTION_REQUIRED')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer space-y-2',
              activeTab === 'ATTENTION_REQUIRED'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 shadow-md ring-2 ring-amber-400'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:shadow-card'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
                Attention Required
              </span>
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300">
                {summary.attentionRequiredCount}
              </span>
              <span className="text-xs text-surface-500 font-medium">Missing Specs/E-Way</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold leading-tight">
              E-Way Bill missing or document compliance pending
            </p>
          </div>

          {/* On Track KPI */}
          <div
            onClick={() => setActiveTab('ON_TRACK')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer space-y-2',
              activeTab === 'ON_TRACK'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 shadow-md ring-2 ring-emerald-400'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:shadow-card'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                On Track
              </span>
              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">
                {summary.onTrackCount + summary.lowRiskCount}
              </span>
              <span className="text-xs text-surface-500 font-medium">Moving Smoothly</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold leading-tight">
              Vehicle progressing through national checkpoints
            </p>
          </div>

          {/* Total Active KPI */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'p-4 rounded-2xl border transition-all cursor-pointer space-y-2',
              activeTab === 'ALL'
                ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-400 shadow-md ring-2 ring-primary-400'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:shadow-card'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-primary-600 dark:text-primary-400">
                Total Control Tower
              </span>
              <SparklesIcon className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white">
                {summary.totalActive}
              </span>
              <span className="text-xs text-surface-500 font-medium">Active Shipments</span>
            </div>
            <p className="text-[11px] text-surface-500 font-semibold leading-tight">
              Monitored across national logistics corridors
            </p>
          </div>
        </div>

        {/* ── FILTER NAVIGATION TABS ── */}
        <div className="flex items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                activeTab === 'ALL'
                  ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200'
              )}
            >
              All Active ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('ACTION_REQUIRED')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                activeTab === 'ACTION_REQUIRED'
                  ? 'bg-danger-600 text-white'
                  : 'bg-danger-50 text-danger-700 dark:bg-danger-950/40 dark:text-danger-300 hover:bg-danger-100'
              )}
            >
              ⚠️ Action Required ({summary.actionRequiredCount})
            </button>
            <button
              onClick={() => setActiveTab('ATTENTION_REQUIRED')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                activeTab === 'ATTENTION_REQUIRED'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
              )}
            >
              🟡 Attention Required ({summary.attentionRequiredCount})
            </button>
            <button
              onClick={() => setActiveTab('ON_TRACK')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                activeTab === 'ON_TRACK'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
              )}
            >
              🟢 On Track ({summary.onTrackCount + summary.lowRiskCount})
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                activeTab === 'COMPLETED'
                  ? 'bg-surface-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200'
              )}
            >
              ✓ Completed ({summary.completedCount})
            </button>
          </div>
        </div>

        {/* ── CONTROL TOWER CARDS FEED ── */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm font-bold text-surface-500">Loading Control Tower shipment intelligence...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const intel = assessShipmentIntelligence(booking)

              return (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all space-y-4"
                >
                  {/* Row 1: Route & Risk Badge Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-100 dark:border-surface-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={intel.badgeVariant} size="sm">
                          {intel.statusTier}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-surface-400">
                          Booking #{booking.id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Explicit Why Explanation */}
                      <p className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1.5 mt-1">
                        <span>Why:</span>
                        <span className={cn(
                          intel.statusTier === 'ACTION REQUIRED' && 'text-danger-600 dark:text-danger-400',
                          intel.statusTier === 'ATTENTION REQUIRED' && 'text-amber-600 dark:text-amber-400',
                          intel.statusTier === 'ON TRACK' && 'text-emerald-600 dark:text-emerald-400',
                          intel.statusTier === 'COMPLETED' && 'text-surface-600 dark:text-surface-300'
                        )}>
                          {intel.whyReason}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/booking/${booking.id}`)}
                        rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}
                        className="text-xs font-bold"
                      >
                        Deep Tracking
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: Route & Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-surface-900 dark:text-white">
                        {booking.load?.loadingAddress || 'Origin'} ➔ {booking.load?.unloadingAddress || 'Destination'}
                      </span>
                      <span className="text-surface-500 font-mono">
                        {intel.progressPercent}% Corridor Completed
                      </span>
                    </div>

                    <div className="w-full bg-surface-100 dark:bg-surface-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          intel.statusTier === 'ACTION REQUIRED' ? 'bg-danger-500' : 'bg-primary-500'
                        )}
                        style={{ width: `${intel.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Grid Metrics (Current Checkpoint, Next Checkpoint, Commercials, Disclaimers) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Checkpoints & Location */}
                    <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/60 space-y-1">
                      <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">
                        Last Checkpoint
                      </span>
                      <span className="font-bold text-surface-900 dark:text-white block truncate">
                        📍 {intel.currentLocationName}
                      </span>
                      <span className="text-[10px] text-surface-400 block">
                        Checkpoint {intel.crossedCount}/{intel.totalCheckpoints} passed
                      </span>
                    </div>

                    {/* Next Milestone & ETA */}
                    <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/60 space-y-1">
                      <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">
                        Next Milestone & ETA
                      </span>
                      <span className="font-bold text-surface-900 dark:text-white block truncate">
                        🎯 {intel.nextMilestoneName}
                      </span>
                      <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold block">
                        ⏱️ {intel.estimatedArrival} (Indicative ETA)
                      </span>
                    </div>

                    {/* Commercial Terms */}
                    <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/60 space-y-1">
                      <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">
                        Commercial Terms ({formatINR(Number(booking.agreedPrice))})
                      </span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>50% Advance:</span>
                        <span className={booking.advanceConfirmed ? 'text-emerald-600 font-bold' : 'text-danger-600 font-bold'}>
                          {booking.advanceConfirmed ? '✓ Paid' : '⚠️ Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>E-Way Bill:</span>
                        <span className={booking.ewayBillNumber ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                          {booking.ewayBillNumber ? '✓ Active' : '🟡 Missing'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Required Actions Callouts */}
                  {intel.requiredActions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {intel.requiredActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-900 dark:text-amber-200">
                                {action.title}
                              </span>
                              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                {action.description}
                              </p>
                            </div>
                          </div>

                          {action.actionType === 'CONFIRM_ADVANCE' && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={actionLoading === `advance-${booking.id}`}
                              onClick={() => handleConfirmAdvance(booking.id)}
                              className="shrink-0 text-xs font-bold py-1.5"
                            >
                              Confirm 50% Advance
                            </Button>
                          )}

                          {action.actionType === 'CONFIRM_BALANCE' && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={actionLoading === `balance-${booking.id}`}
                              onClick={() => handleConfirmBalance(booking.id)}
                              className="shrink-0 text-xs font-bold py-1.5"
                            >
                              Confirm Final POD Balance
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explicit Disclaimer Footer */}
                  <div className="text-[10px] text-surface-400 flex items-center gap-1.5 pt-1 border-t border-surface-100 dark:border-surface-800">
                    <InformationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      GPS location not live; estimated from national highway geofence checkpoints. ETAs are indicative milestone-based estimates.
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto text-xl">
              📦
            </div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white">
              No active shipments in this control category
            </h3>
            <p className="text-xs text-surface-500">
              Shipments will automatically appear in the Control Tower as transporters and cargo owners confirm bookings.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
