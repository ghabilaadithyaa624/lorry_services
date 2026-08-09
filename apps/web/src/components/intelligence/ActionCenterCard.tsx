'use client'

import React from 'react'
import Link from 'next/link'
import {
  BellAlertIcon,
  ShieldExclamationIcon,
  CreditCardIcon,
  TruckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { OperationalTask } from '@/lib/intelligence/actionCenterEngine'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ActionCenterCardProps {
  tasks: OperationalTask[]
  className?: string
}

export function ActionCenterCard({ tasks, className }: ActionCenterCardProps) {
  if (!tasks || tasks.length === 0) return null

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

  return (
    <div className={cn('bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-5 shadow-card space-y-4', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BellAlertIcon className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
            Operational Action Center
          </h3>
        </div>
        <Badge variant="warning" size="sm">
          {tasks.length} Action{tasks.length > 1 ? 's' : ''} Required
        </Badge>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const Icon = getTaskIcon(task.category)
          return (
            <div
              key={task.id}
              className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  task.urgency === 'HIGH'
                    ? 'bg-danger-50 text-danger-600 dark:bg-danger-950/40 dark:text-danger-400'
                    : 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-surface-900 dark:text-white">
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </div>

              <Link
                href={task.actionUrl}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-900 text-white dark:bg-white dark:text-surface-900 hover:opacity-90 text-xs font-bold shrink-0 transition-opacity"
              >
                <span>{task.actionLabel}</span>
                <ArrowRightIcon className="w-3 h-3 shrink-0" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
