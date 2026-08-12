'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Spinner, type SpinnerSize } from './Spinner'

/**
 * Visual variants for the Button component.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

/**
 * Size options for the Button component.
 */
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Props for the Button component.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
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
  primary:
    'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-glow-primary border border-primary-400/30 focus-visible:ring-primary-500/50',
  secondary:
    'bg-surface-900/80 hover:bg-surface-800 active:bg-surface-950 text-white border border-white/10 hover:border-white/20  focus-visible:ring-surface-400/50',
  ghost:
    'bg-transparent hover:bg-white/5 active:bg-white/10 text-surface-300 hover:text-white border border-transparent focus-visible:ring-surface-400/50',
  danger:
    'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white border border-danger-500/30 shadow-sm focus-visible:ring-danger-500/50',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500/30 shadow-sm focus-visible:ring-emerald-500/50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs py-2 px-3.5 gap-1.5 font-sans font-semibold',
  md: 'text-sm py-2.5 px-5 gap-2 font-sans font-semibold',
  lg: 'text-base py-3 px-6 gap-2.5 font-sans font-semibold',
}

const spinnerSizeMap: Record<ButtonSize, SpinnerSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
}

/**
 * Button component for actions and navigation in LorryCarry Kinetic Command design system.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
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
        return <span className="inline-flex shrink-0">{leftIcon}</span>
      }
      return null
    }

    const renderRightIcon = () => {
      if (rightIcon && !loading) {
        return <span className="inline-flex shrink-0">{rightIcon}</span>
      }
      return null
    }

    const elementProps = isButton
      ? { type, disabled: isDisabled }
      : { 'aria-disabled': isDisabled, role: props.role || 'button' }

    return (
      <Tag
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-button transition-transform duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070A11] cursor-pointer active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : 'w-auto',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none shadow-none transform-none',
          className
        )}
        {...elementProps}
        {...props}
      >
        {renderLeftIcon()}
        {children && <span>{children}</span>}
        {renderRightIcon()}
      </Tag>
    )
  }
)

Button.displayName = 'Button'

export default Button
