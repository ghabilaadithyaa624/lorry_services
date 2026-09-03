/**
 * LorryCarry UI Language System
 *
 * Single source of truth for the header language toggle (தமிழ் | English).
 *
 * The preference is persisted locally so the choice is instant and survives
 * reloads without a backend round-trip. When the operator is signed in, the
 * choice is additionally mirrored to the account (`usersApi.updatePreferences`)
 * so it follows them across devices — the same strategy the theme system uses.
 *
 * Interface translation coverage is rolled out progressively; the toggle sets
 * the document `lang` attribute and stores the canonical preference consumed
 * by the settings centre and notification templates.
 */

export type UiLanguage = 'en' | 'ta'

export const LANGUAGE_STORAGE_KEY = 'lc-language'
export const LANGUAGE_CHANGE_EVENT = 'lc-language-change'

export interface UiLanguageOption {
  value: UiLanguage
  /** Full label rendered in the header toggle. */
  label: string
  /** Short label for tight (mobile) breakpoints. */
  shortLabel: string
  /** English name, used for accessible annotations. */
  name: string
}

/**
 * Toggle order follows the product spec: தமிழ் first, English second.
 */
export const UI_LANGUAGES: UiLanguageOption[] = [
  { value: 'ta', label: 'தமிழ்', shortLabel: 'தமிழ்', name: 'Tamil' },
  { value: 'en', label: 'English', shortLabel: 'EN', name: 'English' },
]

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'en' || value === 'ta'
}

/**
 * Read the persisted preference. Falls back to English when unset/invalid.
 * Safe to call on the server (returns 'en').
 */
export function readStoredLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'en'
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isUiLanguage(raw)) return raw
  } catch {
    // localStorage unavailable (private mode / blocked storage)
  }
  return 'en'
}

/**
 * Apply the language to <html lang="…"> so assistive technology, hyphenation
 * and font selection match the chosen interface language.
 */
export function applyLanguage(language: UiLanguage): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
}

/**
 * Persist the preference locally, apply it to the document, and broadcast the
 * change so every mounted toggle (header, drawer, settings) stays in sync.
 */
export function persistLanguage(language: UiLanguage): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Storage blocked — the in-memory switch still works for this session.
  }
  applyLanguage(language)
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: language }))
}
