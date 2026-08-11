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
        'bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4',
        className
      )}
    >
      {/* Header: Potential Return Load Badge & Match Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 text-[10px] font-black uppercase tracking-wider">
            <ArrowPathIcon className="w-3 h-3 text-purple-600 shrink-0" />
            <span>Potential Return Load</span>
          </span>
          <MatchScoreBadge match={opportunity.matchResult} />
        </div>

        {/* Route Header */}
        <div>
          <span className="text-[10px] text-surface-400 uppercase font-bold tracking-wider block">
            Return Corridor Route
          </span>
          <h4 className="text-base sm:text-lg font-black text-surface-900 dark:text-white flex items-center gap-2 truncate mt-0.5">
            <span className="truncate">{opportunity.loadingAddress}</span>
            <span className="text-primary-500 shrink-0">➔</span>
            <span className="truncate">{opportunity.unloadingAddress}</span>
          </h4>
        </div>
      </div>

      {/* Tonnage & Freight Commercials */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/60">
        <div>
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">
            Cargo Specs
          </span>
          <span className="font-mono font-bold text-xs text-surface-900 dark:text-white mt-0.5 block">
            {opportunity.tonnageRequired}T {opportunity.truckType}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">
            Estimated Freight
          </span>
          <span className="font-mono font-black text-base text-primary-600 dark:text-primary-400 mt-0.5 block">
            {formatINR(opportunity.estimatedFreight)}
          </span>
        </div>
      </div>

      {/* Proximity & Empty-Run Reduction Highlights */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-700/60">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">
            Pickup Proximity
          </span>
          <span className="font-bold text-surface-900 dark:text-white mt-0.5 block truncate">
            {opportunity.pickupDistanceFromDestinationKm.toFixed(1)} km from destination
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider block">
            Empty-Run Reduction
          </span>
          <span className="font-mono font-black text-emerald-800 dark:text-emerald-200 mt-0.5 block truncate">
            {opportunity.potentialEmptyRunReductionKm} km saved
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[10px] text-surface-400 flex items-start gap-1 leading-tight">
        <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{opportunity.disclaimer}</span>
      </div>

      {/* Action Button */}
      <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => onConnect && onConnect(opportunity)}
          className="font-bold text-xs py-2.5"
        >
          Connect for Potential Return Load
        </Button>
      </div>
    </div>
  )
}
