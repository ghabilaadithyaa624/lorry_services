'use client'

import React, { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  className?: string
  containerClassName?: string
}

/**
 * Input Component
 *
 * Form text input element with support for labels, helper hints, error states, and left/right inner elements.
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
          <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-300 mb-1.5 font-sans">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftElement && (
            <div className="absolute left-3.5 flex items-center justify-center text-surface-400 z-10 pointer-events-none">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error || hint ? hintOrErrorId : undefined}
            className={cn(
              'w-full h-11 px-4 py-2.5 rounded-xl bg-surface-950/80',
              'border border-white/10 hover:border-white/20',
              'text-white placeholder:text-surface-400',
              'focus:outline-none focus:border-primary-500 focus:bg-surface-950',
              'transition-colors duration-150 ease-out text-sm font-sans',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-900/50',
              leftElement && 'pl-10',
              rightElement && 'pr-10',
              error && 'border-danger-500 focus:ring-danger-500/30 focus:border-danger-500',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center justify-center text-surface-400 z-10">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p id={hintOrErrorId} className="text-danger-400 text-xs mt-1.5 font-sans">
            {error}
          </p>
        ) : hint ? (
          <p id={hintOrErrorId} className="text-surface-400 text-xs mt-1.5 font-sans">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
