'use client'

import React, { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /** Marks the field visually and for assistive tech. */
  required?: boolean
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  className?: string
  containerClassName?: string
}

/**
 * Input — labelled text field with hint and error states.
 *
 * Accessibility:
 * - Label is always associated via htmlFor/id.
 * - Errors are linked with aria-describedby and announced via role="alert".
 * - aria-invalid reflects the error state.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      required,
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
    const messageId = `${inputId}-${error ? 'error' : 'hint'}`

    return (
      <div className={cn('w-full flex flex-col', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-body mb-1.5"
          >
            {label}
            {required && (
              <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftElement && (
            <div
              className="absolute left-3.5 flex items-center justify-center text-subtle z-10 pointer-events-none"
              aria-hidden="true"
            >
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error || hint ? messageId : undefined}
            className={cn(
              'w-full min-h-[44px] px-4 py-2.5 rounded-input',
              'bg-panel border border-hairline-strong',
              'text-ink placeholder:text-subtle',
              'hover:border-primary-500/40',
              'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              'transition-colors duration-150 ease-out text-sm',
              'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-sunken',
              leftElement && 'pl-10',
              rightElement && 'pr-10',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center justify-center text-subtle z-10">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p id={messageId} role="alert" className="text-danger-600 dark:text-danger-400 text-xs mt-1.5">
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="text-subtle text-xs mt-1.5">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  containerClassName?: string
  children?: React.ReactNode
}

/**
 * Select — native select styled to match Input.
 *
 * Uses the native control deliberately: it gives correct keyboard behaviour,
 * mobile pickers, and screen-reader support for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, className, containerClassName, id, children, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const messageId = `${selectId}-${error ? 'error' : 'hint'}`

    return (
      <div className={cn('w-full flex flex-col', containerClassName)}>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-body mb-1.5">
            {label}
            {required && (
              <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error || hint ? messageId : undefined}
            className={cn(
              'w-full min-h-[44px] pl-4 pr-10 py-2.5 rounded-input appearance-none',
              'bg-panel border border-hairline-strong text-ink text-sm',
              'hover:border-primary-500/40',
              'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              'transition-colors duration-150 ease-out cursor-pointer',
              'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-sunken',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
              className
            )}
            {...props}
          >
            {children}
          </select>
          {/* Chevron affordance; native arrow is hidden via appearance-none */}
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {error ? (
          <p id={messageId} role="alert" className="text-danger-600 dark:text-danger-400 text-xs mt-1.5">
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="text-subtle text-xs mt-1.5">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  containerClassName?: string
}

/**
 * Textarea — multi-line text field matching the Input styling contract.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className, containerClassName, id, ...props }, ref) => {
    const generatedId = useId()
    const areaId = id || generatedId
    const messageId = `${areaId}-${error ? 'error' : 'hint'}`

    return (
      <div className={cn('w-full flex flex-col', containerClassName)}>
        {label && (
          <label htmlFor={areaId} className="block text-xs font-semibold text-body mb-1.5">
            {label}
            {required && (
              <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          id={areaId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'w-full px-4 py-3 rounded-input min-h-[96px] resize-y',
            'bg-panel border border-hairline-strong text-ink placeholder:text-subtle text-sm',
            'hover:border-primary-500/40',
            'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'transition-colors duration-150 ease-out',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-sunken',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
            className
          )}
          {...props}
        />

        {error ? (
          <p id={messageId} role="alert" className="text-danger-600 dark:text-danger-400 text-xs mt-1.5">
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="text-subtle text-xs mt-1.5">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Input
