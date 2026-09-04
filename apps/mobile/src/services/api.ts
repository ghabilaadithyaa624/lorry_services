import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

import { API_URL } from '../config'
import {
  clearTokens,
  emitSessionExpired,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setTokens,
} from './storage'
import type {
  BookingSummary,
  InitiateSubscriptionResponse,
  NotificationFeed,
  OtpRequestResponse,
  PaymentRecord,
  PaymentProvider,
  RegistrationRole,
  SubscriptionEntitlement,
  SubscriptionOrderResponse,
  SubscriptionPlanId,
  TrackingSnapshot,
  TripCompletionResponse,
  TruckSearchResult,
  VerifyOrderResponse,
  VerifyOtpResponse,
  BookingStatus,
} from './types'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ───────────────────────────────────────────────────────────────────────────
// Interceptors — bearer token injection + single-flight refresh
// ───────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/** In-flight refresh promise so concurrent 401s only trigger one refresh call. */
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token stored')

  const response = await axios.post<{ accessToken: string; refreshToken?: string }>(
    `${API_URL}/auth/token/refresh`,
    { refreshToken },
    { timeout: 20000 },
  )

  const { accessToken, refreshToken: rotated } = response.data
  if (!accessToken) throw new Error('Refresh response did not contain an access token')

  if (rotated) {
    setTokens(accessToken, rotated)
  } else {
    setAccessToken(accessToken)
  }
  return accessToken
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/')
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const accessToken = await refreshPromise

      originalRequest.headers = {
        ...(originalRequest.headers as Record<string, string>),
        Authorization: `Bearer ${accessToken}`,
      }
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh failed — the session is unrecoverable. Drop it and let the
      // AuthContext route the user back to login.
      clearTokens()
      emitSessionExpired()
      return Promise.reject(refreshError)
    }
  },
)

// ───────────────────────────────────────────────────────────────────────────
// Error handling
// ───────────────────────────────────────────────────────────────────────────

/**
 * Turn any thrown value into a production-safe, user-facing message.
 * Never leaks stack traces, URLs or provider internals.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Check your connection and try again.'
    }
    if (!error.response) {
      return 'No internet connection. Connect to a network and try again.'
    }

    const status = error.response.status
    const data = error.response.data as { message?: string | string[] } | undefined
    const serverMessage = Array.isArray(data?.message) ? data?.message[0] : data?.message

    if (status === 401) return 'Your session has expired. Please sign in again.'
    if (status === 403) return serverMessage || 'You do not have access to this action.'
    if (status === 404) return serverMessage || 'We could not find that record.'
    if (status === 429) return 'Too many attempts. Please wait a moment and try again.'
    if (status >= 500) return 'LorryCarry servers are busy right now. Please try again shortly.'

    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** True when the failure was caused by connectivity rather than the server. */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

// ───────────────────────────────────────────────────────────────────────────
// Auth
// ───────────────────────────────────────────────────────────────────────────

export const authApi = {
  requestOtp: (phone: string, channel: 'whatsapp' | 'sms' = 'whatsapp') =>
    api.post<OtpRequestResponse>('/auth/otp/request', { phone, channel }),

  verifyOtp: (phone: string, otp: string, role?: RegistrationRole) =>
    api.post<VerifyOtpResponse>('/auth/otp/verify', { phone, otp, role }),

  refreshToken: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken?: string }>('/auth/token/refresh', { refreshToken }),

  logout: () => {
    const refreshToken = getRefreshToken()
    return api.post('/auth/logout', { refreshToken })
  },
}

// ───────────────────────────────────────────────────────────────────────────
// Subscriptions & payments
// ───────────────────────────────────────────────────────────────────────────

export const subscriptionsApi = {
  /** GET /subscriptions/status — entitlement snapshot (trial + paid plan). */
  getStatus: () => api.get<SubscriptionEntitlement>('/subscriptions/status'),

  /** POST /subscriptions/initiate — create a gateway order + checkout session. */
  initiate: (plan: SubscriptionPlanId, provider?: PaymentProvider) =>
    api.post<InitiateSubscriptionResponse>('/subscriptions/initiate', { plan, provider }),

  /** GET /subscriptions/verify/:orderId — server-side verification of a gateway order. */
  verify: (orderId: string) =>
    api.get<VerifyOrderResponse>(`/subscriptions/verify/${encodeURIComponent(orderId)}`),

  /** GET /subscriptions/callback/:orderId — same verification used by the web return URL. */
  callback: (orderId: string) =>
    api.get<VerifyOrderResponse>(`/subscriptions/callback/${encodeURIComponent(orderId)}`),
}

export const paymentsApi = {
  /** GET /payments/history — every Payment row for the signed-in user. */
  getHistory: () => api.get<PaymentRecord[]>('/payments/history'),

  /** POST /payments/subscription/initialize — Cashfree-only subscription order. */
  initializeSubscription: (plan: SubscriptionPlanId, amount: number) =>
    api.post<SubscriptionOrderResponse>('/payments/subscription/initialize', { plan, amount }),

  /** GET /payments/booking/:bookingId — payment history for one booking. */
  getBookingPayments: (bookingId: string) =>
    api.get<PaymentRecord[]>(`/payments/booking/${encodeURIComponent(bookingId)}`),

  /** POST /payments/trip/complete — driver completes a trip and releases balance. */
  completeTrip: (payload: {
    bookingId: string
    podDetails: { consigneeName: string; podPhotoUrl?: string; deliveryNotes?: string }
  }) => api.post<TripCompletionResponse>('/payments/trip/complete', payload),
}

// ───────────────────────────────────────────────────────────────────────────
// Bookings & tracking
// ───────────────────────────────────────────────────────────────────────────

export const bookingsApi = {
  /** GET /bookings/my-bookings — bookings for the signed-in user's side of the market. */
  getMyBookings: () => api.get<BookingSummary[]>('/bookings/my-bookings'),

  getById: (bookingId: string) =>
    api.get<BookingSummary>(`/bookings/${encodeURIComponent(bookingId)}`),

  updateStatus: (bookingId: string, status: BookingStatus) =>
    api.patch<BookingSummary>(`/bookings/${encodeURIComponent(bookingId)}/status`, { status }),
}

export const trackingApi = {
  get: (bookingId: string) =>
    api.get<TrackingSnapshot>(`/tracking/${encodeURIComponent(bookingId)}`),

  recordCheckpoint: (bookingId: string, payload: { checkpointSeq: number; lat: number; lng: number }) =>
    api.post(`/tracking/${encodeURIComponent(bookingId)}/checkpoint`, payload),

  submitPod: (
    bookingId: string,
    payload: { consigneeName: string; podUrl?: string; notes?: string },
  ) => api.post(`/tracking/${encodeURIComponent(bookingId)}/pod`, payload),

  reportIncident: (
    bookingId: string,
    payload: { category: string; description: string; impactMinutes: number },
  ) => api.post(`/tracking/${encodeURIComponent(bookingId)}/incident`, payload),
}

// ───────────────────────────────────────────────────────────────────────────
// Notifications & search
// ───────────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  getNotifications: () => api.get<NotificationFeed>('/notifications'),
  getUnreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (notificationKey: string) => api.post('/notifications/read', { notificationKey }),
  markAllRead: () => api.post('/notifications/read-all'),
}

export const searchApi = {
  trucks: (params: { lat: number; lng: number; radius: number; truckType?: string }) =>
    api.get<TruckSearchResult[]>('/search/trucks', { params }),
}

export { setTokens, clearTokens } from './storage'
export type { NotificationItem } from './types'
