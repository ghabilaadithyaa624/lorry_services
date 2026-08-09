'use client'

import React from 'react'
import { CurrencyRupeeIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { estimateFreightRate, PricingInput } from '@/lib/intelligence/pricingEngine'
import { formatINR } from '@/lib/utils'

interface FreightRateEstimatorCardProps {
  input: PricingInput
  className?: string
}

export function FreightRateEstimatorCard({ input, className }: FreightRateEstimatorCardProps) {
  const estimate = estimateFreightRate(input)

  return (
    <div className={`bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card ${className || ''}`}>
      <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <CurrencyRupeeIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
            Freight Price Intelligence
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 px-2 py-0.5 rounded-full">
          Transparent Estimate
        </span>
      </div>

      {/* Price Range Breakdown */}
      <div className="pt-4 space-y-4">
        <div>
          <span className="text-xs text-surface-500 font-medium">Recommended Target Rate</span>
          <div className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white mt-0.5">
            {formatINR(estimate.recommendedTarget)}
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500 mt-1">
            <span>Market Range:</span>
            <span className="font-bold text-surface-700 dark:text-surface-300">
              {formatINR(estimate.minEstimate)} – {formatINR(estimate.maxEstimate)}
            </span>
          </div>
        </div>

        {/* Route & Economics Metrics */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-surface-50 dark:bg-surface-800/60 rounded-xl border border-surface-100 dark:border-surface-700 text-center">
          <div>
            <span className="text-[10px] text-surface-400 block">Est. Distance</span>
            <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
              {estimate.distanceKm} km
            </span>
          </div>
          <div>
            <span className="text-[10px] text-surface-400 block">Payload</span>
            <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
              {estimate.tonnage} Tons
            </span>
          </div>
          <div>
            <span className="text-[10px] text-surface-400 block">Rate Metric</span>
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
              ₹{estimate.ratePerTonKm.toFixed(2)}/T-km
            </span>
          </div>
        </div>

        {/* Explainability note */}
        <div className="flex items-start gap-2 text-[11px] text-surface-500 leading-relaxed bg-primary-50/40 dark:bg-primary-950/20 p-2.5 rounded-lg border border-primary-100/60 dark:border-primary-900/40">
          <InformationCircleIcon className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
          <span>{estimate.explanation}</span>
        </div>
      </div>
    </div>
  )
}
