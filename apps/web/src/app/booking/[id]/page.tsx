'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPinIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowPathIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { Navbar, Footer } from '@/components/layout'
import { Badge, Button, Spinner } from '@/components/ui'
import { assessShipmentIntelligence } from '@/lib/intelligence'
import { ReturnLoadOpportunityCard, DigitalDocumentChainCard } from '@/components/intelligence'
import { evaluateBackhaulOpportunities, BackhaulOpportunity } from '@/lib/intelligence/matchingEngine'
import { toast } from '@/lib/toast'
import { cn, formatINR, whatsappLink } from '@/lib/utils'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [backhaulOpps, setBackhaulOpps] = useState<BackhaulOpportunity[]>([])

  useEffect(() => {
    if (id) {
      loadBooking()
    }
  }, [id])

  const loadBooking = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/bookings/${id}`)
      const bk = res.data
      setBooking(bk)

      // Discover potential return loads from destination hub
      try {
        const destLat = bk.unloadingLat || bk.load?.unloadingLat || 12.9716
        const destLng = bk.unloadingLng || bk.load?.unloadingLng || 77.5946
        const loadsRes = await api.get(`/search/loads?lat=${destLat}&lng=${destLng}&radius=150`)
        const openLoads = loadsRes.data || []
        
        const mockTruck = {
          id: bk.truck?.id || 'truck-active',
          bodyType: bk.truck?.truckType || bk.truck?.bodyType || 'Open',
          currentLat: destLat,
          currentLng: destLng,
          tonnageCapacity: Number(bk.truck?.capacityTons) || 16,
          verificationStatus: 'Verified',
          preferredDestinations: [bk.loadingAddress || 'Origin'],
        }

        const opps = evaluateBackhaulOpportunities(
          mockTruck,
          openLoads,
          { lat: destLat, lng: destLng, label: bk.unloadingAddress || 'Destination' }
        )
        setBackhaulOpps(opps)
      } catch (err) {
        console.warn('Could not fetch return loads:', err)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAdvance = async () => {
    try {
      setActionLoading('advance')
      await api.patch(`/bookings/${id}/confirm-advance`)
      toast.success('50% Loading advance confirmed successfully!')
      loadBooking()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm advance')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmBalance = async () => {
    try {
      setActionLoading('balance')
      await api.patch(`/bookings/${id}/confirm-balance`)
      toast.success('Delivery balance confirmed successfully!')
      loadBooking()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm balance')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-surface-100 flex flex-col justify-between font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs font-mono font-bold text-surface-400 uppercase tracking-widest">Loading deal room & tracking intelligence...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-canvas text-surface-100 flex flex-col justify-between font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-panel rounded-[20px] border border-white/10 p-8 max-w-md w-full text-center space-y-4 shadow-modal">
            <div className="w-14 h-14 rounded-2xl bg-danger-950/50 text-danger-400 flex items-center justify-center mx-auto text-2xl border border-danger-900/60">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
            <p className="text-xs sm:text-sm text-surface-400">{error || 'The requested booking details could not be found.'}</p>
            <div className="pt-2">
              <Button variant="primary" size="md" onClick={() => router.push('/tracking')}>
                Return to Active Shipments
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const intelligence = assessShipmentIntelligence(booking)

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col justify-between font-sans selection:bg-primary-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-surface-900/80 border border-white/10 hover:bg-white/5 text-surface-300 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Trip Tracking & Deal Intelligence
                </h1>
                <Badge variant={intelligence.badgeVariant} size="sm" className="font-mono text-[10px]">
                  {intelligence.statusTier}
                </Badge>
              </div>
              <p className="text-xs font-mono text-surface-400 mt-1">
                Booking ID: <span className="text-white font-bold">{booking.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {booking.truck?.user?.phone && (
              <a
                href={whatsappLink(
                  booking.truck.user.phone,
                  `Hi ${booking.truck.user.name || 'Transporter'}, checking in on shipment progress for Booking #${booking.id}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-glow-primary"
              >
                <span>💬 WhatsApp Driver</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Shipment Risk & Operational Intelligence Card ── */}
        <div className="bg-panel rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-primary-400 shrink-0" />
                <h2 className="text-base font-bold text-white">
                  Operational Control Risk: {intelligence.statusTier}
                </h2>
              </div>
              <p className="text-xs font-bold text-surface-300">
                <span>Why: </span>
                <span className={cn(
                  intelligence.statusTier === 'ACTION REQUIRED' && 'text-danger-400 font-black',
                  intelligence.statusTier === 'ATTENTION REQUIRED' && 'text-amber-400 font-black',
                  intelligence.statusTier === 'ON TRACK' && 'text-emerald-400 font-black'
                )}>
                  {intelligence.whyReason}
                </span>
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
              {intelligence.progressPercent}% Corridor Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-950 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-primary-500 h-full rounded-full transition-all duration-500 shadow-glow-primary"
              style={{ width: `${intelligence.progressPercent}%` }}
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] font-mono uppercase tracking-widest">Last Checkpoint</span>
              <span className="font-bold text-white block truncate">{intelligence.currentLocationName}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] font-mono uppercase tracking-widest">Next Milestone</span>
              <span className="font-bold text-white block truncate">{intelligence.nextMilestoneName}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] font-mono uppercase tracking-widest">Estimated ETA</span>
              <span className="font-bold text-primary-400 font-mono block">{intelligence.estimatedArrival}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] font-mono uppercase tracking-widest">E-Way Bill</span>
              <span className="font-bold text-emerald-400 font-mono block">
                {booking.ewayBillNumber ? `✓ #${booking.ewayBillNumber}` : 'Pending Entry'}
              </span>
            </div>
          </div>

          {/* Action Alerts */}
          {intelligence.requiredActions.length > 0 && (
            <div className="space-y-2 pt-2">
              {intelligence.requiredActions.map((action, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-200">{action.title}</span>
                      <p className="text-amber-300/80 text-[11px] mt-0.5">{action.description}</p>
                    </div>
                  </div>

                  {action.actionType === 'CONFIRM_ADVANCE' && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading === 'advance'}
                      onClick={handleConfirmAdvance}
                      className="shrink-0 text-xs font-bold py-2 shadow-glow-primary"
                    >
                      Confirm 50% Advance
                    </Button>
                  )}

                  {action.actionType === 'CONFIRM_BALANCE' && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading === 'balance'}
                      onClick={handleConfirmBalance}
                      className="shrink-0 text-xs font-bold py-2 shadow-glow-primary"
                    >
                      Confirm Final POD Balance
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Commercial Terms Overview ── */}
        <div className="bg-panel rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <CurrencyRupeeIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              50/50 Direct Commercial Terms
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] uppercase tracking-widest">Total Agreed Freight</span>
              <span className="text-lg font-black text-white mt-1 block">
                {formatINR(Number(booking.agreedPrice))}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] uppercase tracking-widest">50% Loading Advance</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-black text-white">
                  {formatINR(Math.round(Number(booking.agreedPrice) * 0.5))}
                </span>
                <Badge variant={booking.advanceConfirmed ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                  {booking.advanceConfirmed ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1">
              <span className="text-surface-400 block text-[10px] uppercase tracking-widest">50% Delivery Balance</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-black text-white">
                  {formatINR(Number(booking.agreedPrice) - Math.round(Number(booking.agreedPrice) * 0.5))}
                </span>
                <Badge variant={booking.balanceConfirmed ? 'success' : 'default'} size="sm" className="font-mono text-[10px]">
                  {booking.balanceConfirmed ? 'Settled' : 'On POD'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5-Stage Checkpoint Timeline ── */}
        <div className="bg-panel rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-base font-bold text-white">
                5-Stage National Highway Milestones
              </h2>
            </div>
            <span className="text-xs font-mono text-surface-400">
              Geofence Checkpoint Verification
            </span>
          </div>

          <div className="space-y-4">
            {booking.checkpoints && booking.checkpoints.length > 0 ? (
              booking.checkpoints.map((cp: any, idx: number) => {
                const isCrossed = Boolean(cp.crossedAt || cp.crossed)
                return (
                  <div key={cp.seq || idx} className="flex items-start gap-4">
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border',
                      isCrossed
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-glow-primary'
                        : 'bg-surface-950 text-surface-500 border-white/10'
                    )}>
                      {isCrossed ? '✓' : cp.seq || idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 pb-4 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">
                          {cp.name || `Milestone ${cp.seq || idx + 1}`}
                        </span>
                        <span className="text-xs font-mono text-surface-400">
                          {isCrossed
                            ? cp.crossedAt
                              ? format(new Date(cp.crossedAt), 'dd MMM, hh:mm a')
                              : 'Passed'
                            : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 mt-1">
                        {isCrossed
                          ? 'Vehicle verified past geofenced checkpoint zone'
                          : 'Awaiting arrival at highway corridor waypoint'}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-5 rounded-2xl bg-surface-950/60 border border-white/5 text-center text-xs text-surface-400 font-mono">
                Checkpoints will automatically populate as vehicle begins transit along national highway corridor.
              </div>
            )}
          </div>
        </div>

        {/* ── DIGITAL FREIGHT DOCUMENT CHAIN ── */}
        <DigitalDocumentChainCard
          bookingId={booking.id}
          bookingNumber={booking.id.slice(0, 8).toUpperCase()}
          factoryOwnerName={booking.load?.user?.name || 'Cargo Owner'}
          truckRegNumber={booking.truck?.registrationNumber || 'MH 12 QT 8492'}
          status={booking.status}
          advanceConfirmed={Boolean(booking.advanceConfirmed)}
          balanceConfirmed={Boolean(booking.balanceConfirmed)}
          onRefresh={loadBooking}
        />

        {/* Potential Return Load Opportunities */}
        <div className="bg-panel rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">
                  Potential Return Load Opportunities
                </h2>
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Capture return freight originating near {booking.unloadingAddress || 'destination terminal'} to eliminate empty deadhead runs.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                router.push(
                  `/search?type=load&sort=RETURN_LOAD&location=${encodeURIComponent(
                    booking.unloadingAddress || ''
                  )}`
                )
              }
              className="font-bold text-xs shrink-0 border-white/10 hover:border-white/20"
              leftIcon={<ArrowPathIcon className="w-4 h-4 text-purple-400" />}
            >
              Find Return Loads
            </Button>
          </div>

          {backhaulOpps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {backhaulOpps.slice(0, 3).map((opp) => (
                <ReturnLoadOpportunityCard
                  key={opp.loadId}
                  opportunity={opp}
                  onConnect={() =>
                    router.push(
                      `/search?type=load&location=${encodeURIComponent(opp.loadingAddress)}`
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-surface-950/60 border border-white/5 text-center space-y-3">
              <p className="text-xs font-mono text-surface-400">
                Searching real-time load board for potential return freight near {booking.unloadingAddress || 'destination'}...
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/search?type=load&sort=RETURN_LOAD')}
                className="text-xs font-bold shadow-glow-primary"
              >
                Browse All Potential Return Loads
              </Button>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  )
}
