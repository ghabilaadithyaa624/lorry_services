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
 * Props for the Button component, supporting custom icons, loading states, full width, and polymorphic element rendering.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant.
   * @default 'primary'
   */
  variant?: ButtonVariant
  /**
   * Button size.
   * @default 'md'
   */
  size?: ButtonSize
  /**
   * If true, shows a spinner and disables user interaction.
   * @default false
   */
  loading?: boolean
  /**
   * If true, disables the button.
   * @default false
   */
  disabled?: boolean
  /**
   * Element or icon to display before button text.
   */
  leftIcon?: React.ReactNode
  /**
   * Element or icon to display after button text.
   */
  rightIcon?: React.ReactNode
  /**
   * If true, button expands to 100% width of parent container.
   * @default false
   */
  fullWidth?: boolean
  /**
   * Polymorphic component type to render (e.g., 'button', 'a', or router Link).
   * @default 'button'
   */
  as?: React.ElementType
  /**
   * Target URL when rendered as a link element.
   */
  href?: string
  /**
   * Additional CSS class names.
   */
  className?: string
  /**
   * Button content.
   */
  children?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-sm hover:shadow-md focus:ring-primary-500/50',
  secondary:
    'bg-surface-100 hover:bg-surface-200 active:bg-surface-300 text-surface-800 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-100 border border-surface-200 dark:border-surface-700 focus:ring-surface-400/50',
  ghost:
    'bg-transparent hover:bg-surface-100 active:bg-surface-200 text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-100 dark:hover:bg-surface-800 focus:ring-surface-400/50',
  danger:
    'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white shadow-sm focus:ring-danger-500/50',
  success:
    'bg-success-600 hover:bg-success-700 active:bg-success-800 text-white shadow-sm focus:ring-success-500/50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm py-2 px-4 gap-1.5',
  md: 'text-sm py-2.5 px-5 gap-2',
  lg: 'text-base py-3 px-6 gap-2.5',
}

const spinnerSizeMap: Record<ButtonSize, SpinnerSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
}

/**
 * Button component for actions and navigation in the LorryCarry design system.
 * Supports primary, secondary, ghost, danger, and success variants, loading states, icons, and polymorphic rendering.
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
    const Component = as || 'button'
    const isDisabled = disabled || loading
    const isButton = Component === 'button'

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
      <Component
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-button transition-all duration-200 outline-none select-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-surface-900',
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
      </Component>
    )
  }
)

Button.displayName = 'Button'

export default Button
