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
import { OperationalTask } from '@/lib/intelligence/actionCenterEngine'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ActionCenterCardProps {
  tasks: OperationalTask[]
  className?: string
  /** Show only the N most urgent tasks with a "+N more" footer. */
  maxVisible?: number
  /** Renders a lightweight skeleton while the dashboard data is in flight. */
  loading?: boolean
  /** Render a positive "all clear" panel instead of nothing when idle. */
  showWhenEmpty?: boolean
}

export function ActionCenterCard({
  tasks,
  className,
  maxVisible,
  loading = false,
  showWhenEmpty = false,
}: ActionCenterCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-3 font-sans',
          className
        )}
        aria-busy="true"
        aria-label="Loading operational action center"
      >
        <div className="h-3 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    if (!showWhenEmpty) return null

    return (
      <div
        className={cn(
          'bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal font-sans flex items-start gap-3',
          className
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
          <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-widest">
            Operational Action Center
          </h3>
          <p className="text-sm font-bold text-ink">No urgent actions</p>
          <p className="text-[11px] text-surface-300 leading-relaxed">
            Compliance, payments and dispatch are all clear — your documents, trips and
            subscription are in good standing. New actions will surface here automatically.
          </p>
        </div>
      </div>
    )
  }

  const getTaskIcon = (category: OperationalTask['category']) => {
    switch (category) {
      case 'COMPLIANCE':
        return ShieldExclamationIcon
      case 'PAYMENT':
        return CreditCardIcon
      case 'DISPATCH':
        return TruckIcon
      default:
        return BellAlertIcon
    }
  }

  const visibleTasks =
    typeof maxVisible === 'number' && maxVisible > 0 ? tasks.slice(0, maxVisible) : tasks
  const hiddenCount = tasks.length - visibleTasks.length

  return (
    <div className={cn('bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-4 font-sans', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <BellAlertIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-widest">
            Operational Action Center
          </h3>
        </div>
        <Badge variant="warning" size="sm" className="font-mono text-[10px]">
          {tasks.length} Action{tasks.length > 1 ? 's' : ''} Required
        </Badge>
      </div>

      <div className="space-y-3">
        {visibleTasks.map((task) => {
          const Icon = getTaskIcon(task.category)
          return (
            <div
              key={task.id}
              className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/15 transition-all shadow-card"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border',
                  task.urgency === 'HIGH'
                    ? 'bg-danger-500/10 text-danger-400 border-danger-500/30'
                    : 'bg-primary-500/10 text-primary-400 border-primary-500/30'
                )}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-surface-300 mt-0.5 leading-relaxed">
                    {task.description}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-surface-400 mt-1.5">
                    <span
                      className={cn(
                        task.urgency === 'HIGH' ? 'text-danger-400' : 'text-primary-400'
                      )}
                    >
                      {task.urgency}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{task.category}</span>
                  </p>
                </div>
              </div>

              <Link
                href={task.actionUrl}
                aria-label={`${task.actionLabel} for ${task.title}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:from-primary-600 hover:to-primary-700 text-white shadow-glow-primary text-xs font-bold shrink-0 transition-all cursor-pointer border border-primary-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
              >
                <span>{task.actionLabel}</span>
                <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-surface-400 pt-1">
          +{hiddenCount} more action{hiddenCount > 1 ? 's' : ''} pending
        </p>
      )}
    </div>
  )
}
