'use client'

import React, { useEffect, useRef, useState } from 'react'
import { BoltIcon } from '@heroicons/react/24/outline'
import { ActionCenterCard } from './ActionCenterCard'
import { useOperationalTasks } from '@/lib/intelligence/useOperationalTasks'
import { cn } from '@/lib/utils'

interface ActionCenterMenuProps {
  /** Role override — otherwise resolved from the persisted session. */
  role?: string | null
  /** Number of tasks rendered inside the popover before the "+N more" line. */
  maxVisible?: number
  className?: string
}

/**
 * Operational Action Center — dashboard shell / navbar entry point.
 *
 * Renders a telemetry-style counter in the top bar and drops the shared
 * `ActionCenterCard` into a popover, so every authenticated route (not just the
 * overview page) surfaces pending KYC, payment, E-Way Bill, subscription and
 * dispatch work derived from live API data.
 */
export function ActionCenterMenu({ role, maxVisible = 4, className }: ActionCenterMenuProps) {
  const { tasks, summary, loading, loaded } = useOperationalTasks({ role })
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Nothing pending and nothing loading: keep the shell uncluttered.
  if (!loading && tasks.length === 0) return null

  const count = summary.total
  const hasUrgent = summary.high > 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          count > 0
            ? `Operational action center, ${count} action${count === 1 ? '' : 's'} required`
            : 'Operational action center'
        }
        className={cn(
          'relative flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-mono font-bold uppercase tracking-widest transition-colors min-h-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          hasUrgent
            ? 'border-primary-500/40 bg-primary-500/10 text-primary-500'
            : 'border-hairline bg-transparent text-muted hover:text-ink hover:bg-wash'
        )}
      >
        <BoltIcon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Actions</span>
        {count > 0 && (
          <span
            className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center"
            aria-hidden="true"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Operational action center"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,380px)] max-h-[75vh] overflow-y-auto"
        >
          <ActionCenterCard
            tasks={tasks}
            loading={loading && !loaded}
            maxVisible={maxVisible}
            showWhenEmpty
            className="shadow-modal"
          />
        </div>
      )}
    </div>
  )
}
