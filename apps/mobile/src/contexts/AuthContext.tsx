import React, { createContext, useContext, useState, useEffect } from 'react'
import { MMKV } from 'react-native-mmkv'
import type { AnyUserRole } from '../lib/roles'

const storage = new MMKV()

interface User {
  id: string
  phone: string
  name: string | null
  role: AnyUserRole
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const storedToken = storage.getString('accessToken')
      const storedRefresh = storage.getString('refreshToken')
      const storedUser = storage.getString('user')

      if (storedToken && storedUser) {
        setAccessToken(storedToken)
        setRefreshToken(storedRefresh || null)
        setUser(JSON.parse(storedUser))
      }
    } catch (e) {
      console.error('Failed to load auth state', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (token: string, refresh: string, user: User) => {
    storage.set('accessToken', token)
    storage.set('refreshToken', refresh)
    storage.set('user', JSON.stringify(user))

    setAccessToken(token)
    setRefreshToken(refresh)
    setUser(user)
  }

  const logout = () => {
    storage.delete('accessToken')
    storage.delete('refreshToken')
    storage.delete('user')

    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
