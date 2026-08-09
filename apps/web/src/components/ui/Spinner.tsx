'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Size variants for the Spinner component.
 */
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'

/**
 * Props for the Spinner component.
 */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * The size of the spinner.
   * @default 'md'
   */
  size?: SpinnerSize
  /**
   * Accessibility label for screen readers.
   * @default 'Loading...'
   */
  label?: string
  /**
   * Additional CSS classes.
   */
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

/**
 * Spinner component for indicating loading states across the application.
 * Uses a border-based circular spinner with CSS animation and screen reader support.
 */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = 'md', label = 'Loading...', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(
          'inline-block rounded-full animate-spin border-current border-t-transparent text-current align-middle shrink-0',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </span>
    )
  }
)

Spinner.displayName = 'Spinner'

export default Spinner
