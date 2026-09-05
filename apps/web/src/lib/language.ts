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
 * Canonical list of language codes the platform actually ships translations
 * for. Anything not in this list must never reach persistence — see
 * `normalizeLanguage`.
 *
 * This is deliberately derived from `UI_LANGUAGES` (rather than typed out a
 * second time) so a new language is added in exactly one place and the header
 * toggle, the settings centre, and the API DTO can never drift apart again.
 */
export const SUPPORTED_LANGUAGE_CODES: UiLanguage[] = UI_LANGUAGES.map((option) => option.value)

/**
 * Options for a `<select>`-style language picker (settings centre, onboarding).
 *
 * Labels pair the native name with the English name — an operator whose UI is
 * currently in a script they can't read still needs to find their language.
 */
export const LANGUAGE_SELECT_OPTIONS: Array<{ value: UiLanguage; label: string }> =
  UI_LANGUAGES.map((option) => ({
    value: option.value,
    label: option.name === option.label ? option.label : `${option.label} (${option.name})`,
  }))

/**
 * Coerce any stored/remote value into a language the UI can actually render.
 *
 * Historically the settings centre offered eight Indian languages while only
 * three had translations, so accounts could hold codes such as `te`/`bn` that
 * every consumer silently ignored — the picker showed Telugu while the
 * interface stayed English. Unsupported codes now degrade to the fallback so
 * the stored value and the rendered interface always agree.
 */
export function normalizeLanguage(value: unknown, fallback: UiLanguage = 'en'): UiLanguage {
  return isUiLanguage(value) ? value : fallback
}

/** Interface language used when nothing has been chosen or detected. */
export const DEFAULT_LANGUAGE: UiLanguage = 'en'

/**
 * Read the persisted preference. Falls back to English when unset/invalid.
 * Safe to call on the server (returns 'en').
 */
export function readStoredLanguage(): UiLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isUiLanguage(raw)) return raw
  } catch {
    // localStorage unavailable (private mode / blocked storage)
  }
  return DEFAULT_LANGUAGE
}

/**
 * Whether the operator has ever made an explicit choice on this device.
 *
 * Used by onboarding to distinguish "chose English" from "never chose", so a
 * first-time visitor can be shown their browser/device language without
 * overriding a deliberate selection.
 */
export function hasStoredLanguage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return isUiLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return false
  }
}

/**
 * Best guess at the operator's language for a brand-new device, from the
 * browser's `navigator.language`/`languages` list.
 *
 * Only the base subtag is considered (`ta-IN` → `ta`) and unsupported
 * languages fall through to English, so a Telugu-locale device gets a working
 * English interface rather than an untranslated Telugu one.
 */
export function detectBrowserLanguage(): UiLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ]
  for (const candidate of candidates) {
    const base = String(candidate || '').toLowerCase().split('-')[0]
    if (isUiLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}

/**
 * The language onboarding should preselect: an explicit device choice wins,
 * otherwise the detected browser language.
 */
export function resolveInitialLanguage(): UiLanguage {
  return hasStoredLanguage() ? readStoredLanguage() : detectBrowserLanguage()
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
)};var l=localStorage.getItem(k);if(!dirs.hasOwnProperty(l)){l='en';var nav=(navigator.languages||[navigator.language||'']);for(var i=0;i<nav.length;i++){var b=String(nav[i]||'').toLowerCase().split('-')[0];if(dirs.hasOwnProperty(b)){l=b;break;}}}var r=document.documentElement;r.lang=l;r.dir=dirs[l]||'ltr';if(l==='ta'){r.classList.add('lang-scale-ta');}}catch(e){}})();`

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
