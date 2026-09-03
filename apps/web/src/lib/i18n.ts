'use client'

import { useCallback, useEffect, useState } from 'react'
import en from '@/locales/en.json'
import ta from '@/locales/ta.json'
import hi from '@/locales/hi.json'
import {
  LANGUAGE_CHANGE_EVENT,
  UiLanguage,
  isUiLanguage,
  readStoredLanguage,
} from './language'

/**
 * Static UI translation catalogue, sourced from `src/locales/{en,ta,hi}.json`.
 *
 * This powers every surface string that makes the language switcher visible
 * (top-bar navigation, hero messaging, footer, dashboard shells, mobile nav)
 * without pulling a heavy i18n runtime into the web bundle. Keys are
 * namespaced by area: `hero.*`, `nav.*`, `footer.*`, `common.*`, `dash.*`,
 * `mobileNav.*`, `settings.*`.
 *
 * Each locale file only needs to exist — no code changes are required to add
 * new copy, just a matching key in all three JSON files. A future migration
 * to a heavier i18n runtime (i18next, next-intl) can swap the loader below
 * while keeping the `t(key)` contract used throughout the UI unchanged.
 */
const CATALOGS: Record<UiLanguage, Record<string, string>> = { en, ta, hi }

/** Resolve a key for a language. Falls back to English, then the key itself. */
export function translate(key: string, language?: UiLanguage): string {
  const lang = language || readStoredLanguage()
  return CATALOGS[lang]?.[key] || CATALOGS.en[key] || key
}

export interface I18nApi {
  language: UiLanguage
  t: (key: string) => string
}

/**
 * React binding that mirrors the language toggle.
 *
 * Reads the persisted language on mount and keeps the value in sync when the
 * toggle (or another mounted component) broadcasts a change.
 */
export function useI18n(): I18nApi {
  const [language, setLanguage] = useState<UiLanguage>('en')

  useEffect(() => {
    setLanguage(readStoredLanguage())

    const handleExternalChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (isUiLanguage(detail)) setLanguage(detail)
    }
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleExternalChange)
  }, [])

  const t = useCallback((key: string) => translate(key, language), [language])
  return { language, t }
}
