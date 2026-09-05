'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: React.ReactNode
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /**
   * Visual weight.
   * - `card`: bordered panel for a full page/section (default)
   * - `inline`: minimal, for empty regions inside an existing card
   */
  variant?: 'card' | 'inline'
  className?: string
  children?: React.ReactNode
}

/**
 * EmptyState — the canonical "nothing here yet" surface.
 *
 * Always pairs an explanation with a next action, so an empty screen still
 * tells the operator what to do rather than leaving a blank panel.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'card',
  className,
  children,
}: EmptyStateProps) {
  const renderAction = (action: EmptyStateAction, isPrimary: boolean) => {
    const commonProps = {
      variant: (isPrimary ? 'primary' : 'secondary') as 'primary' | 'secondary',
      size: 'md' as const,
      leftIcon: action.icon,
    }

    if (action.href) {
      return (
        <Button key={action.label} as="a" href={action.href} {...commonProps}>
          {action.label}
        </Button>
      )
    }
    return (
      <Button key={action.label} onClick={action.onClick} {...commonProps}>
        {action.label}
      </Button>
    )
  }

  return (
    <div
      className={cn(
        'text-center flex flex-col items-center',
        // Operational empty state per docs/LORRYCARRY_DESIGN_SYSTEM.md §15:
        // dark glass panel with hairline border and modal shadow.
        variant === 'card' &&
          'p-8 sm:p-12 bg-panel/80 backdrop-blur-xl rounded-card border border-hairline shadow-modal',
        variant === 'inline' && 'py-10 px-4',
        className
      )}
    >
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl bg-sunken border border-hairline flex items-center justify-center mb-4"
          aria-hidden="true"
        >
          <Icon className="w-7 h-7 text-primary-500" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-ink tracking-tight">{title}</h3>

      {description && (
        <p className="text-sm text-muted max-w-md mx-auto leading-relaxed mt-1.5">{description}</p>
      )}

      {children && <div className="mt-4 w-full">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {primaryAction && renderAction(primaryAction, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  )
}

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

/**
 * ErrorState — failure surface with a retry affordance.
 *
 * Uses role="alert" so screen readers announce the failure immediately.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this information. Please check your connection and try again.',
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'p-6 sm:p-8 rounded-card border border-danger-500/25 bg-danger-500/5 text-center flex flex-col items-center',
        className
      )}
    >
      <div
        className="w-12 h-12 rounded-full bg-danger-500/10 flex items-center justify-center mb-3.5"
        aria-hidden="true"
      >
        <svg
          className="w-6 h-6 text-danger-600 dark:text-danger-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm text-muted max-w-md mx-auto mt-1.5 leading-relaxed">{message}</p>

      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  )
}

export default EmptyState
