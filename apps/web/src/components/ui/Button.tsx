'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Spinner, type SpinnerSize } from './Spinner'

/**
 * Visual variants for the Button component.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'

/**
 * Size options for the Button component.
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

/**
 * Props for the Button component.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Accessible text announced while `loading` is true. */
  loadingText?: string
  disabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  as?: React.ElementType
  href?: string
  className?: string
  children?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  // Kinetic Command primary: orange gradient + glow (docs/LORRYCARRY_DESIGN_SYSTEM.md §9)
  primary:
    'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 active:from-primary-700 active:to-primary-800 text-white border border-primary-400/30 shadow-glow-primary hover:shadow-elevated focus-visible:ring-primary-500',
  secondary:
    'bg-panel hover:bg-sunken active:bg-sunken text-ink border border-hairline hover:border-hairline-strong shadow-xs focus-visible:ring-primary-500',
  outline:
    'bg-transparent hover:bg-wash-soft active:bg-wash text-ink border border-hairline-strong focus-visible:ring-primary-500',
  ghost:
    'bg-transparent hover:bg-wash-soft active:bg-wash text-muted hover:text-ink border border-transparent focus-visible:ring-primary-500',
  danger:
    'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white border border-danger-700/20 shadow-sm focus-visible:ring-danger-500',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-700/20 shadow-sm focus-visible:ring-emerald-500',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs py-2 px-3.5 gap-1.5 min-h-[36px] font-semibold',
  md: 'text-sm py-2.5 px-5 gap-2 min-h-[44px] font-semibold',
  lg: 'text-base py-3 px-6 gap-2.5 min-h-[48px] font-semibold',
  // Square target for icon-only buttons; meets the 44px touch minimum.
  icon: 'p-2.5 min-h-[44px] min-w-[44px] justify-center',
}

const spinnerSizeMap: Record<ButtonSize, SpinnerSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  icon: 'sm',
}

/**
 * Primary action component for the LorryCarry design system.
 *
 * Accessibility:
 * - Keeps a visible focus ring in both themes.
 * - While `loading`, sets `aria-busy` and exposes status text to screen readers.
 * - Icon-only usage requires an `aria-label` from the caller.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      as,
      type = 'button',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Tag = (as || 'button') as any
    const isDisabled = disabled || loading
    const isButton = Tag === 'button'

    const renderLeftIcon = () => {
      if (loading) {
        return <Spinner size={spinnerSizeMap[size]} className="shrink-0" aria-hidden="true" />
      }
      if (leftIcon) {
        return (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )
      }
      return null
    }

    const renderRightIcon = () => {
      if (rightIcon && !loading) {
        return (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )
      }
      return null
    }

    const elementProps = isButton
      ? { type, disabled: isDisabled }
      : { 'aria-disabled': isDisabled, role: props.role || 'button' }

    return (
      <Tag
        ref={ref}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-button outline-none select-none',
          'transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out',
          'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'cursor-pointer active:scale-[0.98] motion-reduce:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : 'w-auto',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none shadow-none',
          className
        )}
        {...elementProps}
        {...props}
      >
        {renderLeftIcon()}
        {children && <span>{children}</span>}
        {renderRightIcon()}
        {loading && <span className="sr-only">{loadingText || 'Loading, please wait'}</span>}
      </Tag>
    )
  }
)

Button.displayName = 'Button'

export default Button
