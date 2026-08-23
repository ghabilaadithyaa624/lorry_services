'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type TimelineStatus = 'complete' | 'current' | 'upcoming' | 'error'

export interface TimelineItem {
  id: string
  title: string
  description?: React.ReactNode
  /** Pre-formatted timestamp string. */
  timestamp?: string
  status?: TimelineStatus
  icon?: React.ComponentType<{ className?: string }>
  meta?: React.ReactNode
}

export interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

const statusStyles: Record<TimelineStatus, { node: string; line: string; title: string }> = {
  complete: {
    node: 'bg-emerald-500 border-emerald-500 text-white',
    line: 'bg-emerald-500/40',
    title: 'text-ink',
  },
  current: {
    node: 'bg-primary-500 border-primary-500 text-white ring-4 ring-primary-500/15',
    line: 'bg-hairline',
    title: 'text-ink font-semibold',
  },
  upcoming: {
    node: 'bg-panel border-hairline-strong text-subtle',
    line: 'bg-hairline',
    title: 'text-muted',
  },
  error: {
    node: 'bg-danger-500 border-danger-500 text-white',
    line: 'bg-hairline',
    title: 'text-ink',
  },
}

/**
 * Timeline — vertical event/progress list.
 *
 * Rendered as an ordered list so assistive tech conveys sequence and position.
 * Used for activity history, booking lifecycle, and tracking checkpoints.
 */
export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, index) => {
        const status = item.status || 'complete'
        const styles = statusStyles[status]
        const Icon = item.icon
        const isLast = index === items.length - 1

        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector rail */}
            {!isLast && (
              <span
                className={cn('absolute left-[15px] top-8 bottom-0 w-px', styles.line)}
                aria-hidden="true"
              />
            )}

            {/* Node */}
            <span
              className={cn(
                'relative z-10 shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
                styles.node
              )}
              aria-hidden="true"
            >
              {Icon ? (
                <Icon className="w-4 h-4" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className={cn('text-sm leading-snug', styles.title)}>{item.title}</p>
                {item.timestamp && (
                  <time className="text-xs text-subtle shrink-0">{item.timestamp}</time>
                )}
              </div>

              {item.description && (
                <div className="text-xs text-muted mt-1 leading-relaxed break-words">
                  {item.description}
                </div>
              )}

              {item.meta && <div className="mt-2">{item.meta}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default Timeline
