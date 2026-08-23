'use client'

import React from 'react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface OperationalEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  steps?: {
    step: string
    title: string
    desc: string
  }[]
  className?: string
}

export function OperationalEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  steps,
  className,
}: OperationalEmptyStateProps) {
  return (
    <div
      className={cn(
        'p-8 sm:p-12 text-center bg-panel rounded-[20px] border border-white/10 shadow-modal space-y-6 max-w-2xl mx-auto',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-950 text-surface-400 border border-white/10 flex items-center justify-center mx-auto shadow-inner-light">
        <Icon className="w-8 h-8 text-primary-400" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans uppercase">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-surface-300 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryAction && (
            <Button
              variant="primary"
              size="md"
              onClick={primaryAction.onClick}
              leftIcon={primaryAction.icon}
              className="font-bold text-xs shadow-glow-primary"
            >
              {primaryAction.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="secondary"
              size="md"
              onClick={secondaryAction.onClick}
              className="text-xs font-semibold"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {steps && steps.length > 0 && (
        <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {steps.map((s) => (
            <div
              key={s.step}
              className="bg-surface-950/70 border border-white/5 rounded-2xl p-3.5 space-y-1 font-mono text-[11px]"
            >
              <span className="text-[10px] font-bold text-primary-400 block tracking-widest">
                STEP {s.step}
              </span>
              <span className="font-bold text-white block truncate">{s.title}</span>
              <span className="text-surface-400 text-[10px] block leading-tight">{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OperationalEmptyState
