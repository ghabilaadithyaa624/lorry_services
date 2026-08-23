'use client'

import React, { useCallback, useId, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  /** Optional count rendered as a pill (e.g. unread notifications). */
  count?: number
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /**
   * `underline` for page-level section switching,
   * `pill` for compact filter groups.
   */
  variant?: 'underline' | 'pill'
  /** Accessible name for the tablist. */
  ariaLabel: string
  className?: string
}

/**
 * Tabs — WAI-ARIA compliant tab list.
 *
 * Implements roving tabindex with Arrow/Home/End keyboard navigation, so the
 * whole group is a single tab stop as the APG specifies.
 *
 * Note: this renders the tab *controls* only. Render the active panel yourself
 * with `role="tabpanel"` and `aria-labelledby={`${idBase}-${value}`}` when the
 * panel needs to be formally associated.
 */
export function Tabs({
  items,
  value,
  onChange,
  variant = 'underline',
  ariaLabel,
  className,
}: TabsProps) {
  const idBase = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const focusTab = useCallback((index: number) => {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    if (!tabs || tabs.length === 0) return
    const bounded = (index + tabs.length) % tabs.length
    tabs[bounded]?.focus()
    tabs[bounded]?.click()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          focusTab(currentIndex + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          focusTab(currentIndex - 1)
          break
        case 'Home':
          event.preventDefault()
          focusTab(0)
          break
        case 'End':
          event.preventDefault()
          focusTab(items.length - 1)
          break
      }
    },
    [focusTab, items.length]
  )

  const enabledItems = items.filter((item) => !item.disabled)

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1 overflow-x-auto no-scrollbar',
        variant === 'underline' && 'border-b border-hairline',
        variant === 'pill' && 'p-1 bg-sunken rounded-xl',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === value
        const Icon = item.icon
        const enabledIndex = enabledItems.findIndex((entry) => entry.id === item.id)

        return (
          <button
            key={item.id}
            id={`${idBase}-${item.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`${idBase}-${item.id}-panel`}
            // Roving tabindex: only the active tab is reachable via Tab.
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, enabledIndex)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap font-semibold transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              variant === 'underline' && [
                'px-3.5 py-3 text-sm border-b-2 -mb-px min-h-[44px]',
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-muted hover:text-ink hover:border-hairline-strong',
              ],
              variant === 'pill' && [
                'px-3.5 py-2 text-xs rounded-lg min-h-[36px]',
                isActive
                  ? 'bg-panel text-ink shadow-xs'
                  : 'text-muted hover:text-ink hover:bg-wash-soft',
              ]
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold',
                  isActive
                    ? 'bg-primary-500/15 text-primary-700 dark:text-primary-300'
                    : 'bg-sunken text-muted'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
