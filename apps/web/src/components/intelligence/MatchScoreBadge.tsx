'use client'

import React, { useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { MatchResult } from '@/lib/intelligence/matchingEngine'
import { cn } from '@/lib/utils'

interface MatchScoreBadgeProps {
  match: MatchResult
  showDetails?: boolean
  className?: string
}

export function MatchScoreBadge({ match, showDetails = false, className }: MatchScoreBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  const isDetailsVisible = showDetails || expanded

  return (
    <div className={cn('inline-block', className)}>
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer select-none',
          match.score >= 85
            ? 'bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800'
            : match.score >= 70
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800'
            : 'bg-warning-50 dark:bg-warning-950/40 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800'
        )}
      >
        <span className="font-mono text-xs">{match.score}%</span>
        <span>Match</span>
        {expanded ? (
          <ChevronUpIcon className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-3 h-3 shrink-0" />
        )}
      </div>

      {isDetailsVisible && (
        <div className="mt-2 p-3 bg-surface-50 dark:bg-surface-800/80 rounded-xl border border-surface-200/80 dark:border-surface-700 text-xs space-y-2 shadow-sm animate-fade-in max-w-sm">
          <div className="flex items-center justify-between font-bold text-surface-700 dark:text-surface-300 pb-1 border-b border-surface-200/60 dark:border-surface-700">
            <span>Deterministic Match Factors</span>
            <span className={cn('font-mono font-black', match.color)}>{match.score}%</span>
          </div>

          <div className="space-y-1">
            {match.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-success-700 dark:text-success-400">
                <CheckCircleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="text-[11px] leading-tight">{r}</span>
              </div>
            ))}

            {match.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-warning-700 dark:text-warning-400">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="text-[11px] leading-tight">{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
