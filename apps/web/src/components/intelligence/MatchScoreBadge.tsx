'use client'

import React, { useState } from 'react'
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldCheckIcon,
  ScaleIcon,
  TruckIcon,
  MapPinIcon,
  ArrowPathRoundedSquareIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { MatchResult } from '@/lib/intelligence/matchingEngine'
import { cn } from '@/lib/utils'

interface MatchScoreBadgeProps {
  match: MatchResult
  showDetails?: boolean
  variant?: 'badge' | 'card' | 'inline'
  className?: string
}

export function MatchScoreBadge({
  match,
  showDetails = false,
  variant = 'badge',
  className,
}: MatchScoreBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  if (variant === 'card') {
    return <MatchFactorCard match={match} className={className} />
  }

  const isDetailsVisible = showDetails || expanded

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label="Toggle match score breakdown"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer select-none shadow-2xs hover:scale-105',
          match.color
        )}
      >
        <span className="font-mono text-xs">{match.score}%</span>
        <span>MATCH</span>
        {expanded ? (
          <ChevronUpIcon className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-3.5 h-3.5 shrink-0" />
        )}
      </button>

      {isDetailsVisible && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-40 left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 bg-[#0F131D] rounded-2xl border border-white/10 p-4 text-xs shadow-modal animate-fade-in divide-y divide-white/10 text-white font-sans"
        >
          {/* Header */}
          <div className="pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-500/20">
                Match Intelligence
              </span>
              <span className="text-xs font-bold text-white">
                Deterministic Score
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black font-mono text-emerald-400">
                {match.score}%
              </span>
              <button
                type="button"
                aria-label="Close match breakdown"
                onClick={() => setExpanded(false)}
                className="p-1 text-surface-400 hover:text-white rounded-md"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Factor Breakdown Grid */}
          <div className="py-3 space-y-2.5">
            <FactorRow
              icon={ScaleIcon}
              label="Capacity"
              value={match.factors.capacity.value}
              fit={match.factors.capacity.fit}
              score={match.factors.capacity.score}
              maxScore={match.factors.capacity.maxScore}
            />
            <FactorRow
              icon={TruckIcon}
              label="Body Type"
              value={match.factors.bodyType.value}
              fit={match.factors.bodyType.fit}
              score={match.factors.bodyType.score}
              maxScore={match.factors.bodyType.maxScore}
            />
            <FactorRow
              icon={MapPinIcon}
              label="Distance"
              value={match.factors.proximity.value}
              fit={match.factors.proximity.fit}
              score={match.factors.proximity.score}
              maxScore={match.factors.proximity.maxScore}
            />
            <FactorRow
              icon={ShieldCheckIcon}
              label="Verification"
              value={match.factors.verification.value}
              fit={match.factors.verification.fit}
              score={match.factors.verification.score}
              maxScore={match.factors.verification.maxScore}
            />
            <FactorRow
              icon={ArrowPathRoundedSquareIcon}
              label="Corridor"
              value={match.factors.corridor.value}
              fit={match.factors.corridor.fit}
              score={match.factors.corridor.score}
              maxScore={match.factors.corridor.maxScore}
            />
          </div>

          {/* Warnings (if any) */}
          {match.warnings.length > 0 && (
            <div className="py-2.5 space-y-1 bg-amber-500/10 border-t border-b border-amber-500/20 -mx-4 px-4 font-mono">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Match Warnings & Constraints:
              </span>
              {match.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-amber-300">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="text-[11px] leading-tight">{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2.5 flex items-center justify-between text-[10px] text-surface-400 font-mono">
            <span className="flex items-center gap-1">
              <InformationCircleIcon className="w-3.5 h-3.5 text-surface-400" />
              Empirical Rule-Based Fit
            </span>
            <span>Zero Black-Box Scoring</span>
          </div>
        </div>
      )}
    </div>
  )
}

function FactorRow({
  icon: Icon,
  label,
  value,
  fit,
  score,
  maxScore,
}: {
  icon: any
  label: string
  value: string
  fit: boolean
  score: number
  maxScore: number
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className={cn(
            'w-4 h-4 shrink-0',
            fit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
          )}
        />
        <span className="text-surface-600 dark:text-surface-400 font-medium whitespace-nowrap">
          {label}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-bold text-surface-800 dark:text-surface-200 truncate max-w-[130px]">
          {value}
        </span>
        <span
          className={cn(
            'font-mono text-[10px] font-bold px-1.5 py-0.2 rounded',
            fit
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
          )}
        >
          +{score}/{maxScore}
        </span>
      </div>
    </div>
  )
}

export function MatchInlineBreakdown({
  match,
  className,
}: {
  match: MatchResult
  className?: string
}) {
  const f = match.factors

  return (
    <div className={cn('space-y-2 text-xs', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700 font-medium">
        {/* Capacity */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-surface-400 font-bold uppercase tracking-wider">
            <ScaleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Capacity</span>
            {f.capacity.fit ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
            ) : (
              <span className="text-amber-500 font-black">!</span>
            )}
          </div>
          <span className="font-bold text-surface-900 dark:text-white block truncate text-[11px]">
            {f.capacity.value}
          </span>
        </div>

        {/* Body Type */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-surface-400 font-bold uppercase tracking-wider">
            <TruckIcon className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span>Body Type</span>
            {f.bodyType.fit ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
            ) : (
              <span className="text-amber-500 font-black">!</span>
            )}
          </div>
          <span className="font-bold text-surface-900 dark:text-white block truncate text-[11px]">
            {f.bodyType.value}
          </span>
        </div>

        {/* Distance */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-surface-400 font-bold uppercase tracking-wider">
            <MapPinIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Distance</span>
            {f.proximity.fit ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
            ) : (
              <span className="text-amber-500 font-black">!</span>
            )}
          </div>
          <span className="font-bold text-surface-900 dark:text-white block truncate text-[11px]">
            {f.proximity.value}
          </span>
        </div>

        {/* Verification */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-surface-400 font-bold uppercase tracking-wider">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Verification</span>
            {f.verification.fit ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
            ) : (
              <span className="text-amber-500 font-black">!</span>
            )}
          </div>
          <span className="font-bold text-surface-900 dark:text-white block truncate text-[11px]">
            {f.verification.value}
          </span>
        </div>

        {/* Corridor */}
        <div className="space-y-0.5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1 text-[10px] text-surface-400 font-bold uppercase tracking-wider">
            <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Corridor</span>
            {f.corridor.fit ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
            ) : (
              <span className="text-surface-400 font-normal">-</span>
            )}
          </div>
          <span className="font-bold text-surface-900 dark:text-white block truncate text-[11px]">
            {f.corridor.value}
          </span>
        </div>
      </div>

      {/* Warnings Banner */}
      {match.warnings.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            Match Warnings & Constraints
          </span>
          {match.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300 text-[11px]">
              <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MatchFactorCard({ match, className }: { match: MatchResult; className?: string }) {
  return (
    <div
      className={cn(
        'p-4 rounded-2xl bg-surface-50/80 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700 space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-surface-200/60 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
            Smart Match
          </span>
          <span className="text-xs font-bold text-surface-900 dark:text-white">
            Score Breakdown
          </span>
        </div>
        <span className={cn('text-sm font-black font-mono px-2 py-0.5 rounded-full border', match.color)}>
          {match.score}% MATCH
        </span>
      </div>

      <MatchInlineBreakdown match={match} />
    </div>
  )
}
