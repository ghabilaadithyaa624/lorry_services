'use client'

import React from 'react'
import { ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { BackhaulOpportunity } from '@/lib/intelligence/matchingEngine'
import { MatchScoreBadge } from './MatchScoreBadge'
import { Button } from '@/components/ui'
import { formatINR, cn } from '@/lib/utils'

interface ReturnLoadOpportunityCardProps {
  opportunity: BackhaulOpportunity
  onConnect?: (opportunity: BackhaulOpportunity) => void
  className?: string
}

export function ReturnLoadOpportunityCard({
  opportunity,
  onConnect,
  className,
}: ReturnLoadOpportunityCardProps) {
  return (
    <div
      className={cn(
        'bg-[#0F131D] rounded-[20px] border border-white/10 p-5 shadow-card hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 font-sans',
        className
      )}
    >
      {/* Header: Potential Return Load Badge & Match Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500/20 via-amber-500/20 to-purple-600/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
            <ArrowPathIcon className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-spin-slow" />
            <span>Potential Return Load</span>
          </span>
          <MatchScoreBadge match={opportunity.matchResult} />
        </div>

        {/* Route Header */}
        <div>
          <span className="text-[11px] font-sans text-surface-500 font-semibold uppercase tracking-[0.06em] block">
            Return corridor route
          </span>
          <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate mt-0.5">
            <span className="truncate">{opportunity.loadingAddress}</span>
            <span className="text-primary-400 font-mono shrink-0">➔</span>
            <span className="truncate">{opportunity.unloadingAddress}</span>
          </h4>
        </div>
      </div>

      {/* Tonnage & Freight Commercials */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-950/80 border border-white/5">
        <div>
          <span className="text-[11px] font-sans text-surface-500 font-semibold uppercase tracking-[0.06em] block">
            Cargo specs
          </span>
          <span className="font-mono font-bold text-xs text-white mt-0.5 block">
            {opportunity.tonnageRequired}T {opportunity.truckType}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-sans text-surface-500 font-semibold uppercase tracking-[0.06em] block">
            Estimated freight
          </span>
          <span className="font-mono font-black text-base text-emerald-400 mt-0.5 block">
            {formatINR(opportunity.estimatedFreight)}
          </span>
        </div>
      </div>

      {/* Proximity & Empty-Run Reduction Highlights */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-950/60 border border-white/5 space-y-0.5">
          <span className="text-[11px] font-sans text-surface-500 font-semibold uppercase tracking-[0.06em] block">
            Pickup proximity
          </span>
          <span className="font-mono font-bold text-white text-[11px] block truncate">
            {opportunity.pickupDistanceFromDestinationKm.toFixed(1)} km away
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
          <span className="text-[11px] font-sans text-emerald-500 font-semibold uppercase tracking-[0.06em] block">
            Empty-run reduction
          </span>
          <span className="font-mono font-black text-emerald-300 text-[11px] block truncate">
            {opportunity.potentialEmptyRunReductionKm} km saved
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[10px] font-sans text-surface-400 flex items-start gap-1 leading-tight">
        <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-surface-400" />
        <span>{opportunity.disclaimer}</span>
      </div>

      {/* Action Button */}
      <div className="pt-2 border-t border-white/5">
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => onConnect && onConnect(opportunity)}
          className="font-bold text-xs py-2.5 shadow-glow-primary bg-primary-500 border border-purple-400/30"
        >
          Connect for Potential Return Load
        </Button>
      </div>
    </div>
  )
}
