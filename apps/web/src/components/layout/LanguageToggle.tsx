'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import {
  UI_LANGUAGES,
  UiLanguage,
  applyLanguage,
  isUiLanguage,
  persistLanguage,
  readStoredLanguage,
  LANGUAGE_CHANGE_EVENT,
} from '@/lib/language'
import { cn } from '@/lib/utils'

interface LanguageToggleProps {
  /** Render the short labels (தமிழ் | EN) for tight breakpoints. */
  compact?: boolean
  className?: string
}

/**
 * LanguageToggle — தமிழ் | English segmented switch rendered beside the
 * LorryCarry logo in the global header.
 *
 * Behaviour:
 * - Instantly applies from localStorage (no backend round-trip to paint).
 * - When signed in, adopts the account preference on mount (account wins, so
 *   the choice follows the operator across devices) and mirrors every change
 *   back to `/users/preferences` fire-and-forget.
 * - Broadcasts changes so multiple mounted toggles stay in sync.
 */
export function LanguageToggle({ compact = false, className }: LanguageToggleProps) {
  const [language, setLanguage] = useState<UiLanguage>('en')

  useEffect(() => {
    const stored = readStoredLanguage()
    setLanguage(stored)
    applyLanguage(stored)

    const handleExternalChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (isUiLanguage(detail)) setLanguage(detail)
    }
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)

    // Adopt the server-side account preference when signed in. Best-effort:
    // failure must never block the header chrome.
    let cancelled = false
    const syncFromAccount = async () => {
      try {
        if (!window.localStorage.getItem('user')) return
        const res = await usersApi.getPreferences()
        const accountLanguage = res.data?.language
        if (
          !cancelled &&
          isUiLanguage(accountLanguage) &&
          accountLanguage !== readStoredLanguage()
        ) {
          persistLanguage(accountLanguage)
        }
      } catch {
        // Non-critical — local preference remains active.
      }
    }
    syncFromAccount()

    return () => {
      cancelled = true
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)
    }
  }, [])

  const select = useCallback((next: UiLanguage) => {
    setLanguage(next)
    persistLanguage(next)
    // Mirror to the account when signed in. Fire-and-forget; local state is
    // the instant source of truth for the UI.
    try {
      if (window.localStorage.getItem('user')) {
        usersApi.updatePreferences({ language: next }).catch(() => {})
      }
    } catch {
      // Non-critical.
    }
  }, [])

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
              onClick={() => select(option.value)}
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
