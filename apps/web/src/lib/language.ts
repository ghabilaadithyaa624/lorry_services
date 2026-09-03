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
  /** Document text direction for this language's script. */
  direction: 'ltr' | 'rtl'
}

/**
 * Text direction per supported UI language script.
 *
 * Tamil and Hindi (Devanagari) are both left-to-right scripts — only Hindi's
 * *keyboard layout* is sometimes confused with RTL languages like Urdu/Arabic,
 * but the Devanagari script itself reads left-to-right. This map is kept
 * (rather than hardcoding `dir="ltr"` everywhere) so the layout is genuinely
 * RTL-ready: adding a real RTL language later (e.g. Urdu `ur`) only requires
 * a new entry here — every chrome component listed below reads its
 * start/end spacing from Tailwind's logical utilities (`ms-*`, `me-*`,
 * `ps-*`, `pe-*`, `start-*`, `end-*`, `border-s`, `border-e`, `text-start`)
 * plus the `rtl:` variant for iconography, so they mirror automatically
 * once `<html dir="rtl">` is set — no per-language CSS overrides needed.
 */
export const LANGUAGE_DIRECTIONS: Record<UiLanguage, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ta: 'ltr',
  hi: 'ltr',
}

/**
 * Toggle order follows the product spec: தமிழ் first, then हिन्दी, then English.
 */
export const UI_LANGUAGES: UiLanguageOption[] = [
  { value: 'ta', label: 'தமிழ்', shortLabel: 'தமிழ்', name: 'Tamil', direction: 'ltr' },
  { value: 'hi', label: 'हिन्दी', shortLabel: 'हिं', name: 'Hindi', direction: 'ltr' },
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
 * Every script-specific class this module may add to <html>. Cleared before
 * applying the new language's class so switching languages never leaves a
 * stale scaling/direction hint behind.
 */
const LANGUAGE_HTML_CLASSES = ['lang-scale-ta'] as const

/**
 * Apply the language, its text direction, and script-specific presentation
 * hints to <html> so assistive technology, hyphenation, font selection, RTL
 * layout, and Tamil font scaling all match the chosen interface language.
 *
 * - `lang="…"` — assistive tech pronunciation, hyphenation, spellcheck.
 * - `dir="…"` — logical (`ms-*`/`ps-*`/`text-start`/`rtl:`) utilities mirror
 *   automatically for any future RTL language; Tamil and Hindi stay LTR.
 * - `.lang-scale-ta` — Tamil glyphs (vowel signs, ligatures) render visually
 *   smaller than Latin/Devanagari at the same font-size, so this class drives
 *   a compensating `font-size`/`line-height` bump defined in globals.css.
 */
export function applyLanguage(language: UiLanguage): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.lang = language
  root.dir = LANGUAGE_DIRECTIONS[language] || 'ltr'
  root.classList.remove(...LANGUAGE_HTML_CLASSES)
  if (language === 'ta') root.classList.add('lang-scale-ta')
}

/**
 * Blocking script injected into <head> so the stored language's `lang`/`dir`
 * attributes and the Tamil font-scaling class are applied before first
 * paint — mirrors THEME_INIT_SCRIPT so switching to Tamil never flashes
 * undersized glyphs, and a future RTL language never flashes a mirrored
 * layout snap-in.
 */
export const LANGUAGE_INIT_SCRIPT = `(function(){try{var k='${LANGUAGE_STORAGE_KEY}';var dirs=${JSON.stringify(
  LANGUAGE_DIRECTIONS
)};var l=localStorage.getItem(k);if(!dirs.hasOwnProperty(l))l='en';var r=document.documentElement;r.lang=l;r.dir=dirs[l]||'ltr';if(l==='ta'){r.classList.add('lang-scale-ta');}}catch(e){}})();`

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
