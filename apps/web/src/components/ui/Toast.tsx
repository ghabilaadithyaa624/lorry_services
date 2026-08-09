'use client'

import React, { useEffect } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'
import { useToastStore, type ToastItem as ToastItemType, type ToastType } from '@/lib/toast'

/**
 * Toast style and icon configuration mapped by toast type.
 */
const toastTypeConfig: Record<
  ToastType,
  {
    containerClass: string
    textClass: string
    iconClass: string
    Icon: React.ComponentType<{ className?: string }>
  }
> = {
  success: {
    containerClass:
      'bg-success-50 dark:bg-success-950/90 border border-success-200 dark:border-success-800/80',
    textClass: 'text-success-900 dark:text-success-100',
    iconClass: 'text-success-600 dark:text-success-400',
    Icon: CheckCircleIcon,
  },
  error: {
    containerClass:
      'bg-danger-50 dark:bg-danger-950/90 border border-danger-200 dark:border-danger-800/80',
    textClass: 'text-danger-900 dark:text-danger-100',
    iconClass: 'text-danger-600 dark:text-danger-400',
    Icon: XCircleIcon,
  },
  warning: {
    containerClass:
      'bg-warning-50 dark:bg-warning-950/90 border border-warning-200 dark:border-warning-800/80',
    textClass: 'text-warning-900 dark:text-warning-100',
    iconClass: 'text-warning-600 dark:text-warning-400',
    Icon: ExclamationTriangleIcon,
  },
  info: {
    containerClass:
      'bg-info-50 dark:bg-info-950/90 border border-info-200 dark:border-info-800/80',
    textClass: 'text-info-900 dark:text-info-100',
    iconClass: 'text-info-600 dark:text-info-400',
    Icon: InformationCircleIcon,
  },
}

export interface ToastItemProps {
  /** The toast data object containing id, type, message, and duration */
  toast: ToastItemType
}

/**
 * Individual Toast card component with auto-dismiss timer and dismissal handler.
 */
export function ToastItem({ toast }: ToastItemProps) {
  const dismiss = useToastStore((state) => state.dismiss)
  const config = toastTypeConfig[toast.type]
  const Icon = config.Icon

  useEffect(() => {
    const duration = toast.duration ?? 4000
    if (duration <= 0) return

    const timer = setTimeout(() => {
      dismiss(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, dismiss])

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto rounded-card p-4 border shadow-card flex items-start gap-3 animate-toast-in transition-all',
        config.containerClass
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconClass)} />
      <p className={cn('text-sm font-medium flex-1 leading-snug', config.textClass)}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-surface-400 hover:text-surface-600 dark:text-surface-400 dark:hover:text-surface-200 transition-colors p-0.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

/**
 * ToastProvider component that renders a fixed container at the top-right of the screen (z-50).
 * Displays up to 5 active toasts stacked vertically with gap-3.
 */
export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts)
  const visibleToasts = toasts.slice(-5)

  if (visibleToasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {visibleToasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

export default ToastProvider
