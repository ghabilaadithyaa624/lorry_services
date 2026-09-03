import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let csrfToken: string | null = null
let fetchingCsrfPromise: Promise<string> | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  if (fetchingCsrfPromise) return fetchingCsrfPromise

  fetchingCsrfPromise = (async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/csrf-token`, {
        withCredentials: true,
      })
      csrfToken = response.data.csrfToken
      return csrfToken || ''
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err)
      return ''
    } finally {
      fetchingCsrfPromise = null
    }
  })()

  return fetchingCsrfPromise
}

// Request interceptor - add auth token and CSRF token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Automatically fetch and attach CSRF token for mutating requests
      const isMutating = ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')
      if (isMutating) {
        const token = await getCsrfToken()
        if (token && config.headers) {
          config.headers['x-csrf-token'] = token
        }
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

  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all')
    } catch {
      // Ignore API failure
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
 * Application preferences persisted per user.
 * Mirrors the UserPreference model exposed by GET/PATCH /users/preferences.
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  currency: string
  distanceUnit: 'km' | 'mi'
  notifyWhatsapp: boolean
  notifySms: boolean
  notifyPush: boolean
  notifyCheckpoints: boolean
  defaultRadiusKm: number
  preferredBodyType: string | null
  autoDetectLocation: boolean
  profileVisible: boolean
}

export interface NotificationFeedItem {
  id: string
  category: 'BOOKING' | 'LOAD' | 'TRUCK' | 'PAYMENT' | 'KYC' | 'TRACKING' | 'SYSTEM'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  channel?: string
  providerStatus?: string
  deliveredAt?: string
}

export interface NotificationFeed {
  notifications: NotificationFeedItem[]
  unreadCount: number
}

/**
 * WhatsApp + in-app notification centre API.
 *
 * These are the canonical endpoints. `/users/notifications` remains as a
 * compatibility alias for existing clients.
 */
export const notificationsApi = {
  getNotifications: () => api.get<NotificationFeed>('/notifications'),
  getUnreadCount: () =>
    api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (notificationKey: string) =>
    api.post('/notifications/read', { notificationKey }),
  markAllRead: () => api.post('/notifications/read-all'),
}

// User Operations Center API
export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { name?: string }) => api.patch('/users/me', data),
  getDocuments: () => api.get('/users/documents'),
  getActivity: () => api.get('/users/activity'),
  getNotifications: () => api.get('/users/notifications'),

  /** Mark one notification (stored or derived) as read. */
  markNotificationRead: (notificationKey: string) =>
    api.post('/users/notifications/read', { notificationKey }),

  /** Mark every notification currently in the feed as read. */
  markAllNotificationsRead: () => api.post('/users/notifications/read-all'),

  getPreferences: () => api.get<UserPreferences>('/users/preferences'),

  updatePreferences: (data: Partial<UserPreferences>) =>
    api.patch<{ success: boolean; message: string; preferences: UserPreferences }>(
      '/users/preferences',
      data
    ),
}

// Admin Operations Command Center API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  listUsers: (role?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (role) params.set('role', role)
    return api.get(`/admin/users?${params.toString()}`)
  },
  getPendingDocuments: () => api.get('/admin/documents/pending'),
  verifyDocument: (documentId: string, status: 'Verified' | 'Rejected', notes?: string) =>
    api.patch(`/admin/documents/${documentId}/verify`, { status, notes }),
  verifyTruck: (truckId: string, status: 'Verified' | 'Rejected') =>
    api.patch(`/admin/trucks/${truckId}/verify`, { status }),
  listSubscriptions: (page = 1, limit = 20) =>
    api.get(`/admin/subscriptions?page=${page}&limit=${limit}`),
  listBookings: (page = 1, limit = 20) =>
    api.get(`/admin/bookings?page=${page}&limit=${limit}`),
}

// Trucks & Documents API
export const trucksApi = {
  getMyTrucks: () => api.get('/trucks/my-trucks'),
  uploadDocument: (truckId: string, docType: 'RC' | 'Insurance', file: File, docNumber?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (docNumber) {
      formData.append('docNumber', docNumber)
    }
    return api.post(`/trucks/${truckId}/documents/${docType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
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
  csrfToken = null
  fetchingCsrfPromise = null
}

export const clearAuthCookies = () => {
  document.cookie = 'accessToken=; path=/; max-age=0'
  document.cookie = 'userRole=; path=/; max-age=0'
  csrfToken = null
}