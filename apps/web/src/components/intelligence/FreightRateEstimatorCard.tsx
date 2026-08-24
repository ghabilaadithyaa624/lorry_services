'use client'

import React, { useState } from 'react'
import {
  CurrencyRupeeIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  TruckIcon,
  MapPinIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { estimateFreightRate, PricingInput } from '@/lib/intelligence/pricingEngine'
import { Badge } from '@/components/ui'
import { formatINR, cn } from '@/lib/utils'

interface FreightRateEstimatorCardProps {
  input: PricingInput
  className?: string
}

export function FreightRateEstimatorCard({ input, className }: FreightRateEstimatorCardProps) {
  const estimate = estimateFreightRate(input)
  const [activeTab, setActiveTab] = useState<'overview' | 'sensitivity' | 'comparison'>('overview')
  const [showExplanation, setShowExplanation] = useState(false)

  const confidenceBadgeVariant =
    estimate.confidence === 'HIGH' ? 'success' : estimate.confidence === 'MEDIUM' ? 'info' : 'warning'

  return (
    <div
      className={cn(
        'bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-4 font-sans',
        className
      )}
    >
      {/* Header & Indicative Benchmark Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center font-bold border border-primary-500/20">
            <CurrencyRupeeIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
              Freight Price Intelligence
            </h3>
            <span className="text-[10px] text-surface-400 font-mono">
              Deterministic Economic Freight Rate Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Indicative benchmark estimate
          </span>
          <Badge variant={confidenceBadgeVariant} size="sm" className="font-mono text-[10px]">
            {estimate.confidence} CONFIDENCE
          </Badge>
        </div>
      </div>

      {/* Main Recommended Rate & Market Range Display */}
      <div className="bg-surface-950/80 p-5 rounded-2xl border border-white/5 space-y-3 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-surface-400 block">
              Recommended Freight Rate
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-baseline gap-2 mt-0.5">
              <span>{formatINR(estimate.recommendedTarget)}</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Recommended
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-surface-400 block">
              Rate / Ton-Km
            </span>
            <span className="text-base sm:text-lg font-black text-primary-400 font-mono mt-0.5 block">
              ₹{estimate.ratePerTonKm.toFixed(2)}
              <span className="text-2xs font-normal text-surface-400"> / T-km</span>
            </span>
          </div>
        </div>

        {/* Market Range Bar */}
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-surface-300 font-medium">
            <span>Market Range:</span>
            <span className="font-bold text-emerald-400">
              {formatINR(estimate.minEstimate)} — {formatINR(estimate.maxEstimate)}
            </span>
          </div>

          {estimate.isBenchmarkBased && (
            <span className="text-[10px] text-surface-400">
              Benchmark-based regional corridor rate
            </span>
          )}
        </div>
      </div>

      {/* 4 Core Parameter Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-sunken/40 border border-hairline/60">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 text-blue-500 shrink-0" />
            Distance
          </span>
          <span className="font-mono font-bold text-ink mt-0.5 block">
            {estimate.distanceKm} km
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-sunken/40 border border-hairline/60">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ScaleIcon className="w-3 h-3 text-emerald-500 shrink-0" />
            Tonnage
          </span>
          <span className="font-mono font-bold text-ink mt-0.5 block">
            {estimate.tonnage} Tons
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-sunken/40 border border-hairline/60">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <TruckIcon className="w-3 h-3 text-primary-500 shrink-0" />
            Vehicle Type
          </span>
          <span className="font-bold text-ink mt-0.5 block truncate">
            {estimate.truckType} Body
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-sunken/40 border border-hairline/60">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CurrencyRupeeIcon className="w-3 h-3 text-amber-500 shrink-0" />
            Handling
          </span>
          <span className="font-mono font-bold text-ink mt-0.5 block">
            {formatINR(estimate.baseHandlingCharge)}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div role="tablist" aria-label="Freight rate analysis options" className="flex border-b border-hairline text-xs font-bold gap-4">
        <button
          type="button"
          role="tab"
          id="tab-overview"
          aria-selected={activeTab === 'overview'}
          aria-controls="panel-overview"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'pb-2 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t',
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-900'
          )}
        >
          Pricing Breakdown
        </button>

        <button
          type="button"
          role="tab"
          id="tab-sensitivity"
          aria-selected={activeTab === 'sensitivity'}
          aria-controls="panel-sensitivity"
          onClick={() => setActiveTab('sensitivity')}
          className={cn(
            'pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t',
            activeTab === 'sensitivity'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-900'
          )}
        >
          <ChartBarIcon className="w-3.5 h-3.5" />
          Price Sensitivity
        </button>

        <button
          type="button"
          role="tab"
          id="tab-comparison"
          aria-selected={activeTab === 'comparison'}
          aria-controls="panel-comparison"
          onClick={() => setActiveTab('comparison')}
          className={cn(
            'pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t',
            activeTab === 'comparison'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-500 hover:text-surface-900'
          )}
        >
          <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
          Route & Vehicle Options
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW & BREAKDOWN */}
      {activeTab === 'overview' && (
        <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="space-y-3 pt-1">
          {/* Adjustments Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-sunken/40 border border-hairline/60 space-y-1">
              <span className="text-[10px] text-surface-400 uppercase font-bold flex items-center gap-1">
                <ArrowTrendingUpIcon className="w-3 h-3 text-purple-500" />
                Long-Haul Adjustment
              </span>
              <p className="font-bold text-ink text-[11px]">
                {estimate.longHaulAdjustment.label}
              </p>
              <p className="text-[10px] text-surface-500 leading-tight">
                {estimate.longHaulAdjustment.description}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-sunken/40 border border-hairline/60 space-y-1">
              <span className="text-[10px] text-surface-400 uppercase font-bold flex items-center gap-1">
                <TruckIcon className="w-3 h-3 text-indigo-500" />
                Truck-Type Adjustment
              </span>
              <p className="font-bold text-ink text-[11px]">
                ₹{estimate.truckTypeAdjustment.baseRatePerTonKm.toFixed(2)}/T-km + ₹{estimate.truckTypeAdjustment.handlingFee.toLocaleString('en-IN')} Handling
              </p>
              <p className="text-[10px] text-surface-500 leading-tight">
                {estimate.truckTypeAdjustment.description}
              </p>
            </div>
          </div>

          {/* Collapsible Pricing Explanation */}
          <div className="bg-primary-50/40 dark:bg-primary-950/20 p-3 rounded-xl border border-primary-100/60 dark:border-primary-900/40 space-y-2 text-xs">
            <button
              type="button"
              aria-expanded={showExplanation}
              aria-controls="pricing-explanation-panel"
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full flex items-center justify-between font-bold text-primary-800 dark:text-primary-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              <span className="flex items-center gap-1.5 text-[11px]">
                <InformationCircleIcon className="w-4 h-4 text-primary-500 shrink-0" />
                Pricing Engine Formula Explanation
              </span>
              {showExplanation ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
            </button>

            {showExplanation && (
              <div id="pricing-explanation-panel" className="pt-2 text-[11px] text-muted space-y-1.5 leading-relaxed border-t border-primary-100 dark:border-primary-900/40">
                <p>{estimate.explanation}</p>
                <div className="p-2 rounded-lg bg-sunken/70 font-mono text-[10px] space-y-0.5 text-muted">
                  <div>Base Freight = {estimate.distanceKm} km × {estimate.tonnage} T × ₹{estimate.ratePerTonKm.toFixed(2)} = ₹{Math.round(estimate.distanceKm * estimate.tonnage * estimate.ratePerTonKm).toLocaleString('en-IN')}</div>
                  <div>Handling Buffer = ₹{estimate.baseHandlingCharge.toLocaleString('en-IN')}</div>
                  <div>Recommended Target = ₹{estimate.recommendedTarget.toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PRICE SENSITIVITY */}
      {activeTab === 'sensitivity' && (
        <div id="panel-sensitivity" role="tabpanel" aria-labelledby="tab-sensitivity" className="space-y-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-sunken/40 border border-hairline/60 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400 block">
              Tonnage Volume Sensitivity Analysis (±10% Payload)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-sunken border border-hairline">
                <span className="text-[10px] text-surface-400 font-bold block">
                  {estimate.priceSensitivity.minus10Percent.label}
                </span>
                <span className="font-mono font-bold text-ink block mt-0.5">
                  {formatINR(estimate.priceSensitivity.minus10Percent.cost)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800">
                <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold block">
                  {estimate.priceSensitivity.current.label}
                </span>
                <span className="font-mono font-black text-primary-700 dark:text-primary-300 block mt-0.5">
                  {formatINR(estimate.priceSensitivity.current.cost)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-sunken border border-hairline">
                <span className="text-[10px] text-surface-400 font-bold block">
                  {estimate.priceSensitivity.plus10Percent.label}
                </span>
                <span className="font-mono font-bold text-ink block mt-0.5">
                  {formatINR(estimate.priceSensitivity.plus10Percent.cost)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-surface-500 pt-1">
              Marginal cost per additional ton on this route is approximately{' '}
              <strong className="text-muted">
                {formatINR(estimate.priceSensitivity.costPerAdditionalTon)}/ton
              </strong>.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ROUTE & VEHICLE COMPARISON */}
      {activeTab === 'comparison' && (
        <div id="panel-comparison" role="tabpanel" aria-labelledby="tab-comparison" className="space-y-3 pt-1 text-xs">
          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-[10px] uppercase font-bold text-surface-500">
                  <th className="p-2.5">Configuration / Route</th>
                  <th className="p-2.5">Distance</th>
                  <th className="p-2.5">Rate / T-km</th>
                  <th className="p-2.5 text-right">Est. Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-[11px]">
                {estimate.routeComparison.map((opt, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      opt.isCurrent
                        ? 'bg-primary-50/50 dark:bg-primary-950/30 font-bold text-ink'
                        : 'text-body hover:bg-wash'
                    )}
                  >
                    <td className="p-2.5 flex items-center gap-1.5">
                      <span>{opt.label}</span>
                      {opt.isCurrent && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-primary-500 text-white">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono">{opt.distanceKm} km</td>
                    <td className="p-2.5 font-mono">₹{opt.ratePerTonKm.toFixed(2)}</td>
                    <td className="p-2.5 font-mono font-bold text-right text-ink">
                      {formatINR(opt.recommendedTarget)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explicit Disclaimer Footer */}
      <div className="pt-2 border-t border-hairline text-[10px] text-surface-400 flex items-start gap-1.5 leading-tight">
        <InformationCircleIcon className="w-3.5 h-3.5 text-surface-400 shrink-0 mt-0.5" />
        <span>{estimate.disclaimer}</span>
      </div>
    </div>
  )
}

