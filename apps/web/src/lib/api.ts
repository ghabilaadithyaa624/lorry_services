import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Mutex / promise for single in-flight token refresh
let isRefreshing = false
let refreshPromise: Promise<string> | null = null

// Response interceptor - handle token refresh with rotation & queue
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = (async () => {
          try {
            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
            if (!refreshToken) {
              throw new Error('No refresh token available')
            }

            const response = await axios.post(`${API_URL}/auth/token/refresh`, {
              refreshToken,
            })

            const { accessToken, refreshToken: newRefreshToken } = response.data
            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', accessToken)
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken)
              }
              const userStr = localStorage.getItem('user')
              if (userStr) {
                try {
                  const user = JSON.parse(userStr)
                  if (user?.role) setAuthCookies(accessToken, user.role)
                } catch {
                  // Ignore parse error
                }
              }
            }

            return accessToken
          } catch (refreshError) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('user')
              clearAuthCookies()
              window.location.href = '/login'
            }
            throw refreshError
          } finally {
            isRefreshing = false
            refreshPromise = null
          }
        })()
      }

      try {
        const newAccessToken = await refreshPromise
        if (originalRequest.headers && newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth helper functions
export const authApi = {
  requestOtp: (phone: string, channel: 'whatsapp' | 'sms' = 'whatsapp') =>
    api.post('/auth/otp/request', { phone, channel }),

  verifyOtp: (phone: string, otp: string, role?: 'load_owner' | 'truck_owner') =>
    api.post('/auth/otp/verify', { phone, otp, role }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/token/refresh', { refreshToken }),

  logout: async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch {
      // Ignore API logout failure to allow local cleanup
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      clearAuthCookies()
    }
  },
}

/**
 * Location API — proxied through backend to keep Mappls API key server-side.
 * Never exposes the API key to the frontend bundle.
 */
export const locationApi = {
  /**
   * Reverse geocode GPS lat/lng to a human-readable Indian address.
   * Calls GET /search/reverse-geocode?lat=X&lng=Y on the NestJS backend.
   */
  reverseGeocode: (lat: number, lng: number) =>
    api.get<{
      formattedAddress: string | null
      city: string | null
      state: string | null
      pincode: string | null
      lat: number
      lng: number
      error?: string
    }>('/search/reverse-geocode', { params: { lat, lng } }),

  /**
   * Geocode a manual address string to coordinates.
   * Calls GET /search/geocode?address=... on the NestJS backend.
   */
  geocode: (address: string) =>
    api.get<{
      formattedAddress: string | null
      city: string | null
      state: string | null
      pincode: string | null
      lat: number | null
      lng: number | null
      error?: string
    }>('/search/geocode', { params: { address } }),

  /**
   * Autosuggest places for manual typing.
   * Calls GET /search/suggestions?query=... on the NestJS backend.
   */
  getSuggestions: (query: string, lat?: number, lng?: number) =>
    api.get<
      Array<{
        placeId: string
        address: string
        pincode?: string
        lat?: number
        lng?: number
        city?: string
        state?: string
      }>
    >('/search/suggestions', { params: { query, lat, lng } }),
}

export const setAuthCookies = (accessToken: string, role: string) => {
  // Set cookies for middleware
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`
  document.cookie = `userRole=${role}; path=/; max-age=${7 * 24 * 60 * 60}`
}

export const clearAuthCookies = () => {
  document.cookie = 'accessToken=; path=/; max-age=0'
  document.cookie = 'userRole=; path=/; max-age=0'
}