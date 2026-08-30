'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StatusDot, type StatusDotVariant } from './StatusDot'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
  children?: ReactNode
}

/**
 * Tint-based badge styling.
 *
 * Each variant pairs a low-alpha fill with a darker text tone in light mode and
 * a lighter tone in dark mode, so the label always clears 4.5:1 contrast.
 */
const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-sunken text-muted border border-hairline',
  neutral: 'bg-sunken text-body border border-hairline',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25',
  danger: 'bg-danger-500/10 text-danger-700 dark:text-danger-300 border border-danger-500/25',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25',
  primary: 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/25',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
  md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
}

const dotVariantMap: Record<BadgeVariant, StatusDotVariant> = {
  default: 'default',
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  primary: 'active',
}

/**
 * Badge — compact status and metadata label.
 *
 * Note: labels are NOT uppercased by default. Sentence case keeps long Indian
 * place names and registration numbers readable and avoids awkward wrapping in
 * dense tables.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-badge shrink-0 select-none whitespace-nowrap leading-none tracking-tight',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && <StatusDot variant={dotVariantMap[variant]} size="sm" aria-hidden="true" />}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
