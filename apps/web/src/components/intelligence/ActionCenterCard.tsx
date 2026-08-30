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
    <div className={cn('bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-4 font-sans', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <BellAlertIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
            Operational Action Center
          </h3>
        </div>
        <Badge variant="warning" size="sm" className="font-mono text-[10px]">
          {tasks.length} Action{tasks.length > 1 ? 's' : ''} Required
        </Badge>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
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
                  <h4 className="text-xs font-bold text-white">
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-surface-300 mt-0.5 leading-relaxed">
                    {task.description}
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
    </div>
  )
}
