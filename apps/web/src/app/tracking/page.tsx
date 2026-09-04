'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Truck,
  Search,
  PlusCircle,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
  ShieldCheck,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { api, bookingsApi } from '@/lib/api'
import { Footer, Navbar } from '@/components/layout'
import {
  assessShipmentIntelligence,
  summarizeActiveShipmentsControlTower,
  BookingData,
} from '@/lib/intelligence'
import { formatINR, cn, whatsappLink } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function ControlTowerTrackingPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'ACTION_REQUIRED' | 'DELAYED' | 'ATTENTION_REQUIRED' | 'ON_TRACK' | 'COMPLETED'
  >('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [user, setUser] = useState<{ id?: string; name?: string; role?: string } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore
    }

    fetchActiveBookings()
  }, [])

  const fetchActiveBookings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/bookings/my-bookings')
      setBookings(res.data || [])
    } catch {
      // Fallback to /bookings if my-bookings returns 404
      try {
        const fallbackRes = await api.get('/bookings')
        setBookings(fallbackRes.data || [])
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to fetch active shipments')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAdvance = async (bookingId: string) => {
    try {
      setActionLoading(`advance-${bookingId}`)
      await bookingsApi.confirmAdvance(bookingId)
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
      await bookingsApi.confirmBalance(bookingId)
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
    if (activeTab === 'DELAYED') return intel.statusTier === 'DELAYED'
    if (activeTab === 'ATTENTION_REQUIRED') return intel.statusTier === 'ATTENTION REQUIRED'
    if (activeTab === 'ON_TRACK') return intel.statusTier === 'ON TRACK' || intel.statusTier === 'LOW RISK'
    if (activeTab === 'COMPLETED') return intel.statusTier === 'COMPLETED'
    return true
  })

  const isShipper = user?.role === 'factory_owner' || !user?.role

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      {/* ── 1. Fixed Top Navigation (shared redesigned header) ── */}
      <Navbar />

      {/* ── Main Workspace ── */}
      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        {/* ── 2. Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FASTag Corridor Telemetry Active</span>
              </span>
              <span className="text-xs font-mono font-bold text-surface-400">
                • {bookings.length} Total Monitored Consignments
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Shipment Control Tower
            </h1>
            <p className="text-xs sm:text-sm text-surface-400 max-w-2xl">
              Real-time operational risk monitoring, highway toll milestone tracking, and commercial compliance for active freight.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {isShipper ? (
              <button
                type="button"
                onClick={() => router.push('/post-load')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post Freight Load</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/search?type=load')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Find Freight Loads</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Five Status Overview Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Action Required Card */}
          <div
            onClick={() => setActiveTab('ACTION_REQUIRED')}
            className={cn(
              'bg-panel rounded-2xl border p-4 sm:p-5 shadow-modal transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ACTION_REQUIRED'
                ? 'border-l-danger-500 border-danger-500/40 ring-2 ring-danger-500/20 bg-danger-950/20'
                : 'border-l-danger-500 border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-danger-400 font-mono">
                ACTION REQUIRED
              </div>
              <div className="w-7 h-7 rounded-lg bg-danger-500/10 text-danger-400 flex items-center justify-center border border-danger-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-danger-400">
              {loading ? '...' : summary.actionRequiredCount}
            </div>
            <div className="text-[11px] text-surface-400 leading-tight">
              50% advance or POD balance confirmation pending
            </div>
          </div>

          {/* Delayed Card */}
          <div
            onClick={() => setActiveTab('DELAYED')}
            className={cn(
              'bg-panel rounded-2xl border p-4 sm:p-5 shadow-modal transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'DELAYED'
                ? 'border-l-rose-500 border-rose-500/40 ring-2 ring-rose-500/20 bg-rose-950/20'
                : 'border-l-rose-500 border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-400 font-mono">
                DELAYED
              </div>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
              {loading ? '...' : summary.delayedCount}
            </div>
            <div className="text-[11px] text-surface-400 leading-tight">
              Checkpoint stale &gt;6 hrs or delivery schedule overdue
            </div>
          </div>

          {/* Attention Required Card */}
          <div
            onClick={() => setActiveTab('ATTENTION_REQUIRED')}
            className={cn(
              'bg-panel rounded-2xl border p-4 sm:p-5 shadow-modal transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ATTENTION_REQUIRED'
                ? 'border-l-amber-500 border-amber-500/40 ring-2 ring-amber-500/20 bg-amber-950/20'
                : 'border-l-amber-500 border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                ATTENTION REQUIRED
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
              {loading ? '...' : summary.attentionRequiredCount}
            </div>
            <div className="text-[11px] text-surface-400 leading-tight">
              E-Way Bill missing or WhatsApp trigger failed
            </div>
          </div>

          {/* On Track Card */}
          <div
            onClick={() => setActiveTab('ON_TRACK')}
            className={cn(
              'bg-panel rounded-2xl border p-4 sm:p-5 shadow-modal transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ON_TRACK'
                ? 'border-l-emerald-500 border-emerald-500/40 ring-2 ring-emerald-500/20 bg-emerald-950/20'
                : 'border-l-emerald-500 border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                ON TRACK
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {loading ? '...' : summary.onTrackCount + summary.lowRiskCount}
            </div>
            <div className="text-[11px] text-surface-400 leading-tight">
              Vehicle progressing through national checkpoints
            </div>
          </div>

          {/* Total Active Fleet Card */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'bg-panel rounded-2xl border p-4 sm:p-5 shadow-modal transition-all cursor-pointer space-y-2 border-l-4 col-span-2 md:col-span-1',
              activeTab === 'ALL'
                ? 'border-l-primary-500 border-primary-500/40 ring-2 ring-primary-500/20 bg-primary-950/20'
                : 'border-l-primary-500 border-white/10 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary-400 font-mono">
                TOTAL MONITORED
              </div>
              <div className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {loading ? '...' : summary.totalActive}
            </div>
            <div className="text-[11px] text-surface-400 leading-tight">
              Active consignments on interstate corridors
            </div>
          </div>
        </div>

        {/* ── 4. Filter Navigation Pills ── */}
        <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'ALL', label: `All Active (${bookings.length})` },
              { id: 'ACTION_REQUIRED', label: `⚠️ Action Required (${summary.actionRequiredCount})` },
              { id: 'DELAYED', label: `🚨 Delayed (${summary.delayedCount})` },
              { id: 'ATTENTION_REQUIRED', label: `🟡 Attention Required (${summary.attentionRequiredCount})` },
              { id: 'ON_TRACK', label: `🟢 On Track (${summary.onTrackCount + summary.lowRiskCount})` },
              { id: 'COMPLETED', label: `✓ Completed (${summary.completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow-primary border border-primary-400/30'
                    : 'bg-surface-950/80 text-surface-300 hover:text-white hover:bg-white/5 border border-white/5'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Control Tower Shipment Feed ── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-panel rounded-2xl border border-white/10 p-6 space-y-4 shadow-modal animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="w-36 h-5 bg-surface-800 rounded-lg" />
                  <div className="w-24 h-6 bg-surface-800 rounded-full" />
                </div>
                <div className="h-3 bg-surface-950 rounded-full" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="h-16 bg-surface-950 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-5">
            {filteredBookings.map((booking) => {
              const intel = assessShipmentIntelligence(booking)

              return (
                <div
                  key={booking.id}
                  className="bg-panel rounded-2xl border border-white/10 p-5 sm:p-6 shadow-modal hover:border-white/20 transition-all space-y-5"
                >
                  {/* Row 1: Header (Badge, Booking ID, Why reason, Action CTA) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Status Tier Badge */}
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border',
                            intel.statusTier === 'ACTION REQUIRED'
                              ? 'bg-danger-500/15 text-danger-400 border-danger-500/30'
                              : intel.statusTier === 'DELAYED'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : intel.statusTier === 'ATTENTION REQUIRED'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : intel.statusTier === 'LOW RISK'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          )}
                        >
                          {intel.statusTier}
                        </span>

                        <span className="font-mono font-bold text-xs text-surface-400">
                          Booking #{booking.id.slice(0, 8).toUpperCase()}
                        </span>

                        {booking.whatsappTriggerStatus === 'Failed' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                            WhatsApp Failed
                          </span>
                        )}
                      </div>

                      {/* Explicit Why Explanation & Risk Summary */}
                      <div className="space-y-0.5 pt-0.5">
                        <p className="text-xs font-medium text-surface-300 flex flex-wrap items-center gap-1.5">
                          <span className="text-surface-500 font-semibold uppercase text-[10px] tracking-wider font-mono">Status Factor:</span>
                          <span
                            className={cn(
                              'font-bold',
                              intel.statusTier === 'ACTION REQUIRED' && 'text-danger-400',
                              intel.statusTier === 'DELAYED' && 'text-rose-400',
                              intel.statusTier === 'ATTENTION REQUIRED' && 'text-amber-400',
                              intel.statusTier === 'LOW RISK' && 'text-sky-400',
                              intel.statusTier === 'ON TRACK' && 'text-emerald-400',
                              intel.statusTier === 'COMPLETED' && 'text-emerald-400'
                            )}
                          >
                            {intel.whyReason}
                          </span>
                        </p>
                        {intel.riskSummary && (
                          <p className="text-[11px] text-surface-400">
                            {intel.riskSummary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {booking.truck?.user?.phone && (
                        <a
                          href={whatsappLink(
                            booking.truck.user.phone,
                            `Hi ${booking.truck.user.name || 'Transporter'}, regarding Booking #${booking.id}: checking trip progress.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold transition-colors"
                          title="WhatsApp Driver"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <Link
                        href={`/booking/${booking.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-900/80 hover:bg-surface-800 text-white text-xs font-bold transition-colors border border-white/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none"
                      >
                        <span>Deep Tracking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Row 2: Route & Checkpoint Milestone Progression */}
                  <div className="bg-surface-950/80 rounded-2xl p-4 sm:p-5 border border-white/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-surface-400">
                          HIGHWAY LOGISTICS CORRIDOR
                        </div>
                        <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mt-0.5">
                          <span>{booking.load?.loadingAddress || 'Origin'}</span>
                          <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" />
                          <span>{booking.load?.unloadingAddress || 'Destination'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400">
                          PROGRESSION
                        </div>
                        <div className="text-sm sm:text-base font-bold font-mono text-primary-400">
                          {intel.progressPercent}% Corridor Completed
                        </div>
                      </div>
                    </div>

                    {/* Checkpoint Milestone Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-surface-400 font-mono">
                        <span>Highway Checkpoint Progression</span>
                        <span className="text-white font-semibold">
                          Checkpoint {intel.crossedCount} of {intel.totalCheckpoints} passed
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {['Loading Hub', 'Corridor Toll 1', 'Transit Hub', 'State Border', 'Unloading Point'].map(
                          (cpName, idx) => {
                            const isDone = idx < intel.crossedCount
                            const isCurrent = idx === intel.crossedCount - 1
                            return (
                              <div key={idx} className="space-y-1">
                                <div
                                  className={cn(
                                    'h-2 rounded-full transition-colors',
                                    isDone
                                      ? 'bg-emerald-500 shadow-glow-primary'
                                      : isCurrent
                                      ? 'bg-primary-500 shadow-glow-primary'
                                      : 'bg-surface-800'
                                  )}
                                />
                                <span className="block text-[10px] font-mono text-surface-400 truncate">
                                  {cpName}
                                </span>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: 3-Stat Telemetry Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Last Checkpoint */}
                    <div className="bg-surface-950/80 rounded-xl p-3.5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                        LAST CHECKPOINT
                      </span>
                      <span className="font-bold text-white block truncate text-xs sm:text-sm">
                        📍 {intel.currentLocationName}
                      </span>
                      <span className="text-[10px] text-surface-400 block font-mono">
                        Checkpoint {intel.crossedCount}/{intel.totalCheckpoints} passed
                      </span>
                    </div>

                    {/* Next Milestone & ETA */}
                    <div className="bg-surface-950/80 rounded-xl p-3.5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                        NEXT MILESTONE & ETA
                      </span>
                      <span className="font-bold text-white block truncate text-xs sm:text-sm">
                        🎯 {intel.nextMilestoneName}
                      </span>
                      <span className="text-[10px] text-primary-400 font-mono font-bold block">
                        ⏱️ {intel.estimatedArrival} (Indicative ETA)
                      </span>
                    </div>

                    {/* Commercial Terms */}
                    <div className="bg-surface-950/80 rounded-xl p-3.5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                        COMMERCIAL TERMS ({formatINR(Number(booking.agreedPrice))})
                      </span>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-surface-400">50% Advance:</span>
                        <span
                          className={cn(
                            'font-bold font-mono',
                            booking.advanceConfirmed ? 'text-emerald-400' : 'text-danger-400'
                          )}
                        >
                          {booking.advanceConfirmed ? '✓ Paid' : '⚠️ Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-surface-400">E-Way Bill:</span>
                        <span
                          className={cn(
                            'font-bold font-mono',
                            booking.ewayBillNumber ? 'text-emerald-400' : 'text-amber-400'
                          )}
                        >
                          {booking.ewayBillNumber ? `✓ #${booking.ewayBillNumber}` : '🟡 Missing'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Required Actions Callouts */}
                  {intel.requiredActions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {intel.requiredActions.map((action, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                            action.urgency === 'HIGH'
                              ? 'bg-danger-950/40 border-danger-500/30 text-danger-200'
                              : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle
                              className={cn(
                                'w-5 h-5 shrink-0 mt-0.5',
                                action.urgency === 'HIGH' ? 'text-danger-400' : 'text-amber-400'
                              )}
                            />
                            <div>
                              <span className="font-bold">{action.title}</span>
                              <p
                                className={cn(
                                  'text-[11px] mt-0.5',
                                  action.urgency === 'HIGH'
                                    ? 'text-danger-300/80'
                                    : 'text-amber-300/80'
                                )}
                              >
                                {action.description}
                              </p>
                            </div>
                          </div>

                          {action.actionType === 'CONFIRM_ADVANCE' && isShipper && (
                            <button
                              type="button"
                              disabled={actionLoading === `advance-${booking.id}`}
                              onClick={() => handleConfirmAdvance(booking.id)}
                              className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-xs transition-colors shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer disabled:opacity-60"
                            >
                              {actionLoading === `advance-${booking.id}` ? 'Confirming...' : 'Confirm 50% Advance'}
                            </button>
                          )}

                          {action.actionType === 'CONFIRM_BALANCE' && isShipper && (
                            <button
                              type="button"
                              disabled={actionLoading === `balance-${booking.id}`}
                              onClick={() => handleConfirmBalance(booking.id)}
                              className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-xs transition-colors shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer disabled:opacity-60"
                            >
                              {actionLoading === `balance-${booking.id}` ? 'Confirming...' : 'Confirm Final POD Balance'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explicit Disclaimer Footer */}
                  <div className="text-[10px] font-mono text-surface-400 flex items-center gap-2 pt-2 border-t border-white/5">
                    <Info className="w-3.5 h-3.5 shrink-0 text-primary-400" />
                    <span>
                      GPS location estimated from national highway geofence checkpoints. ETAs are indicative milestone-based estimates.
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Empty State (Zero shipments) ── */
          <div className="bg-panel rounded-2xl border border-white/10 p-10 sm:p-14 text-center space-y-4 shadow-modal">
            <div className="w-16 h-16 rounded-2xl bg-surface-950 text-primary-400 flex items-center justify-center mx-auto border border-white/10">
              <Truck className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              No active shipments in this control category
            </h3>
            <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto leading-relaxed">
              Shipments will automatically appear in the Control Tower as transporters and cargo owners confirm bookings along national freight corridors.
            </p>
            <div className="pt-2">
              {isShipper ? (
                <button
                  type="button"
                  onClick={() => router.push('/post-load')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post a Freight Load</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/search?type=load')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Available Loads</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
