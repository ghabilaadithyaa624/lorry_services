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
    containerClass: 'bg-[#0F131D] border border-emerald-500/30 shadow-modal',
    textClass: 'text-emerald-200',
    iconClass: 'text-emerald-400',
    Icon: CheckCircleIcon,
  },
  error: {
    containerClass: 'bg-[#0F131D] border border-danger-500/30 shadow-modal',
    textClass: 'text-danger-200',
    iconClass: 'text-danger-400',
    Icon: XCircleIcon,
  },
  warning: {
    containerClass: 'bg-[#0F131D] border border-amber-500/30 shadow-modal',
    textClass: 'text-amber-200',
    iconClass: 'text-amber-400',
    Icon: ExclamationTriangleIcon,
  },
  info: {
    containerClass: 'bg-[#0F131D] border border-sky-500/30 shadow-modal',
    textClass: 'text-sky-200',
    iconClass: 'text-sky-400',
    Icon: InformationCircleIcon,
  },
}

export interface ToastItemProps {
  toast: ToastItemType
}

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
        'pointer-events-auto rounded-2xl p-4 border shadow-modal flex items-start gap-3 animate-toast-in transition-all font-mono text-xs',
        config.containerClass
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconClass)} />
      <p className={cn('font-medium flex-1 leading-snug', config.textClass)}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-surface-400 hover:text-white transition-colors p-0.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0 cursor-pointer"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

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
