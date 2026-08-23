'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type StatusDotVariant = 'active' | 'success' | 'warning' | 'danger' | 'info' | 'default'
export type StatusDotSize = 'sm' | 'md' | 'lg'

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Colour variant of the status dot.
   * @default 'active'
   */
  variant?: StatusDotVariant
  /**
   * Physical size of the dot.
   * @default 'md'
   */
  size?: StatusDotSize
  /**
   * Animated ping ring for live/real-time indicators.
   * Automatically suppressed under `prefers-reduced-motion`.
   * @default false
   */
  pulse?: boolean
  /**
   * Text alternative. When provided the dot is exposed to assistive tech
   * instead of being decorative — important because colour alone must never
   * be the only carrier of meaning.
   */
  label?: string
  className?: string
}

const variantClasses: Record<StatusDotVariant, string> = {
  active: 'bg-emerald-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-danger-500',
  info: 'bg-sky-500',
  default: 'bg-subtle',
}

const sizeClasses: Record<StatusDotSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

/**
 * StatusDot — compact state indicator.
 *
 * Pair with a text label wherever the state carries meaning; the dot alone is
 * decorative unless `label` is supplied.
 */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ variant = 'active', size = 'md', pulse = false, label, className, ...props }, ref) => {
    return (
      <span className="relative inline-flex items-center justify-center shrink-0">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-75 animate-ping motion-reduce:hidden',
              sizeClasses[size],
              variantClasses[variant]
            )}
            aria-hidden="true"
          />
        )}
        <span
          ref={ref}
          role={label ? 'img' : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
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
