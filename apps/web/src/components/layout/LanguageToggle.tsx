'use client'

import React from 'react'
import { UI_LANGUAGES } from '@/lib/language'
import { useLanguagePreference } from '@/lib/useLanguagePreference'
import { cn } from '@/lib/utils'

interface LanguageToggleProps {
  /** Render the short labels (தமிழ் | EN) for tight breakpoints. */
  compact?: boolean
  className?: string
}

/**
 * LanguageToggle — தமிழ் | हिन्दी | English segmented switch rendered beside
 * the LorryCarry logo in the global header.
 *
 * Behaviour:
 * - Instantly applies from localStorage (no backend round-trip to paint).
 * - When signed in, adopts the account preference on mount (account wins, so
 *   the choice follows the operator across devices) and mirrors every change
 *   back to `/users/preferences` fire-and-forget.
 * - Broadcasts changes so multiple mounted toggles stay in sync.
 */
export function LanguageToggle({ compact = false, className }: LanguageToggleProps) {
  // All resolution/persistence/account-sync logic lives in the shared hook so
  // this toggle, the onboarding picker and Settings can never disagree.
  const { language, setLanguage } = useLanguagePreference()

  return (
    <div
      role="group"
      aria-label="Interface language / இடைமுக மொழி"
      className={cn(
        'inline-flex items-center rounded-full border border-hairline bg-panel p-0.5 shadow-xs',
        className
      )}
    >
      {UI_LANGUAGES.map((option, index) => {
        const active = language === option.value
        return (
          <React.Fragment key={option.value}>
            {index > 0 && (
              <span aria-hidden="true" className="mx-0.5 h-4 border-l border-hairline-strong" />
            )}
            <button
              type="button"
              onClick={() => setLanguage(option.value)}
              aria-pressed={active}
              aria-label={
                active ? `${option.name} (selected language)` : `Switch language to ${option.name}`
              }
              title={option.name}
              className={cn(
                'rounded-full font-semibold transition-colors duration-150 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                compact ? 'px-2 py-1 text-[11px] leading-tight' : 'px-2.5 py-1 text-xs leading-tight',
                active
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-wash'
              )}
            >
              {compact ? option.shortLabel : option.label}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default LanguageToggle
