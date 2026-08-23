/**
 * LorryCarry Theme System
 *
 * Single source of truth for theme preference resolution.
 * The visual tokens themselves live in `globals.css` as CSS custom properties,
 * exposed to Tailwind via semantic colour utilities (canvas/panel/ink/muted/...).
 *
 * Preference is persisted locally so the choice survives reloads without
 * requiring a backend round-trip, and is mirrored to the server when the user
 * is authenticated (see `usersApi.updatePreferences`).
 */

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'lc-theme'

/**
 * Resolve a stored preference into the theme actually applied to the document.
 */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean
): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

/**
 * Read the persisted preference. Falls back to 'system' when unset/invalid.
 * Safe to call on the server (returns 'system').
 */
export function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage unavailable (private mode / blocked cookies)
  }
  return 'system'
}

/**
 * Apply the resolved theme to <html>, keeping `class="dark"` and the native
 * `color-scheme` hint in sync so form controls and scrollbars match.
 */
export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

/**
 * Blocking script injected into <head> to apply the stored theme before first
 * paint. Prevents a light/dark flash on hydration.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var p=localStorage.getItem(k)||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`
