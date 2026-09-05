'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface TelemetryCellProps {
  label: string
  icon?: React.ReactNode
  value: React.ReactNode
  valueClassName?: string
  className?: string
}

/**
 * Monospace telemetry readout cell (docs/LORRYCARRY_DESIGN_SYSTEM.md §4, §8.3).
 * Dense operational values render in a deep well with a mono uppercase label.
 *
 * Shared by the live marketplace cards on `/search` and the sample preview
 * cards so both surfaces read identically.
 */
export function TelemetryCell({
  label,
  icon,
  value,
  valueClassName,
  className,
}: TelemetryCellProps) {
  return (
    <div className={cn('bg-sunken/60 rounded-xl p-3 border border-white/5', className)}>
      <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
        {label}
      </div>
      <div
        className={cn(
          'text-sm sm:text-base font-bold text-ink font-mono mt-0.5 flex items-center gap-1',
          valueClassName
        )}
      >
        {icon && (
          <span className="shrink-0 inline-flex" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="min-w-0">{value}</span>
      </div>
    </div>
  )
}

export default TelemetryCell
