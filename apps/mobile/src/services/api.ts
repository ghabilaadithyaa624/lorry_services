import axios from 'axios'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()
const API_URL = 'http://localhost:3002/api/v1' // Change for production

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = storage.getString('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = storage.getString('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const response = await axios.post(`${API_URL}/auth/token/refresh`, {
          refreshToken,
        })

        const { accessToken } = response.data
        storage.set('accessToken', accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Clear storage and let caller handle
        storage.delete('accessToken')
        storage.delete('refreshToken')
        storage.delete('user')
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  requestOtp: (phone: string, channel: 'whatsapp' | 'sms' = 'whatsapp') =>
    api.post('/auth/otp/request', { phone, channel }),

  verifyOtp: (phone: string, otp: string, role?: 'load_owner' | 'truck_owner' | 'driver') =>
    api.post('/auth/otp/verify', { phone, otp, role }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/token/refresh', { refreshToken }),

  logout: () => {
    const refreshToken = storage.getString('refreshToken')
    return api.post('/auth/logout', { refreshToken })
  },
}

export interface NotificationItem {
  id: string
  category: 'BOOKING' | 'LOAD' | 'TRUCK' | 'PAYMENT' | 'KYC' | 'TRACKING' | 'SYSTEM'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  channel?: string
  providerStatus?: string
}

/** WhatsApp + in-app notification centre API. */
export const notificationsApi = {
  getNotifications: () => api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
  getUnreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (notificationKey: string) =>
    api.post('/notifications/read', { notificationKey }),
  markAllRead: () => api.post('/notifications/read-all'),
}

export const setTokens = (accessToken: string, refreshToken: string) => {
  storage.set('accessToken', accessToken)
  storage.set('refreshToken', refreshToken)
}

export const clearTokens = () => {
  storage.delete('accessToken')
  storage.delete('refreshToken')
  storage.delete('user')
}