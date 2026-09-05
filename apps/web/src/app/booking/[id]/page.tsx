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
import { api, bookingsApi, matchesApi, type ReturnLoadOpportunity } from '@/lib/api'
import { format } from 'date-fns'
import { Navbar, Footer } from '@/components/layout'
import { Badge, Button, Spinner } from '@/components/ui'
import { assessShipmentIntelligence } from '@/lib/intelligence'
import { ReturnLoadOpportunityCard, DigitalDocumentChainCard } from '@/components/intelligence'
import { BookingComplianceCard } from '@/components/compliance/BookingComplianceCard'
import { normalizeRole } from '@/lib/roles'
import { toast } from '@/lib/toast'
import { cn, formatINR, whatsappLink } from '@/lib/utils'
import { PaymentSplitCard } from '@/components/PaymentSplitCard'
import { RatingModal } from '@/components/RatingModal'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [backhaulOpps, setBackhaulOpps] = useState<ReturnLoadOpportunity[]>([])
  const [returnLoadMeta, setReturnLoadMeta] = useState<{
    hubLabel: string
    radiusKm: number
    contactUnlocked: boolean
    candidatesEvaluated: number
  } | null>(null)
  const [returnLoadsLoading, setReturnLoadsLoading] = useState(false)
  const [returnLoadsError, setReturnLoadsError] = useState('')
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [viewerRole, setViewerRole] = useState<string | undefined>(undefined)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeCategory, setDisputeCategory] = useState('Payment')
  const [disputePriority, setDisputePriority] = useState('Medium')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadBooking()
      loadCurrentUser()
    }
  }, [id])

  const loadCurrentUser = () => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUserId(user.id || '')
        // Normalize at the storage boundary: a session cached before the role
        // cleanup may still hold `load_owner` / `truck_owner` / `driver`.
        setViewerRole(normalizeRole(user.role))
      }
    } catch (err) {
      console.warn('Could not load current user')
    }
  }

  const loadBooking = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/bookings/${id}`)
      const bk = res.data
      setBooking(bk)

      // Check if we need to show rating modal for completed booking
      if (bk.status === 'Completed' && bk.loadOwnerId === currentUserId) {
        try {
          const pendingRatings = await api.get('/ratings/pending')
          const needsRating = pendingRatings.data?.some(
            (pr: any) => pr.bookingId === bk.id
          )
          if (needsRating) {
            setTimeout(() => setShowRatingModal(true), 1000)
          }
        } catch (err) {
          console.warn('Could not check pending ratings:', err)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  // Discovery is isolated from booking actions and only requested for the
  // authenticated truck owner. No sample truck, city, or client-side paywall fallback.
  useEffect(() => {
    setBackhaulOpps([])
    setReturnLoadMeta(null)
    setReturnLoadsError('')
    if (!booking || booking.id !== id || booking.truckOwnerId !== currentUserId || viewerRole !== 'truck_driver') {
      setReturnLoadsLoading(false)
      return
    }
    const truckId = booking.truck?.id || booking.truckId
    if (!truckId) {
      setReturnLoadsLoading(false)
      setReturnLoadsError('No truck is assigned to this booking.')
      return
    }
    const controller = new AbortController()
    const lat = booking.unloadingLat ?? booking.load?.unloadingLat
    const lng = booking.unloadingLng ?? booking.load?.unloadingLng
    const hasDestination = lat !== null && lat !== undefined && lat !== '' &&
      lng !== null && lng !== undefined && lng !== '' &&
      Number.isFinite(Number(lat)) && Math.abs(Number(lat)) <= 90 &&
      Number.isFinite(Number(lng)) && Math.abs(Number(lng)) <= 180

    setReturnLoadsLoading(true)
    matchesApi.getReturnLoads(truckId, {
      limit: 6,
      ...(hasDestination ? { destinationLat: Number(lat), destinationLng: Number(lng) } : {}),
    }, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return
      setBackhaulOpps(data.opportunities)
      setReturnLoadMeta({
        hubLabel: data.anchor.source === 'query_override'
          ? booking.load?.unloadingAddress || booking.unloadingAddress || data.anchor.label
          : data.anchor.label,
        radiusKm: data.radiusKm,
        contactUnlocked: data.contactUnlocked,
        candidatesEvaluated: data.candidatesEvaluated,
      })
      if (data.anchor.source === 'unresolved') setReturnLoadsError(data.anchor.detail)
    }).catch(() => {
      if (!controller.signal.aborted) setReturnLoadsError('Return-load discovery is temporarily unavailable. No local estimates are shown.')
    }).finally(() => {
      if (!controller.signal.aborted) setReturnLoadsLoading(false)
    })
    return () => controller.abort()
  }, [booking, id, currentUserId, viewerRole])

  /**
   * Confirm a payment milestone.
   *
   * The gateway link is best-effort: if a payment link is configured we open
   * it, but the authoritative record of the milestone is the explicit
   * `PATCH /bookings/:id/confirm-advance|confirm-balance` endpoint.
   *
   * Only a *gateway* failure falls through to the milestone confirm. An error
   * from the milestone endpoint itself (403 not the cargo owner, 400 advance
   * already confirmed / balance before advance / cancelled booking) is surfaced
   * to the user rather than being reported as success.
   */
  const confirmMilestone = async (milestone: 'advance' | 'balance') => {
    setActionLoading(milestone)
    try {
      try {
        const response = await api.post('/payments/booking/initialize', {
          bookingId: id,
          paymentType: milestone,
          paymentMethod: 'upi',
        })
        if (response.data?.shortUrl) {
          window.open(response.data.shortUrl, '_blank')
        }
      } catch {
        // Gateway unavailable / not configured — fall through to the explicit
        // milestone endpoint, whose errors are intentionally NOT swallowed.
      }

      if (milestone === 'advance') {
        await bookingsApi.confirmAdvance(id)
      } else {
        await bookingsApi.confirmBalance(id)
      }

      toast.success(
        milestone === 'advance'
          ? '50% loading advance confirmed.'
          : 'Final balance confirmed on POD.'
      )
      loadBooking()
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          `Could not confirm the ${milestone === 'advance' ? 'advance' : 'balance'} payment`
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmAdvance = () => confirmMilestone('advance')
  const handleConfirmBalance = () => confirmMilestone('balance')

  const handleRaiseDispute = async (event: React.FormEvent) => {
    event.preventDefault()
    if (disputeDescription.trim().length < 10) {
      toast.error('Please describe the issue in at least 10 characters')
      return
    }
    setDisputeLoading(true)
    try {
      await api.post(`/bookings/${id}/disputes`, {
        category: disputeCategory,
        priority: disputePriority,
        description: disputeDescription.trim(),
      })
      toast.success('Dispute submitted to LorryCarry operations')
      setDisputeOpen(false)
      setDisputeDescription('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not submit dispute')
    } finally {
      setDisputeLoading(false)
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
  const isLoadOwner = booking.loadOwnerId === currentUserId

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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDisputeOpen(true)}
              className="text-xs font-bold border-danger-500/30 text-danger-300 hover:bg-danger-950/30"
            >
              Report an issue
            </Button>
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
                  intelligence.statusTier === 'DELAYED' && 'text-danger-400 font-black',
                  intelligence.statusTier === 'ATTENTION REQUIRED' && 'text-amber-400 font-black',
                  intelligence.statusTier === 'LOW RISK' && 'text-sky-400 font-black',
                  intelligence.statusTier === 'ON TRACK' && 'text-emerald-400 font-black',
                  intelligence.statusTier === 'COMPLETED' && 'text-emerald-400 font-black'
                )}>
                  {intelligence.whyReason}
                </span>
              </p>
              {intelligence.riskSummary && (
                <p className="text-xs text-surface-400 mt-1">
                  {intelligence.riskSummary}
                </p>
              )}
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
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
                    action.urgency === 'HIGH'
                      ? "bg-danger-950/40 border-danger-500/30 text-danger-200"
                      : "bg-amber-950/40 border-amber-500/30 text-amber-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className={cn(
                      "w-5 h-5 shrink-0 mt-0.5",
                      action.urgency === 'HIGH' ? "text-danger-400" : "text-amber-400"
                    )} />
                    <div>
                      <span className="font-bold">{action.title}</span>
                      <p className={cn(
                        "text-[11px] mt-0.5",
                        action.urgency === 'HIGH' ? "text-danger-300/80" : "text-amber-300/80"
                      )}>{action.description}</p>
                    </div>
                  </div>

                  {action.actionType === 'CONFIRM_ADVANCE' && isLoadOwner && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading === 'advance'}
                      onClick={handleConfirmAdvance}
                      className="shrink-0 text-xs font-bold py-2 shadow-glow-primary"
                    >
                      Pay 50% Advance via UPI
                    </Button>
                  )}

                  {action.actionType === 'CONFIRM_BALANCE' && isLoadOwner && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading === 'balance'}
                      onClick={handleConfirmBalance}
                      className="shrink-0 text-xs font-bold py-2 shadow-glow-primary"
                    >
                      Pay Final Balance
                    </Button>
                  )}

                  {action.actionType === 'WHATSAPP_RETRY' && booking.truck?.user?.phone && (
                    <a
                      href={whatsappLink(
                        booking.truck.user.phone,
                        `Hi ${booking.truck.user.name || 'Transporter'}, regarding Booking #${booking.id}: please update your trip status.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-glow-primary"
                    >
                      <span>💬 Direct WhatsApp</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Payment Split Card with Razorpay Integration ── */}
        {currentUserId && (
          <PaymentSplitCard
            booking={booking}
            currentUserId={currentUserId}
            onPaymentComplete={loadBooking}
          />
        )}

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

        {/* ── VERIFICATION & COMPLIANCE (Vahan RC · Insurance · E-Way Bill · FASTag) ── */}
        <BookingComplianceCard bookingId={booking.id} viewerRole={viewerRole} />

        {/* ── DIGITAL FREIGHT DOCUMENT CHAIN (real booking document API) ── */}
        <DigitalDocumentChainCard
          bookingId={booking.id}
          bookingNumber={booking.id.slice(0, 8).toUpperCase()}
          factoryOwnerName={booking.load?.user?.name}
          truckRegNumber={booking.truck?.registrationNumber}
          ewayBillNumber={booking.ewayBillNumber || undefined}
          viewerRole={viewerRole}
          onRefresh={loadBooking}
        />

        {/* Potential Return Load Opportunities — vehicle owner only */}
        {booking.truckOwnerId === currentUserId && viewerRole === 'truck_driver' && <div className="bg-panel rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">
                  Potential Return Load Opportunities
                </h2>
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Capture return freight originating near {returnLoadMeta?.hubLabel || booking.unloadingAddress || 'destination terminal'} to eliminate empty deadhead runs.
              </p>
              {returnLoadMeta && (
                <p className="text-[11px] font-mono text-surface-500 mt-1">
                  {`Ranked by the return-load engine · ${returnLoadMeta.candidatesEvaluated} nearby load(s) evaluated within ${returnLoadMeta.radiusKm} km`}
                  {!returnLoadMeta.contactUnlocked
                    ? ' · shipper contacts locked until you subscribe'
                    : ''}
                </p>
              )}
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
                      opp.contact.locked ? '/subscription' : `/search?type=load&location=${encodeURIComponent(opp.loadingAddress)}`
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-surface-950/60 border border-white/5 text-center space-y-3">
              <p className="text-xs font-mono text-surface-400">
                {returnLoadsLoading
                  ? 'Searching the live load board for nearby return freight…'
                  : returnLoadsError || `No eligible return loads within ${returnLoadMeta?.radiusKm || 50} km of this hub right now.`}
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
        </div>}

        {disputeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Report a booking issue">
            <div className="bg-panel border border-white/10 rounded-[20px] shadow-modal max-w-lg w-full p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-danger-300 font-mono font-bold">Booking support case</span>
                  <h2 className="text-xl font-black text-white mt-1">Report an issue</h2>
                  <p className="text-xs text-surface-400 mt-1">Our operations team will review the evidence and contact both parties.</p>
                </div>
                <button type="button" onClick={() => setDisputeOpen(false)} className="text-surface-400 hover:text-white p-1" aria-label="Close report issue dialog">✕</button>
              </div>
              <form onSubmit={handleRaiseDispute} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-surface-300">Issue type
                    <select value={disputeCategory} onChange={(event) => setDisputeCategory(event.target.value)} className="input mt-1.5">
                      <option value="Payment">Payment</option><option value="Delay">Transit delay</option><option value="CargoDamage">Cargo damage</option><option value="Document">Documentation</option><option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-surface-300">Priority
                    <select value={disputePriority} onChange={(event) => setDisputePriority(event.target.value)} className="input mt-1.5">
                      <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-bold text-surface-300">What happened?
                  <textarea value={disputeDescription} onChange={(event) => setDisputeDescription(event.target.value)} className="input mt-1.5 min-h-[120px] resize-none" placeholder="Share dates, payment references, checkpoint details, or cargo evidence..." required minLength={10} maxLength={2000} />
                </label>
                <div className="flex justify-end gap-2 pt-2 border-t border-white/10"><Button type="button" variant="ghost" size="sm" onClick={() => setDisputeOpen(false)}>Cancel</Button><Button type="submit" variant="danger" size="sm" loading={disputeLoading}>Submit dispute</Button></div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Rating Modal for Factory Owner */}
      {showRatingModal && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          booking={{
            id: booking.id,
            truckOwnerId: booking.truckOwnerId,
            truckOwnerName: booking.truck?.user?.name || 'Driver',
            truckRegistrationNumber: booking.truck?.registrationNumber,
            loadOwnerName: booking.load?.user?.name || 'Factory Owner',
          }}
          onRatingSubmitted={() => {
            setShowRatingModal(false)
            loadBooking()
          }}
        />
      )}

      <Footer />
    </div>
  )
}
