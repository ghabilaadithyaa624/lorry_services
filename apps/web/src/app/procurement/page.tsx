'use client'

import React, { useState } from 'react'
import {
  PlusCircleIcon,
  TrophyIcon,
  ScaleIcon,
  ShieldCheckIcon,
  XMarkIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { Badge, Button } from '@/components/ui'
import { formatINR, cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export interface ProcurementRffItem {
  id: string
  title: string
  origin: string
  destination: string
  tonnage: number
  truckType: string
  monthlyVolume: number
  targetPrice: number
  biddingDeadline: string
  status: 'OPEN_FOR_BIDS' | 'UNDER_EVALUATION' | 'AWARDED' | 'EXPIRED'
  bidsCount: number
  invitedCarriersCount: number
  winningCarrierName?: string
  awardedPrice?: number
}

export interface ProcurementBidItem {
  id: string
  rffId: string
  carrierOrgName: string
  carrierRating: number
  verifiedFleet: boolean
  quoteAmount: number
  ratePerTonKm: number
  leadTimeHours: number
  matchScorePercent: number
  status: 'SUBMITTED' | 'COUNTER_OFFERED' | 'ACCEPTED' | 'AWARDED' | 'REJECTED'
  notes?: string
}

export default function ProcurementPage() {
  const [selectedRff, setSelectedRff] = useState<ProcurementRffItem | null>(null)
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false)
  const [createRffModalOpen, setCreateRffModalOpen] = useState(false)
  const [negotiateModalOpen, setNegotiateModalOpen] = useState(false)
  const [activeBidForCounter, setActiveBidForCounter] = useState<ProcurementBidItem | null>(null)
  const [counterAmountInput, setCounterAmountInput] = useState('')
  const [counterNotes, setCounterNotes] = useState('')

  // Form State for RFF creation
  const [rffOrigin, setRffOrigin] = useState('Chennai Port Hub')
  const [rffDestination, setRffDestination] = useState('Bengaluru ICD Terminal')
  const [rffTonnage, setRffTonnage] = useState('20')
  const [rffTruckType, setRffTruckType] = useState('Container')
  const [rffMonthlyVolume, setRffMonthlyVolume] = useState('100')
  const [rffTargetPrice, setRffTargetPrice] = useState('31000')
  const [creatingRff, setCreatingRff] = useState(false)

  // Sample procurement requests
  const [rffList, setRffList] = useState<ProcurementRffItem[]>([
    {
      id: 'rff-101-maa-blr',
      title: 'Chennai ➔ Bengaluru Annual Freight Procurement',
      origin: 'Chennai Industrial Zone, TN',
      destination: 'Peenya ICD Terminal, Bengaluru, KA',
      tonnage: 20,
      truckType: 'Closed Container',
      monthlyVolume: 100,
      targetPrice: 31000,
      biddingDeadline: '2026-08-20T18:00:00Z',
      status: 'OPEN_FOR_BIDS',
      bidsCount: 3,
      invitedCarriersCount: 8,
    },
    {
      id: 'rff-102-pnq-bom',
      title: 'Pune ➔ Mumbai Port Daily Container Contract',
      origin: 'Chakan Industrial Area, Pune, MH',
      destination: 'JNPT Port Container Yard, Mumbai, MH',
      tonnage: 16,
      truckType: 'Open Body',
      monthlyVolume: 45,
      targetPrice: 18500,
      biddingDeadline: '2026-08-15T18:00:00Z',
      status: 'AWARDED',
      bidsCount: 5,
      invitedCarriersCount: 12,
      winningCarrierName: 'VRL Logistics Fleet Enterprise',
      awardedPrice: 17900,
    },
  ])

  // Sealed bids for rff-101
  const [bids, setBids] = useState<ProcurementBidItem[]>([
    {
      id: 'bid-301',
      rffId: 'rff-101-maa-blr',
      carrierOrgName: 'Southern Fleet Logistics Pvt Ltd',
      carrierRating: 4.9,
      verifiedFleet: true,
      quoteAmount: 30800,
      ratePerTonKm: 4.40,
      leadTimeHours: 12,
      matchScorePercent: 98,
      status: 'SUBMITTED',
      notes: 'Guaranteed 20T container availability. GPS tracking link provided.',
    },
    {
      id: 'bid-302',
      rffId: 'rff-101-maa-blr',
      carrierOrgName: 'Deccan Express Carriers Enterprise',
      carrierRating: 4.7,
      verifiedFleet: true,
      quoteAmount: 31500,
      ratePerTonKm: 4.50,
      leadTimeHours: 18,
      matchScorePercent: 94,
      status: 'SUBMITTED',
      notes: 'Dedicated 24/7 fleet control tower monitoring.',
    },
    {
      id: 'bid-303',
      rffId: 'rff-101-maa-blr',
      carrierOrgName: 'National Intermodal Transport Ltd',
      carrierRating: 4.8,
      verifiedFleet: true,
      quoteAmount: 32100,
      ratePerTonKm: 4.59,
      leadTimeHours: 24,
      matchScorePercent: 91,
      status: 'SUBMITTED',
      notes: 'Includes comprehensive transit cargo insurance endorsement.',
    },
  ])

  const handleCreateRff = (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingRff(true)
    setTimeout(() => {
      const newRff: ProcurementRffItem = {
        id: `rff-${Date.now()}`,
        title: `${rffOrigin} ➔ ${rffDestination} Freight RFF`,
        origin: rffOrigin,
        destination: rffDestination,
        tonnage: parseFloat(rffTonnage) || 20,
        truckType: rffTruckType,
        monthlyVolume: parseInt(rffMonthlyVolume, 10) || 100,
        targetPrice: parseFloat(rffTargetPrice) || 31000,
        biddingDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'OPEN_FOR_BIDS',
        bidsCount: 0,
        invitedCarriersCount: 5,
      }

      setRffList([newRff, ...rffList])
      setCreatingRff(false)
      setCreateRffModalOpen(false)
      toast.success('B2B Request for Freight (RFF) published to verified carrier networks!')
    }, 1000)
  }

  const handleAwardBid = (bid: ProcurementBidItem) => {
    if (!selectedRff) return

    setRffList((prev) =>
      prev.map((rff) =>
        rff.id === selectedRff.id
          ? {
              ...rff,
              status: 'AWARDED',
              winningCarrierName: bid.carrierOrgName,
              awardedPrice: bid.quoteAmount,
            }
          : rff
      )
    )

    setBids((prev) =>
      prev.map((b) => (b.id === bid.id ? { ...b, status: 'AWARDED' } : { ...b, status: 'REJECTED' }))
    )

    setComparisonModalOpen(false)
    toast.success(`Freight Contract Awarded to ${bid.carrierOrgName} at ${formatINR(bid.quoteAmount)} per trip!`)
  }

  const handleSendCounterOffer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBidForCounter) return
    const amt = parseFloat(counterAmountInput)
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid counter-offer price')
      return
    }

    setBids((prev) =>
      prev.map((b) =>
        b.id === activeBidForCounter.id
          ? {
              ...b,
              quoteAmount: amt,
              status: 'COUNTER_OFFERED',
              notes: `Counter-offer sent by Shipper: ${formatINR(amt)}. Notes: ${counterNotes}`,
            }
          : b
      )
    )

    setNegotiateModalOpen(false)
    toast.success(`Counter-offer of ${formatINR(amt)} transmitted to ${activeBidForCounter.carrierOrgName}!`)
  }

  return (
    <DashboardLayout
      title="Digital Freight Procurement (B2B RFF)"
      subtitle="Corporate freight sourcing, carrier bidding, side-by-side quote comparison, and contract awarding."
      action={
        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateRffModalOpen(true)}
          leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
          className="font-bold text-xs"
        >
          Create Freight RFF
        </Button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ── B2B PROCUREMENT SUMMARY KPI HEADER ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[10px] text-surface-400 font-black uppercase tracking-wider block">
              Active Sourcing RFFs
            </span>
            <span className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white mt-1 block">
              {rffList.filter((r) => r.status === 'OPEN_FOR_BIDS').length}
            </span>
            <span className="text-[11px] text-surface-500 font-medium">Bidding in progress</span>
          </div>

          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-wider block">
              Carrier Quotes Received
            </span>
            <span className="text-2xl sm:text-3xl font-black text-primary-600 dark:text-primary-400 mt-1 block">
              {bids.length}
            </span>
            <span className="text-[11px] text-primary-600 font-medium">Sealed bids evaluated</span>
          </div>

          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider block">
              Awarded Contracts
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {rffList.filter((r) => r.status === 'AWARDED').length}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Verified Carrier Awards</span>
          </div>

          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-wider block">
              Total Contract Volume
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
              145 Shipments/Mo
            </span>
            <span className="text-[11px] text-purple-600 font-medium">Guaranteed monthly volume</span>
          </div>
        </div>

        {/* ── RFF REQUESTS BOARD ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-bold text-surface-900 dark:text-white">
                B2B Freight Requests for Freight (RFF / RFQ)
              </h2>
            </div>
            <Badge variant="primary" size="sm">
              Sealed Bidding Protocol
            </Badge>
          </div>

          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {rffList.map((rff) => {
              const isAwarded = rff.status === 'AWARDED'

              return (
                <div
                  key={rff.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 p-3 rounded-xl transition-colors"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-surface-900 dark:text-white font-mono">
                        {rff.title}
                      </h3>
                      <Badge variant={isAwarded ? 'success' : 'primary'} size="sm">
                        {rff.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-surface-600 dark:text-surface-300">
                      <span>🚚 {rff.tonnage}T {rff.truckType}</span>
                      <span>•</span>
                      <span>📦 {rff.monthlyVolume} shipments / month</span>
                      <span>•</span>
                      <span>Target Freight: {formatINR(rff.targetPrice)}</span>
                    </div>

                    {isAwarded ? (
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-emerald-600" />
                        <span>Awarded to: {rff.winningCarrierName} at {formatINR(rff.awardedPrice || 0)} / trip</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-surface-400">
                        Deadline: {new Date(rff.biddingDeadline).toLocaleDateString('en-IN')} • {rff.bidsCount} Carrier Quotes Submitted
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {!isAwarded ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedRff(rff)
                          setComparisonModalOpen(true)
                        }}
                        leftIcon={<ScaleIcon className="w-4 h-4" />}
                        className="text-xs font-bold"
                      >
                        Compare {rff.bidsCount} Carrier Bids
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedRff(rff)
                          setComparisonModalOpen(true)
                        }}
                        className="text-xs font-bold"
                      >
                        View Contract Award
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── B2B ARCHITECTURE & DTO AUDIT REPORT ── */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-surface-100 dark:border-surface-800">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
              B2B Freight Procurement Backend & Authorization Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60 dark:border-surface-700 space-y-1">
              <span className="font-bold text-surface-900 dark:text-white block">1. Sealed-Bid Authorization Model</span>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Carriers can ONLY inspect their own submitted bids. Competing carrier quotes are strictly encrypted and sealed until the evaluation phase.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60 dark:border-surface-700 space-y-1">
              <span className="font-bold text-surface-900 dark:text-white block">2. Multi-Round Negotiation DTO</span>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Supports counter-offers with `counterAmount` & `remarks`. Shippers and carriers can iterate rates before binding contract execution.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60 dark:border-surface-700 space-y-1">
              <span className="font-bold text-surface-900 dark:text-white block">3. Financial Transaction Safety</span>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Awarding an RFF generates a binding procurement contract without initiating automated payment release until trip loading confirmation.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── BID COMPARISON & AWARD MODAL ── */}
      {comparisonModalOpen && selectedRff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-4xl w-full max-h-[90vh] flex flex-col justify-between shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between bg-surface-50 dark:bg-surface-800/60">
              <div>
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Side-by-Side Bid Comparison</span>
                <h3 className="text-base font-black text-surface-900 dark:text-white font-mono">
                  {selectedRff.title} ({selectedRff.tonnage}T • {selectedRff.monthlyVolume} shipments/mo)
                </h3>
              </div>
              <button onClick={() => setComparisonModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Bids Grid / Comparison Matrix */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 text-xs flex items-center justify-between">
                <span>Indicative Target Freight: <strong>{formatINR(selectedRff.targetPrice)}</strong></span>
                <span>Sealed Bids Evaluated: <strong>{bids.length} Carrier Proposals</strong></span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bids.map((bid) => {
                  const isWinning = bid.status === 'AWARDED'

                  return (
                    <div
                      key={bid.id}
                      className={cn(
                        'p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all',
                        isWinning
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 shadow-md'
                          : 'bg-white dark:bg-surface-800/50 border-surface-200 dark:border-surface-700'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-bold text-surface-900 dark:text-white text-xs block truncate">
                              {bid.carrierOrgName}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">
                              ★ {bid.carrierRating} • Verified Fleet Operator
                            </span>
                          </div>
                          {isWinning && <Badge variant="success" size="sm">✓ AWARDED</Badge>}
                        </div>

                        {/* Price Callout */}
                        <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-700 text-center">
                          <span className="text-[10px] text-surface-400 uppercase font-bold block">Submitted Quote</span>
                          <span className="text-xl font-black text-primary-600 dark:text-primary-400 mt-0.5 block">
                            {formatINR(bid.quoteAmount)}
                          </span>
                          <span className="text-[10px] text-surface-400 font-mono">
                            Rate: ₹{bid.ratePerTonKm}/Ton-Km • {bid.matchScorePercent}% Smart Match
                          </span>
                        </div>

                        <p className="text-[11px] text-surface-500 dark:text-surface-400 italic">
                          "{bid.notes}"
                        </p>
                      </div>

                      {/* Actions */}
                      {selectedRff.status !== 'AWARDED' && (
                        <div className="pt-2 border-t border-surface-100 dark:border-surface-700 space-y-2">
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => handleAwardBid(bid)}
                            className="font-bold text-xs py-2"
                          >
                            Award Contract
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => {
                              setActiveBidForCounter(bid)
                              setCounterAmountInput(String(bid.quoteAmount - 1000))
                              setNegotiateModalOpen(true)
                            }}
                            className="font-bold text-xs py-1.5"
                          >
                            Counter-Offer
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/60 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setComparisonModalOpen(false)}>
                Close Bid Matrix
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE RFF MODAL ── */}
      {createRffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white">
                Create B2B Freight RFF
              </h3>
              <button onClick={() => setCreateRffModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                  Origin Hub Address *
                </label>
                <input
                  type="text"
                  value={rffOrigin}
                  onChange={(e) => setRffOrigin(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                  Destination ICD / Terminal *
                </label>
                <input
                  type="text"
                  value={rffDestination}
                  onChange={(e) => setRffDestination(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                    Tonnage Capacity (Tons)
                  </label>
                  <input
                    type="number"
                    value={rffTonnage}
                    onChange={(e) => setRffTonnage(e.target.value)}
                    className="input font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={rffTruckType}
                    onChange={(e) => setRffTruckType(e.target.value)}
                    className="input font-bold"
                  >
                    <option value="Container">Closed Container</option>
                    <option value="Open">Open Body</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                    Monthly Shipment Volume
                  </label>
                  <input
                    type="number"
                    value={rffMonthlyVolume}
                    onChange={(e) => setRffMonthlyVolume(e.target.value)}
                    className="input font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                    Indicative Target Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={rffTargetPrice}
                    onChange={(e) => setRffTargetPrice(e.target.value)}
                    className="input font-bold"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={creatingRff}
                  className="font-bold py-3 text-xs"
                >
                  Publish RFF to Verified Carriers
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── COUNTER OFFER MODAL ── */}
      {negotiateModalOpen && activeBidForCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <h3 className="text-base font-bold text-surface-900 dark:text-white">
                Transmit Counter-Offer to Carrier
              </h3>
              <button onClick={() => setNegotiateModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendCounterOffer} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 text-xs">
                <span className="font-bold text-surface-900 dark:text-white block">{activeBidForCounter.carrierOrgName}</span>
                <span className="text-surface-500">Original Carrier Quote: {formatINR(activeBidForCounter.quoteAmount)}</span>
              </div>

              <div>
                <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                  Counter-Offer Amount (₹) *
                </label>
                <input
                  type="number"
                  value={counterAmountInput}
                  onChange={(e) => setCounterAmountInput(e.target.value)}
                  className="input font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-surface-700 dark:text-surface-300 mb-1">
                  Negotiation Notes / Terms
                </label>
                <textarea
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  placeholder="e.g. Guaranteed 100 shipments/mo if rate is revised..."
                  className="input h-20"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="font-bold py-3 text-xs"
                >
                  Transmit Counter-Offer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
