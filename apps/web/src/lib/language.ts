/**
 * LorryCarry UI Language System
 *
 * Single source of truth for the header language toggle (தமிழ் | हिन्दी | English).
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

export type UiLanguage = 'en' | 'ta' | 'hi'

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
  /** Document text direction — Hindi is rendered right-to-left. */
  direction: 'ltr' | 'rtl'
}

/** Text direction per supported UI language. */
export const LANGUAGE_DIRECTIONS: Record<UiLanguage, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ta: 'ltr',
  hi: 'rtl',
}

/**
 * Toggle order follows the product spec: தமிழ் first, then हिन्दी, then English.
 */
export const UI_LANGUAGES: UiLanguageOption[] = [
  { value: 'ta', label: 'தமிழ்', shortLabel: 'தமிழ்', name: 'Tamil', direction: 'ltr' },
  { value: 'hi', label: 'हिन्दी', shortLabel: 'हिं', name: 'Hindi', direction: 'rtl' },
  { value: 'en', label: 'English', shortLabel: 'EN', name: 'English', direction: 'ltr' },
]

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'en' || value === 'ta' || value === 'hi'
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
 * Apply the language and its text direction to <html lang="…"> and <html dir>
 * so assistive technology, hyphenation, font selection and RTL layout match the
 * chosen interface language.
 */
export function applyLanguage(language: UiLanguage): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.documentElement.dir = LANGUAGE_DIRECTIONS[language] || 'ltr'
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
