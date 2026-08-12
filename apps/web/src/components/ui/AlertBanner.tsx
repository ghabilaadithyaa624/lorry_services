'use client'

import React from 'react'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export type AlertBannerVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Semantic color variant.
   * @default 'info'
   */
  variant?: AlertBannerVariant
  /**
   * Title text string.
   */
  title?: string
  /**
   * Optional custom icon element override.
   */
  icon?: React.ReactNode
  /**
   * Optional action button or element rendered on the right.
   */
  action?: React.ReactNode
  /**
   * Banner content message.
   */
  children?: React.ReactNode
  /**
   * Additional CSS class names.
   */
  className?: string
}

const variantStyles: Record<
  AlertBannerVariant,
  { container: string; iconColor: string; titleColor: string; textColor: string; DefaultIcon: any }
> = {
  info: {
    container: 'bg-sky-950/40 border-sky-500/30',
    iconColor: 'text-sky-400',
    titleColor: 'text-sky-300',
    textColor: 'text-sky-200',
    DefaultIcon: InformationCircleIcon,
  },
  success: {
    container: 'bg-emerald-950/40 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300',
    textColor: 'text-emerald-200',
    DefaultIcon: CheckCircleIcon,
  },
  warning: {
    container: 'bg-amber-950/40 border-amber-500/30',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
    textColor: 'text-amber-200',
    DefaultIcon: ExclamationTriangleIcon,
  },
  danger: {
    container: 'bg-danger-950/40 border-danger-500/30',
    iconColor: 'text-danger-400',
    titleColor: 'text-danger-300',
    textColor: 'text-danger-200',
    DefaultIcon: XCircleIcon,
  },
}

/**
 * AlertBanner Component
 *
 * Operational notification and exception alert banner primitive.
 */
export function AlertBanner({
  variant = 'info',
  title,
  icon,
  action,
  children,
  className,
  ...props
}: AlertBannerProps) {
  const style = variantStyles[variant]
  const IconComponent = style.DefaultIcon

  return (
    <div
      role="alert"
      className={cn(
        'p-4 rounded-2xl border  flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono',
        style.container,
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className={cn('shrink-0 mt-0.5', style.iconColor)}>
          {icon || <IconComponent className="w-5 h-5" />}
        </div>
        <div className="space-y-0.5">
          {title && <p className={cn('font-bold uppercase tracking-wider', style.titleColor)}>{title}</p>}
          {children && <div className={cn('leading-relaxed', style.textColor)}>{children}</div>}
        </div>
      </div>

      {action && <div className="shrink-0 pt-2 sm:pt-0">{action}</div>}
    </div>
  )
}

export default AlertBanner
