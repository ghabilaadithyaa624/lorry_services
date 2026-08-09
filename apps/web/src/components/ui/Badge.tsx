'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Visual variants for the Badge component.
 */
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

/**
 * Size variants for the Badge component.
 */
export type BadgeSize = 'sm' | 'md'

/**
 * Props for the Badge component.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Color variant of the badge.
   * @default 'default'
   */
  variant?: BadgeVariant
  /**
   * Size of the badge.
   * @default 'md'
   */
  size?: BadgeSize
  /**
   * Displays a status dot indicator before badge text.
   * @default false
   */
  dot?: boolean
  /**
   * Additional CSS class names.
   */
  className?: string
  /**
   * Badge content.
   */
  children?: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
  success: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
  info: 'bg-info-50 text-info-700 dark:bg-info-500/10 dark:text-info-400',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-2xs px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-0.5 gap-1.5',
}

const dotColorClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-500 dark:bg-surface-400',
  success: 'bg-success-500 dark:bg-success-400',
  warning: 'bg-warning-500 dark:bg-warning-400',
  danger: 'bg-danger-500 dark:bg-danger-400',
  info: 'bg-info-500 dark:bg-info-400',
  primary: 'bg-primary-500 dark:bg-primary-400',
}

const dotSizeClasses: Record<BadgeSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-1.5 h-1.5',
}

/**
 * Badge component for tags, status indicators, and labels in LorryCarry.
 * Supports default, success, warning, danger, info, and primary variants with optional status dots.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-badge shrink-0 select-none whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full shrink-0',
              dotSizeClasses[size],
              dotColorClasses[variant]
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
