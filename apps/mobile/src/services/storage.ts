/**
 * Single MMKV instance + typed auth-token accessors.
 *
 * Every module that needs persisted auth state imports from here so the app has
 * exactly one storage instance and one set of key names.
 */
import { MMKV } from 'react-native-mmkv'
import type { AuthUser } from './types'

export const storage = new MMKV({ id: 'lorrycarry' })

export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
} as const

export function getAccessToken(): string | null {
  return storage.getString(STORAGE_KEYS.accessToken) ?? null
}

export function getRefreshToken(): string | null {
  return storage.getString(STORAGE_KEYS.refreshToken) ?? null
}

export function getStoredUser(): AuthUser | null {
  const raw = storage.getString(STORAGE_KEYS.user)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    // Corrupted payload — drop it rather than crashing on boot.
    storage.delete(STORAGE_KEYS.user)
    return null
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  storage.set(STORAGE_KEYS.accessToken, accessToken)
  storage.set(STORAGE_KEYS.refreshToken, refreshToken)
}

export function setAccessToken(accessToken: string): void {
  storage.set(STORAGE_KEYS.accessToken, accessToken)
}

export function setStoredUser(user: AuthUser): void {
  storage.set(STORAGE_KEYS.user, JSON.stringify(user))
}

export function clearTokens(): void {
  storage.delete(STORAGE_KEYS.accessToken)
  storage.delete(STORAGE_KEYS.refreshToken)
  storage.delete(STORAGE_KEYS.user)
}

/** Subscribers notified when the refresh flow fails and the session is dropped. */
type SessionExpiredListener = () => void
const sessionExpiredListeners = new Set<SessionExpiredListener>()

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

export function emitSessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // A misbehaving listener must never break the auth pipeline.
    }
  })
}
