'use client'

import React from 'react'
import Link from 'next/link'
import {
  BellAlertIcon,
  ShieldExclamationIcon,
  CreditCardIcon,
  TruckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import type { OperationalTask } from '@/lib/intelligence/actionCenterEngine'
import { Badge, type BadgeVariant } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ActionCenterCardProps {
  tasks: OperationalTask[]
  className?: string
  /** Remaining tasks stay accessible in a keyboard-operable disclosure. */
  maxVisible?: number
  loading?: boolean
  showWhenEmpty?: boolean
  /** Failed/unknown sources must not be presented as an all-clear result. */
  unavailableSources?: readonly string[]
  onRetry?: () => void
}

const urgencyBadge: Record<OperationalTask['urgency'], BadgeVariant> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
}

function TaskItem({ task }: { task: OperationalTask }) {
  const Icon = task.category === 'COMPLIANCE' ? ShieldExclamationIcon
    : task.category === 'PAYMENT' ? CreditCardIcon
    : task.category === 'DISPATCH' ? TruckIcon : BellAlertIcon

  return (
    <li className="p-4 rounded-2xl bg-sunken border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border',
          task.urgency === 'HIGH'
            ? 'bg-danger-500/10 text-danger-500 border-danger-500/30'
            : 'bg-primary-500/10 text-primary-500 border-primary-500/30'
        )}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-mono tabular-nums font-bold text-ink break-words">{task.title}</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">{task.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant={urgencyBadge[task.urgency]} size="sm" className="font-mono">
              {task.urgency}
            </Badge>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{task.category}</span>
          </div>
        </div>
      </div>
      <Link
        href={task.actionUrl}
        aria-label={`${task.actionLabel} for ${task.title}`}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-glow-primary text-xs font-bold shrink-0 transition-colors border border-primary-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      >
        <span>{task.actionLabel}</span>
        <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </li>
  )
}

export function ActionCenterCard({
  tasks,
  className,
  maxVisible,
  loading = false,
  showWhenEmpty = false,
  unavailableSources = [],
  onRetry,
}: ActionCenterCardProps) {
  const panelClass = cn('bg-panel rounded-[20px] border border-white/10 p-5 sm:p-6 shadow-modal space-y-4 font-sans', className)
  if (loading) {
    return (
      <section className={panelClass} aria-busy="true" aria-label="Loading operational action center">
        <div className="h-3 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
      </section>
    )
  }

  const incomplete = unavailableSources.length > 0
  if (!tasks.length && !showWhenEmpty && !incomplete) return null
  const visibleCount = typeof maxVisible === 'number' && maxVisible > 0 ? Math.floor(maxVisible) : tasks.length
  const visibleTasks = tasks.slice(0, visibleCount)
  const hiddenTasks = tasks.slice(visibleCount)
  const highestUrgency = tasks.some((task) => task.urgency === 'HIGH') ? 'HIGH'
    : tasks.some((task) => task.urgency === 'MEDIUM') ? 'MEDIUM' : 'LOW'

  return (
    <section className={panelClass} aria-label="Operational action center">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20 shrink-0">
            <BellAlertIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-widest">Operational Action Center</h3>
        </div>
        {tasks.length > 0 && (
          <Badge variant={urgencyBadge[highestUrgency]} size="sm" className="font-mono tabular-nums">
            {tasks.length} Action{tasks.length === 1 ? '' : 's'} Required
          </Badge>
        )}
      </div>

      {incomplete && (
        <div role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 space-y-2">
          <p className="text-sm font-bold text-ink">
            {tasks.length ? 'Some action data is unavailable' : 'Action data unavailable'}
          </p>
          <p className="text-xs text-muted leading-relaxed">
            Could not check: {unavailableSources.join(', ')}. Available records are still shown; retry to check the remaining actions.
          </p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="min-h-[44px] px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel">
              Retry action data
            </button>
          )}
        </div>
      )}

      {!tasks.length && !incomplete && (
        <div role="status" className="flex items-start gap-3">
          <CheckCircleIcon className="w-6 h-6 text-success-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-ink">No urgent actions</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              No pending actions were found in your latest operational data. New actions will appear here when your records update.
            </p>
          </div>
        </div>
      )}

      {visibleTasks.length > 0 && (
        <ul className="space-y-3" aria-label="Priority actions">
          {visibleTasks.map((task) => <TaskItem key={task.id} task={task} />)}
        </ul>
      )}
      {hiddenTasks.length > 0 && (
        <details className="group">
          <summary className="min-h-[44px] py-3 cursor-pointer rounded-lg text-xs font-mono tabular-nums font-bold text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            Show {hiddenTasks.length} more action{hiddenTasks.length === 1 ? '' : 's'}
          </summary>
          <ul className="space-y-3 pt-2" aria-label="More actions">
            {hiddenTasks.map((task) => <TaskItem key={task.id} task={task} />)}
          </ul>
        </details>
      )}
    </section>
  )
}
