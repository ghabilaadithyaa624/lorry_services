'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type StatusDotVariant = 'active' | 'success' | 'warning' | 'danger' | 'info' | 'default'
export type StatusDotSize = 'sm' | 'md' | 'lg'

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Color and glow variant of the status dot.
   * @default 'active'
   */
  variant?: StatusDotVariant
  /**
   * Physical size of the dot.
   * @default 'md'
   */
  size?: StatusDotSize
  /**
   * If true, adds an animated CSS pulse glow ring.
   * @default false
   */
  pulse?: boolean
  /**
   * Additional CSS class names.
   */
  className?: string
}

const variantClasses: Record<StatusDotVariant, string> = {
  active: 'bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.7)]',
  success: 'bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.7)]',
  warning: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
  danger: 'bg-danger-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]',
  info: 'bg-sky-400 shadow-[0_0_8px_rgba(59,130,246,0.7)]',
  default: 'bg-surface-400',
}

const sizeClasses: Record<StatusDotSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

/**
 * StatusDot Component
 *
 * Operational telemetry dot indicator with real-time glow and pulse support.
 */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ variant = 'active', size = 'md', pulse = false, className, ...props }, ref) => {
    return (
      <span className="relative inline-flex items-center justify-center shrink-0">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-75 animate-ping',
              sizeClasses[size],
              variantClasses[variant]
            )}
          />
        )}
        <span
          ref={ref}
          className={cn(
            'inline-block rounded-full shrink-0 transition-colors',
            sizeClasses[size],
            variantClasses[variant],
            className
          )}
          {...props}
        />
      </span>
    )
  }
)

StatusDot.displayName = 'StatusDot'

export default StatusDot
