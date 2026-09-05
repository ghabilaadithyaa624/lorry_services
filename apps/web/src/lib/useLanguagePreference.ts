'use client'

import { useCallback, useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import {
  LANGUAGE_CHANGE_EVENT,
  UiLanguage,
  applyLanguage,
  isUiLanguage,
  normalizeLanguage,
  persistLanguage,
  readStoredLanguage,
  resolveInitialLanguage,
} from '@/lib/language'

/**
 * Whether the visitor is signed in, as far as the browser can tell.
 *
 * Deliberately cheap and synchronous: the language chrome must paint before
 * any auth round-trip, and a wrong guess only costs a skipped background sync.
 */
function isSignedIn(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage.getItem('user')
  } catch {
    return false
  }
}

/**
 * Mirror the chosen language onto the account so the preference follows the
 * operator across devices. Fire-and-forget — the local value already drives
 * the UI, and a failed sync must never surface as an error to the user.
 */
export function syncLanguageToAccount(language: UiLanguage): void {
  if (!isSignedIn()) return
  usersApi.updatePreferences({ language }).catch(() => {})
}

export interface LanguagePreferenceApi {
  /** The language currently driving the interface. */
  language: UiLanguage
  /** Select a language: applies it, persists it locally, mirrors to account. */
  setLanguage: (next: UiLanguage) => void
}

/**
 * Single shared implementation of "what language is the UI in, and how do I
 * change it" — used by the header toggle, the pre-auth onboarding picker and
 * the settings centre.
 *
 * Previously each surface reimplemented this: the header toggle synced to the
 * account, while the settings centre wrote `language` straight to
 * `/users/preferences` without ever calling `persistLanguage`. Choosing a
 * language in Settings therefore updated the database but left the interface
 * (and localStorage, and `<html lang>`) untouched until a hard reload picked
 * up the account value — the core reported bug. Routing every surface through
 * this hook keeps local state, the document, and the account in lockstep.
 *
 * Resolution order on mount:
 *  1. explicit device choice (localStorage) — instant, no round-trip,
 *  2. browser/device language for a first-time visitor,
 *  3. the signed-in account preference, which wins once it arrives so the
 *     choice genuinely follows the operator across devices.
 */
export function useLanguagePreference(): LanguagePreferenceApi {
  const [language, setLanguageState] = useState<UiLanguage>('en')

  useEffect(() => {
    // Paint immediately from the device, before any network call.
    const initial = resolveInitialLanguage()
    setLanguageState(initial)
    applyLanguage(initial)

    const handleExternalChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (isUiLanguage(detail)) setLanguageState(detail)
    }
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)

    let cancelled = false
    const adoptAccountPreference = async () => {
      if (!isSignedIn()) return
      try {
        const res = await usersApi.getPreferences()
        if (cancelled) return
        const raw = res.data?.language
        // An account may still hold a legacy unsupported code (te/kn/bn…)
        // from when the settings picker offered languages with no
        // translations. Normalise it and repair the account so the stored
        // value matches what the operator can actually see.
        const accountLanguage = normalizeLanguage(raw, readStoredLanguage())
        if (raw !== accountLanguage) syncLanguageToAccount(accountLanguage)
        if (accountLanguage !== readStoredLanguage()) persistLanguage(accountLanguage)
      } catch {
        // Non-critical — the device preference remains active.
      }
    }
    adoptAccountPreference()

    return () => {
      cancelled = true
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)
    }
  }, [])

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next)
    // persistLanguage stores it, updates <html lang/dir>, and broadcasts to
    // every other mounted picker — so all surfaces update in the same tick.
    persistLanguage(next)
    syncLanguageToAccount(next)
  }, [])

  return { language, setLanguage }
}
