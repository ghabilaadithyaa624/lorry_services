import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi, getApiErrorMessage, subscriptionsApi } from '../services/api'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  onSessionExpired,
  setStoredUser,
  setTokens,
} from '../services/storage'
import type { AuthUser, SubscriptionEntitlement } from '../services/types'

export type User = AuthUser

interface AuthContextType {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean

  login: (token: string, refreshToken: string, user: User) => void
  logout: () => Promise<void>

  /** Server-owned entitlement snapshot; `null` until first successful fetch. */
  entitlement: SubscriptionEntitlement | null
  entitlementLoading: boolean
  entitlementError: string | null
  /** Re-read `GET /subscriptions/status`. Returns the fresh snapshot or null. */
  refreshEntitlement: () => Promise<SubscriptionEntitlement | null>
  /** True only when the backend confirms a paid plan or an active trial. */
  hasPremiumAccess: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null)
  const [entitlementLoading, setEntitlementLoading] = useState(false)
  const [entitlementError, setEntitlementError] = useState<string | null>(null)

  // Restore the persisted session on boot.
  useEffect(() => {
    try {
      const storedToken = getAccessToken()
      const storedUser = getStoredUser()

      if (storedToken && storedUser) {
        setAccessTokenState(storedToken)
        setRefreshTokenState(getRefreshToken())
        setUser(storedUser)
      } else if (storedToken || storedUser) {
        // Partial state is unusable — clear it so the user re-authenticates.
        clearTokens()
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearSession = useCallback(() => {
    clearTokens()
    setAccessTokenState(null)
    setRefreshTokenState(null)
    setUser(null)
    setEntitlement(null)
    setEntitlementError(null)
  }, [])

  // The API client drops the session when a token refresh fails; mirror that
  // here so the navigator sends the user back to the login screen.
  useEffect(() => onSessionExpired(clearSession), [clearSession])

  const login = useCallback((token: string, refresh: string, nextUser: User) => {
    setTokens(token, refresh)
    setStoredUser(nextUser)

    setAccessTokenState(token)
    setRefreshTokenState(refresh)
    setUser(nextUser)
    setEntitlement(null)
    setEntitlementError(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      // Best-effort refresh-token revocation; never block sign-out on it.
      await authApi.logout()
    } catch {
      // Offline or already-revoked token — local state is cleared either way.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const refreshEntitlement = useCallback(async (): Promise<SubscriptionEntitlement | null> => {
    if (!getAccessToken()) return null

    setEntitlementLoading(true)
    setEntitlementError(null)
    try {
      const { data } = await subscriptionsApi.getStatus()
      setEntitlement(data)
      return data
    } catch (error) {
      setEntitlementError(getApiErrorMessage(error, 'Could not load your subscription status.'))
      return null
    } finally {
      setEntitlementLoading(false)
    }
  }, [])

  // Load entitlement whenever a session becomes available.
  useEffect(() => {
    if (user && accessToken) {
      void refreshEntitlement()
    }
  }, [user, accessToken, refreshEntitlement])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isLoading,
      login,
      logout,
      entitlement,
      entitlementLoading,
      entitlementError,
      refreshEntitlement,
      hasPremiumAccess: entitlement?.hasPremiumAccess === true,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isLoading,
      login,
      logout,
      entitlement,
      entitlementLoading,
      entitlementError,
      refreshEntitlement,
    ],
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
