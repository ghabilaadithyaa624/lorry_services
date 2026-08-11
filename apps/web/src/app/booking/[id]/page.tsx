'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPinIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { Navbar, Footer } from '@/components/layout'
import { Card, Badge, Button, Spinner } from '@/components/ui'
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
      <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm font-semibold text-surface-500">Loading shipment tracking intelligence...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card padding="lg" className="max-w-md w-full text-center space-y-4 shadow-elevated">
            <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-950/50 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Booking Not Found</h2>
            <p className="text-xs sm:text-sm text-surface-500">{error || 'The requested booking details could not be found.'}</p>
            <div className="pt-2">
              <Button variant="primary" size="md" onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  const intelligence = assessShipmentIntelligence(booking)

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark text-surface-900 dark:text-surface-100 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 text-surface-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-surface-900 dark:text-white">
                  Trip Tracking & Shipment Intelligence
                </h1>
                <Badge variant={intelligence.badgeVariant} size="sm">
                  {intelligence.statusTier}
                </Badge>
              </div>
              <p className="text-xs text-surface-500 font-mono mt-0.5">
                Booking ID: {booking.id}
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>💬 WhatsApp Driver</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Shipment Risk & Operational Intelligence Card ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-primary-500 shrink-0" />
                <h2 className="text-sm font-bold text-surface-900 dark:text-white">
                  Operational Control Risk: {intelligence.statusTier}
                </h2>
              </div>
              <p className="text-xs font-bold text-surface-700 dark:text-surface-300">
                <span>Why: </span>
                <span className={cn(
                  intelligence.statusTier === 'ACTION REQUIRED' && 'text-danger-600 dark:text-danger-400 font-black',
                  intelligence.statusTier === 'ATTENTION REQUIRED' && 'text-amber-600 dark:text-amber-400 font-black',
                  intelligence.statusTier === 'ON TRACK' && 'text-emerald-600 dark:text-emerald-400 font-black'
                )}>
                  {intelligence.whyReason}
                </span>
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-surface-500">
              {intelligence.progressPercent}% Corridor Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-100 dark:bg-surface-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-primary-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${intelligence.progressPercent}%` }}
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block text-[10px] uppercase font-bold">Last Recorded Checkpoint</span>
              <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{intelligence.currentLocationName}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block text-[10px] uppercase font-bold">Next Highway Milestone</span>
              <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{intelligence.nextMilestoneName}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block text-[10px] uppercase font-bold">Estimated Time Remaining</span>
              <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{intelligence.estimatedArrival}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block text-[10px] uppercase font-bold">E-Way Bill Status</span>
              <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">
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
                  className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-200">{action.title}</span>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">{action.description}</p>
                    </div>
                  </div>

                  {action.actionType === 'CONFIRM_ADVANCE' && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading === 'advance'}
                      onClick={handleConfirmAdvance}
                      className="shrink-0 text-xs font-bold py-1.5"
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
                      className="shrink-0 text-xs font-bold py-1.5"
                    >
                      Confirm Final POD Balance
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 5-Stage Checkpoint Timeline ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-primary-500" />
              <h2 className="text-sm font-bold text-surface-900 dark:text-white">
                5-Stage National Highway Milestones
              </h2>
            </div>
            <span className="text-xs text-surface-400 font-medium">
              Geofence Checkpoint Verification
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {booking.checkpoints && booking.checkpoints.length > 0 ? (
              booking.checkpoints.map((cp: any, idx: number) => {
                const isCrossed = Boolean(cp.crossedAt || cp.crossed)
                return (
                  <div key={cp.seq || idx} className="flex items-start gap-4">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border',
                      isCrossed
                        ? 'bg-success-500 text-white border-success-500'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-400 border-surface-200 dark:border-surface-700'
                    )}>
                      {isCrossed ? '✓' : cp.seq || idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 pb-3 border-b border-surface-100 dark:border-surface-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-surface-900 dark:text-white">
                          {cp.name || `Milestone ${cp.seq || idx + 1}`}
                        </span>
                        <span className="text-[11px] text-surface-400 font-mono">
                          {isCrossed
                            ? cp.crossedAt
                              ? format(new Date(cp.crossedAt), 'dd MMM, hh:mm a')
                              : 'Passed'
                            : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-500 mt-0.5">
                        {isCrossed
                          ? 'Vehicle verified past geofenced checkpoint zone'
                          : 'Awaiting arrival at highway corridor waypoint'}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-center text-xs text-surface-500">
                Checkpoints will automatically populate as vehicle begins transit along national highway corridor.
              </div>
            )}
          </div>
        </div>

        {/* ── Commercial Terms Overview ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400">
            50/50 Direct Commercial Terms
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block">Total Agreed Freight</span>
              <span className="text-base font-black text-surface-900 dark:text-white mt-1 block">
                {formatINR(Number(booking.agreedPrice))}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block">50% Loading Advance</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-black text-surface-900 dark:text-white">
                  {formatINR(Math.round(Number(booking.agreedPrice) * 0.5))}
                </span>
                <Badge variant={booking.advanceConfirmed ? 'success' : 'warning'} size="sm">
                  {booking.advanceConfirmed ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-400 block">50% Delivery Balance (POD)</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-black text-surface-900 dark:text-white">
                  {formatINR(Number(booking.agreedPrice) - Math.round(Number(booking.agreedPrice) * 0.5))}
                </span>
                <Badge variant={booking.balanceConfirmed ? 'success' : 'default'} size="sm">
                  {booking.balanceConfirmed ? 'Settled' : 'On POD'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ── DIGITAL FREIGHT DOCUMENT CHAIN (PHASE 9) ── */}
        <DigitalDocumentChainCard
          bookingId={booking.id}
          bookingNumber={booking.id.slice(0, 8).toUpperCase()}
          loadOwnerName={booking.load?.user?.name || 'Cargo Owner'}
          truckRegNumber={booking.truck?.registrationNumber || 'MH 12 QT 8492'}
          status={booking.status}
          advanceConfirmed={Boolean(booking.advanceConfirmed)}
          balanceConfirmed={Boolean(booking.balanceConfirmed)}
          onRefresh={loadBooking}
        />
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-100 dark:border-surface-800">
            <div>
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-base font-bold text-surface-900 dark:text-white">
                  Potential Return Load Opportunities
                </h2>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
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
              className="font-bold text-xs shrink-0"
              leftIcon={<ArrowPathIcon className="w-4 h-4 text-purple-500" />}
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
            <div className="p-6 rounded-xl bg-surface-50 dark:bg-surface-800/40 text-center space-y-3">
              <p className="text-xs text-surface-500">
                Searching real-time load board for potential return freight near {booking.unloadingAddress || 'destination'}...
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/search?type=load&sort=RETURN_LOAD')}
                className="text-xs font-bold"
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
