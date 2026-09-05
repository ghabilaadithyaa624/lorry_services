'use client'

import React from 'react'
import { Languages } from 'lucide-react'
import { UI_LANGUAGES } from '@/lib/language'
import { useLanguagePreference } from '@/lib/useLanguagePreference'
import { cn } from '@/lib/utils'

interface OnboardingLanguagePickerProps {
  className?: string
}

/**
 * Prominent language chooser for the pre-auth onboarding flow (role select →
 * verify → dashboard).
 *
 * Why a dedicated component rather than reusing the small header
 * `LanguageToggle`: language is the *first* decision an operator makes, before
 * they read any role copy or type a phone number. A driver whose device is set
 * to Tamil should be able to see and confirm the interface language without
 * hunting for a pill-sized control in the corner. So during onboarding the
 * choice is presented as a labelled, full-width card with large tap targets
 * (≥44px) suited to a phone used in a cab.
 *
 * It writes through the same `useLanguagePreference` hook as every other
 * surface, so the selection made here is applied to the document immediately,
 * survives the redirect into `/login`, and is mirrored onto the account the
 * moment the operator verifies their number.
 */
export function OnboardingLanguagePicker({ className }: OnboardingLanguagePickerProps) {
  const { language, setLanguage } = useLanguagePreference()

  return (
    <section
      aria-labelledby="onboarding-language-heading"
      className={cn(
        'rounded-2xl border border-hairline bg-panel/85 p-3.5 shadow-xs backdrop-blur-sm sm:p-4',
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <Languages className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="onboarding-language-heading"
              className="text-sm font-bold text-ink"
              // Trilingual label: the operator must be able to recognise this
              // control even when the interface is currently in a script they
              // do not read.
            >
              Language · மொழி · भाषा
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Choose your language now — it stays with your account.
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Interface language / இடைமுக மொழி / इंटरफ़ेस भाषा"
          className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0"
        >
          {UI_LANGUAGES.map((option) => {
            const active = language === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                lang={option.value}
                onClick={() => setLanguage(option.value)}
                className={cn(
                  'min-h-[44px] rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel',
                  active
                    ? 'border-primary-500 bg-primary-500 text-white shadow-glow-primary'
                    : 'border-hairline bg-sunken/60 text-body hover:border-primary-500/45 hover:text-ink'
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default OnboardingLanguagePicker
