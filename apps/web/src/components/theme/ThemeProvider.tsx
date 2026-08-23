'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme'

interface ThemeContextValue {
  /** The user's stored preference ('system' follows the OS). */
  theme: ThemePreference
  /** The theme actually rendered right now. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
  /** Convenience toggle between explicit light and dark. */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Provides theme state to the application and keeps <html> in sync.
 *
 * The initial class is applied by a blocking script in the document head
 * (see THEME_INIT_SCRIPT), so this provider only handles subsequent updates
 * and cross-tab / OS-level changes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Hydrate from storage on mount.
  useEffect(() => {
    const stored = readStoredTheme()
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = resolveTheme(stored, prefersDark)
    setThemeState(stored)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Follow the OS when the preference is 'system'.
  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = event.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  // Keep multiple tabs consistent.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      const stored = readStoredTheme()
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const resolved = resolveTheme(stored, prefersDark)
      setThemeState(stored)
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: ThemePreference) => {
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = resolveTheme(next, prefersDark)

    setThemeState(next)
    setResolvedTheme(resolved)
    applyTheme(resolved)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Non-fatal: theme still applies for this session.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Access the current theme. Returns a safe no-op default when used outside the
 * provider so isolated component tests don't need to wrap in ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
    }
  }
  return context
}

export default ThemeProvider
