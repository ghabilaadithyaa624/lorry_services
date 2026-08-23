'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

export type KpiTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

export interface KpiCardProps {
  label: string
  /** Pass `undefined` while loading to render the skeleton state. */
  value?: string | number
  /** Short qualifier rendered under the value. */
  hint?: string
  icon?: React.ComponentType<{ className?: string }>
  tone?: KpiTone
  loading?: boolean
  /** Turns the whole card into a navigation target. */
  href?: string
  /** Renders an attention affordance (e.g. items needing action). */
  emphasis?: boolean
  className?: string
}

const toneStyles: Record<KpiTone, { icon: string; value: string }> = {
  neutral: { icon: 'bg-sunken text-muted', value: 'text-ink' },
  primary: { icon: 'bg-primary-500/10 text-primary-600 dark:text-primary-400', value: 'text-ink' },
  success: { icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', value: 'text-ink' },
  warning: { icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', value: 'text-ink' },
  danger: { icon: 'bg-danger-500/10 text-danger-600 dark:text-danger-400', value: 'text-ink' },
  info: { icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', value: 'text-ink' },
}

/**
 * KpiCard — the standard dashboard metric tile.
 *
 * Renders a skeleton while `loading`, and an em dash when a value is genuinely
 * unavailable, so the UI never implies data that the backend did not return.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  loading = false,
  href,
  emphasis = false,
  className,
}: KpiCardProps) {
  const styles = toneStyles[tone]

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted leading-tight">{label}</p>
        {Icon && (
          <span
            className={cn('shrink-0 w-9 h-9 rounded-xl flex items-center justify-center', styles.icon)}
            aria-hidden="true"
          >
            <Icon className="w-[18px] h-[18px]" />
          </span>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className={cn('text-2xl sm:text-3xl font-bold tracking-tight tabular-nums', styles.value)}>
            {value ?? <span className="text-subtle font-normal">—</span>}
          </p>
        )}
        {hint && !loading && <p className="text-xs text-subtle mt-1 leading-tight">{hint}</p>}
      </div>
    </>
  )

  const baseClass = cn(
    'block p-4 sm:p-5 rounded-card bg-panel border shadow-card transition-all duration-200',
    emphasis ? 'border-primary-500/40' : 'border-hairline',
    href &&
      'hover:shadow-card-hover hover:border-primary-500/40 hover:-translate-y-0.5 cursor-pointer motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    className
  )

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    )
  }

  return <div className={baseClass}>{content}</div>
}

export default KpiCard
