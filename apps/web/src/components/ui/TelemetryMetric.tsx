'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './Badge'

export type MetricClassification = 'REAL METRIC' | 'ESTIMATED METRIC' | 'PREDICTIVE METRIC'
export type MetricVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

export interface TelemetryMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Uppercase small telemetry label.
   */
  label: string
  /**
   * Large numeric or formatted string value.
   */
  value: React.ReactNode
  /**
   * Optional secondary subtitle or trend text.
   */
  subtitle?: string
  /**
   * Optional classification type badge.
   */
  classification?: MetricClassification
  /**
   * Semantic color variant for numeric display.
   * @default 'default'
   */
  variant?: MetricVariant
  /**
   * Additional custom CSS class names.
   */
  className?: string
}

const valueVariantClasses: Record<MetricVariant, string> = {
  default: 'text-white',
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  danger: 'text-danger-300',
  info: 'text-sky-300',
  primary: 'text-primary-300',
}

const labelVariantClasses: Record<MetricVariant, string> = {
  default: 'text-surface-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-danger-400',
  info: 'text-sky-400',
  primary: 'text-primary-400',
}

/**
 * TelemetryMetric Component
 *
 * Operational KPI stat card primitive adhering to LorryCarry Kinetic Command visual standards.
 */
export function TelemetryMetric({
  label,
  value,
  subtitle,
  classification,
  variant = 'default',
  className,
  ...props
}: TelemetryMetricProps) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-surface-900 border border-white/10 shadow-card font-sans space-y-1.5 transition-all duration-200',
        variant === 'danger' && 'bg-danger-950/40 border-danger-500/30',
        variant === 'success' && 'bg-emerald-950/40 border-emerald-500/30',
        variant === 'warning' && 'bg-amber-950/40 border-amber-500/30',
        variant === 'primary' && 'bg-primary-950/40 border-primary-500/30',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[11px] font-semibold uppercase tracking-[0.08em] block truncate', labelVariantClasses[variant])}>
          {label}
        </span>
        {classification && (
          <Badge variant={variant === 'default' ? 'primary' : variant} size="sm" className="text-[10px] font-sans shrink-0">
            {classification}
          </Badge>
        )}
      </div>

      <span className={cn('text-2xl sm:text-3xl font-mono font-bold tracking-tight block truncate', valueVariantClasses[variant])}>
        {value}
      </span>

      {subtitle && (
        <span className="text-[13px] text-surface-400 font-sans block truncate">
          {subtitle}
        </span>
      )}
    </div>
  )
}

export default TelemetryMetric
