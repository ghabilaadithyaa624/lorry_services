'use client'

import React, { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Optional label text rendered above the input.
   */
  label?: string
  /**
   * Optional error message string. Highlights border in red and displays error message below input.
   */
  error?: string
  /**
   * Optional helper hint text displayed below the input (hidden when error is present).
   */
  hint?: string
  /**
   * Icon or element positioned inside the left side of the input field.
   */
  leftElement?: React.ReactNode
  /**
   * Icon or element positioned inside the right side of the input field.
   */
  rightElement?: React.ReactNode
  /**
   * Additional CSS classes for the `<input>` element.
   */
  className?: string
  /**
   * Optional container CSS classes.
   */
  containerClassName?: string
}

/**
 * Input Component
 *
 * Form text input element with support for labels, helper hints, error states, and left/right inner elements.
 *
 * @example
 * <Input
 *   label="Mobile Number"
 *   placeholder="Enter your phone number"
 *   leftElement={<PhoneIcon className="w-5 h-5" />}
 *   error={errors.phone?.message}
 * />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      className,
      containerClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const hintOrErrorId = `${inputId}-${error ? 'error' : 'hint'}`

    return (
      <div className={cn('w-full flex flex-col', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftElement && (
            <div className="absolute left-3 flex items-center justify-center text-surface-400 dark:text-surface-500 z-10 pointer-events-none">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={(error || hint) ? hintOrErrorId : undefined}
            className={cn(
              'w-full px-4 py-2.5 rounded-input bg-white dark:bg-surface-800',
              'border border-surface-300 dark:border-surface-700',
              'text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:ring-primary-500/30 dark:focus:border-primary-500',
              'transition-all duration-200 text-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-100 dark:disabled:bg-surface-800/50',
              leftElement && 'pl-10',
              rightElement && 'pr-10',
              error &&
                'border-danger-500 dark:border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center text-surface-400 dark:text-surface-500 z-10">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p id={hintOrErrorId} className="text-danger-600 dark:text-danger-500 text-xs mt-1.5">
            {error}
          </p>
        ) : hint ? (
          <p id={hintOrErrorId} className="text-surface-500 dark:text-surface-400 text-xs mt-1.5">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
