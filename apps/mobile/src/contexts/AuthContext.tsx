import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, onSessionExpired, tokenStorage } from '../services/api'
import type { AuthUser } from '../services/types'

export type User = AuthUser

interface AuthContextType {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  login: (token: string, refreshToken: string, user: User) => void
  /** Clears local credentials and best-effort revokes the refresh token. */
  logout: () => Promise<void>
  /** Persist a profile change (e.g. name update) without re-authenticating. */
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    tokenStorage.clear()
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }, [])

  // Hydrate from MMKV. Storage is shared with the API client, so the axios
  // interceptor can refresh tokens without going through React state.
  useEffect(() => {
    try {
      const storedToken = tokenStorage.getAccessToken()
      const storedRefresh = tokenStorage.getRefreshToken()
      const storedUser = tokenStorage.getUser()

      if (storedToken && storedUser) {
        setAccessToken(storedToken)
        setRefreshToken(storedRefresh)
        setUser(storedUser)
      } else if (storedToken || storedUser) {
        // Half-written session — do not trust it.
        tokenStorage.clear()
      }
    } catch (e) {
      console.error('Failed to load auth state', e)
      tokenStorage.clear()
    } finally {
      setIsLoading(false)
    }
  }, [])

  // When the API client fails to refresh an expired token it clears storage
  // and notifies us so the navigator falls back to the login stack.
  useEffect(() => onSessionExpired(clearSession), [clearSession])

  const login = useCallback((token: string, refresh: string, nextUser: User) => {
    tokenStorage.setTokens(token, refresh)
    tokenStorage.setUser(nextUser)

    setAccessToken(token)
    setRefreshToken(refresh)
    setUser(nextUser)
  }, [])

  const logout = useCallback(async () => {
    const hadRefreshToken = Boolean(tokenStorage.getRefreshToken())
    try {
      if (hadRefreshToken) await authApi.logout()
    } catch {
      // Offline or already revoked — local sign-out still proceeds.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => {
      if (!current) return current
      const next = { ...current, ...patch }
      tokenStorage.setUser(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, isLoading, login, logout, updateUser }),
    [user, accessToken, refreshToken, isLoading, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
