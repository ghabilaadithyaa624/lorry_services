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
      <div className="space-y-6 max-w-7xl mx-auto font-sans">
        
        {/* ── KPI OPERATIONAL RISK CONTROL SUMMARY ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Action Required KPI */}
          <div
            onClick={() => setActiveTab('ACTION_REQUIRED')}
            className={cn(
              'p-5 rounded-[20px] border transition-all duration-200 cursor-pointer space-y-2.5',
              activeTab === 'ACTION_REQUIRED'
                ? 'bg-danger-950/80 border-danger-500 shadow-glow-primary ring-2 ring-danger-500'
                : 'bg-[#0F131D] border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-danger-400">
                Action Required
              </span>
              <ShieldExclamationIcon className="w-5 h-5 text-danger-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-danger-300">
                {summary.actionRequiredCount}
              </span>
              <span className="text-xs font-mono text-surface-400">Pending</span>
            </div>
            <p className="text-[11px] text-danger-300 font-medium leading-tight">
              50% advance or POD balance confirmation pending
            </p>
          </div>

          {/* Attention Required KPI */}
          <div
            onClick={() => setActiveTab('ATTENTION_REQUIRED')}
            className={cn(
              'p-5 rounded-[20px] border transition-all duration-200 cursor-pointer space-y-2.5',
              activeTab === 'ATTENTION_REQUIRED'
                ? 'bg-amber-950/80 border-amber-500 shadow-glow-primary ring-2 ring-amber-500'
                : 'bg-[#0F131D] border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                Attention Required
              </span>
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-amber-300">
                {summary.attentionRequiredCount}
              </span>
              <span className="text-xs font-mono text-surface-400">Compliance</span>
            </div>
            <p className="text-[11px] text-amber-300 font-medium leading-tight">
              E-Way Bill missing or document compliance pending
            </p>
          </div>

          {/* On Track KPI */}
          <div
            onClick={() => setActiveTab('ON_TRACK')}
            className={cn(
              'p-5 rounded-[20px] border transition-all duration-200 cursor-pointer space-y-2.5',
              activeTab === 'ON_TRACK'
                ? 'bg-emerald-950/80 border-emerald-500 shadow-glow-primary ring-2 ring-emerald-500'
                : 'bg-[#0F131D] border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">
                On Track
              </span>
              <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-emerald-300">
                {summary.onTrackCount + summary.lowRiskCount}
              </span>
              <span className="text-xs font-mono text-surface-400">In Transit</span>
            </div>
            <p className="text-[11px] text-emerald-300 font-medium leading-tight">
              Vehicle progressing through national checkpoints
            </p>
          </div>

          {/* Total Active KPI */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'p-5 rounded-[20px] border transition-all duration-200 cursor-pointer space-y-2.5',
              activeTab === 'ALL'
                ? 'bg-primary-950/80 border-primary-500 shadow-glow-primary ring-2 ring-primary-500'
                : 'bg-[#0F131D] border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary-400">
                Total Control Tower
              </span>
              <SparklesIcon className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-white">
                {summary.totalActive}
              </span>
              <span className="text-xs font-mono text-surface-400">Active Fleet</span>
            </div>
            <p className="text-[11px] text-surface-300 font-medium leading-tight">
              Monitored across national logistics corridors
            </p>
          </div>
        </div>

        {/* ── FILTER NAVIGATION TABS ── */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'ALL'
                  ? 'bg-primary-500 text-white shadow-glow-primary'
                  : 'bg-surface-900/80 text-surface-400 hover:text-white hover:bg-white/5 border border-white/10'
              )}
            >
              All Active ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('ACTION_REQUIRED')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'ACTION_REQUIRED'
                  ? 'bg-danger-600 text-white shadow-glow-primary'
                  : 'bg-danger-950/40 text-danger-300 hover:bg-danger-900/60 border border-danger-500/20'
              )}
            >
              ⚠️ Action Required ({summary.actionRequiredCount})
            </button>
            <button
              onClick={() => setActiveTab('ATTENTION_REQUIRED')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'ATTENTION_REQUIRED'
                  ? 'bg-amber-500 text-white shadow-glow-primary'
                  : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border border-amber-500/20'
              )}
            >
              🟡 Attention Required ({summary.attentionRequiredCount})
            </button>
            <button
              onClick={() => setActiveTab('ON_TRACK')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'ON_TRACK'
                  ? 'bg-emerald-600 text-white shadow-glow-primary'
                  : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-500/20'
              )}
            >
              🟢 On Track ({summary.onTrackCount + summary.lowRiskCount})
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'COMPLETED'
                  ? 'bg-white text-surface-950'
                  : 'bg-surface-900/80 text-surface-400 hover:text-white hover:bg-white/5 border border-white/10'
              )}
            >
              ✓ Completed ({summary.completedCount})
            </button>
          </div>
        </div>

        {/* ── CONTROL TOWER CARDS FEED ── */}
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs font-mono font-bold text-surface-400 uppercase tracking-widest">Loading Control Tower shipment intelligence...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const intel = assessShipmentIntelligence(booking)

              return (
                <div
                  key={booking.id}
                  className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal hover:border-primary-500/40 transition-all space-y-5"
                >
                  {/* Row 1: Route & Risk Badge Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <Badge variant={intel.badgeVariant} size="sm" className="font-mono text-[10px]">
                          {intel.statusTier}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-surface-400">
                          Booking #{booking.id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Explicit Why Explanation */}
                      <p className="text-xs font-bold text-white flex items-center gap-2 mt-1">
                        <span>Why:</span>
                        <span className={cn(
                          intel.statusTier === 'ACTION REQUIRED' && 'text-danger-400',
                          intel.statusTier === 'ATTENTION REQUIRED' && 'text-amber-400',
                          intel.statusTier === 'ON TRACK' && 'text-emerald-400',
                          intel.statusTier === 'COMPLETED' && 'text-surface-300'
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
                        className="text-xs font-bold border-white/10 hover:border-white/20"
                      >
                        Deep Tracking
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: Route & Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-white text-sm sm:text-base">
                        {booking.load?.loadingAddress || 'Origin'} <span className="text-primary-400 font-mono">➔</span> {booking.load?.unloadingAddress || 'Destination'}
                      </span>
                      <span className="text-primary-400 font-mono font-bold">
                        {intel.progressPercent}% Corridor Completed
                      </span>
                    </div>

                    <div className="w-full bg-surface-950 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500 shadow-glow-primary',
                          intel.statusTier === 'ACTION REQUIRED' ? 'bg-danger-500' : 'bg-primary-500'
                        )}
                        style={{ width: `${intel.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Grid Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    {/* Checkpoints & Location */}
                    <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1">
                      <span className="text-[10px] text-surface-400 font-bold uppercase tracking-widest block">
                        Last Checkpoint
                      </span>
                      <span className="font-bold text-white block truncate">
                        📍 {intel.currentLocationName}
                      </span>
                      <span className="text-[10px] text-surface-400 block">
                        Checkpoint {intel.crossedCount}/{intel.totalCheckpoints} passed
                      </span>
                    </div>

                    {/* Next Milestone & ETA */}
                    <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1">
                      <span className="text-[10px] text-surface-400 font-bold uppercase tracking-widest block">
                        Next Milestone & ETA
                      </span>
                      <span className="font-bold text-white block truncate">
                        🎯 {intel.nextMilestoneName}
                      </span>
                      <span className="text-[10px] text-primary-400 font-bold block">
                        ⏱️ {intel.estimatedArrival} (Indicative ETA)
                      </span>
                    </div>

                    {/* Commercial Terms */}
                    <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1">
                      <span className="text-[10px] text-surface-400 font-bold uppercase tracking-widest block">
                        Commercial Terms ({formatINR(Number(booking.agreedPrice))})
                      </span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>50% Advance:</span>
                        <span className={booking.advanceConfirmed ? 'text-emerald-400 font-bold' : 'text-danger-400 font-bold'}>
                          {booking.advanceConfirmed ? '✓ Paid' : '⚠️ Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>E-Way Bill:</span>
                        <span className={booking.ewayBillNumber ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
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
                          className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-200">
                                {action.title}
                              </span>
                              <p className="text-[11px] text-amber-300/80 mt-0.5">
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
                              className="shrink-0 text-xs font-bold py-2 shadow-glow-primary"
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
                              className="shrink-0 text-xs font-bold py-2 shadow-glow-primary"
                            >
                              Confirm Final POD Balance
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explicit Disclaimer Footer */}
                  <div className="text-[10px] font-mono text-surface-400 flex items-center gap-2 pt-2 border-t border-white/5">
                    <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 text-primary-400" />
                    <span>
                      GPS location estimated from national highway geofence checkpoints. ETAs are indicative milestone-based estimates.
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 bg-[#0F131D] rounded-[20px] border border-white/10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-950 flex items-center justify-center mx-auto text-2xl border border-white/5">
              📦
            </div>
            <h3 className="text-lg font-bold text-white">
              No active shipments in this control category
            </h3>
            <p className="text-xs text-surface-400 max-w-sm mx-auto">
              Shipments will automatically appear in the Control Tower as transporters and cargo owners confirm bookings.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
