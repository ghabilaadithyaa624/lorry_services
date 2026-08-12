'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { StatusDot, type StatusDotVariant } from './StatusDot'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
  children?: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-800/80 text-surface-300 border border-white/10',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  danger: 'bg-danger-500/15 text-danger-400 border border-danger-500/30',
  info: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  primary: 'bg-primary-500/15 text-primary-400 border border-primary-500/30',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1 font-sans font-bold',
  md: 'text-xs px-2.5 py-0.5 gap-1.5 font-sans font-bold',
}

const dotVariantMap: Record<BadgeVariant, StatusDotVariant> = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  primary: 'active',
}

/**
 * Badge component for tags, status indicators, and operational telemetry labels.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg shrink-0 select-none whitespace-nowrap uppercase tracking-wider',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && <StatusDot variant={dotVariantMap[variant]} size="sm" />}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
