import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { MMKV } from 'react-native-mmkv'
import { API_URL } from '../lib/env'
import type { RegistrationRole } from '../lib/roles'
import type {
  ActivityItem,
  AuthUser,
  BookingDetail,
  BookingPaymentConfirmResult,
  BookingPaymentInitInput,
  BookingPaymentInitResult,
  BookingStatus,
  BookingSummary,
  CheckpointCrossingInput,
  CheckpointResult,
  IncidentReportInput,
  IncidentReportResult,
  InitiateSubscriptionResult,
  LegacySubscriptionOrder,
  NotificationsFeed,
  OtpChannel,
  PaymentProvider,
  PaymentRecord,
  PodSubmitInput,
  PodSubmitResult,
  RefreshTokenResponse,
  RequestOtpResponse,
  SubscriptionEntitlement,
  SubscriptionPlanId,
  SubscriptionVerifyResult,
  TrackingStatus,
  TripCompletionInput,
  TripCompletionResult,
  TruckSearchResult,
  UserProfile,
  VerifyOtpResponse,
} from './types'

export type { NotificationItem } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (see lib/env.ts and apps/mobile/.env.example)
// ─────────────────────────────────────────────────────────────────────────────

export { API_URL, WEB_APP_URL } from '../lib/env'

// ─────────────────────────────────────────────────────────────────────────────
// Token storage (single source of truth shared with AuthContext)
// ─────────────────────────────────────────────────────────────────────────────

const storage = new MMKV()

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'

export const tokenStorage = {
  getAccessToken: () => storage.getString(ACCESS_TOKEN_KEY) ?? null,
  getRefreshToken: () => storage.getString(REFRESH_TOKEN_KEY) ?? null,
  getUser: (): AuthUser | null => {
    const raw = storage.getString(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      storage.delete(USER_KEY)
      return null
    }
  },
  setTokens: (accessToken: string, refreshToken?: string | null) => {
    storage.set(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) storage.set(REFRESH_TOKEN_KEY, refreshToken)
  },
  setUser: (user: AuthUser) => {
    storage.set(USER_KEY, JSON.stringify(user))
  },
  clear: () => {
    storage.delete(ACCESS_TOKEN_KEY)
    storage.delete(REFRESH_TOKEN_KEY)
    storage.delete(USER_KEY)
  },
}

/** @deprecated Prefer `tokenStorage.setTokens`. Kept for existing call sites. */
export const setTokens = (accessToken: string, refreshToken: string) =>
  tokenStorage.setTokens(accessToken, refreshToken)

/** @deprecated Prefer `tokenStorage.clear`. Kept for existing call sites. */
export const clearTokens = () => tokenStorage.clear()

// ─────────────────────────────────────────────────────────────────────────────
// Session expiry broadcast — lets AuthContext sign the user out when a refresh
// fails, instead of leaving the app in a half-authenticated state.
// ─────────────────────────────────────────────────────────────────────────────

type SessionListener = () => void
const sessionExpiredListeners = new Set<SessionListener>()

export function onSessionExpired(listener: SessionListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

function emitSessionExpired() {
  tokenStorage.clear()
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Listeners must never break the request pipeline.
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Single in-flight refresh shared by concurrent 401s. The API rotates refresh
 * tokens (the old one is revoked as soon as it is used), so parallel refresh
 * calls would log the user out.
 */
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token')

      // Plain axios: bypass interceptors so a failing refresh cannot recurse.
      const response = await axios.post<RefreshTokenResponse>(
        `${API_URL}/auth/token/refresh`,
        { refreshToken },
        { timeout: 15_000 }
      )

      const { accessToken, refreshToken: rotatedRefreshToken } = response.data
      if (!accessToken) throw new Error('Refresh response missing access token')

      tokenStorage.setTokens(accessToken, rotatedRefreshToken)
      return accessToken
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    const status = error.response?.status
    const url = originalRequest?.url || ''

    const isAuthRoute = url.includes('/auth/otp') || url.includes('/auth/token/refresh')

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true
      try {
        const accessToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Only a definitive rejection from the auth server ends the session.
        // A network blip while refreshing must not sign the user out.
        const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined
        const noRefreshToken = !tokenStorage.getRefreshToken()
        if (noRefreshToken || (refreshStatus !== undefined && refreshStatus >= 400 && refreshStatus < 500)) {
          emitSessionExpired()
        }
      }
    }

    return Promise.reject(error)
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// Error helpers — production-safe messages (never leak stack traces / URLs)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiErrorInfo {
  message: string
  status?: number
  code?: string
  isNetworkError: boolean
  isTimeout: boolean
}

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = firstMessage(item)
      if (msg) return msg
    }
  }
  return undefined
}

/**
 * Convert any thrown value into a user-presentable error. Server validation
 * messages (NestJS `message: string | string[]`) are surfaced when present;
 * transport failures map to friendly copy.
 */
export function getApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): ApiErrorInfo {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data as { message?: unknown; error?: unknown } | undefined
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    const isNetworkError = !error.response && !isTimeout

    if (isTimeout) {
      return {
        message: 'The request timed out. Please check your connection and try again.',
        status,
        code: error.code,
        isNetworkError: false,
        isTimeout: true,
      }
    }

    if (isNetworkError) {
      return {
        message: 'Unable to reach LorryCarry. Please check your internet connection.',
        code: error.code,
        isNetworkError: true,
        isTimeout: false,
      }
    }

    const serverMessage = firstMessage(data?.message) || firstMessage(data?.error)

    let message = serverMessage || fallback
    if (!serverMessage) {
      if (status === 401) message = 'Your session has expired. Please sign in again.'
      else if (status === 403) message = 'You do not have permission to perform this action.'
      else if (status === 404) message = 'The requested record could not be found.'
      else if (status === 429) message = 'Too many attempts. Please wait a moment and try again.'
      else if (status && status >= 500) message = 'LorryCarry is temporarily unavailable. Please try again shortly.'
    }

    return { message, status, code: error.code, isNetworkError: false, isTimeout: false }
  }

  if (error instanceof Error && error.message) {
    return { message: error.message, isNetworkError: false, isTimeout: false }
  }

  return { message: fallback, isNetworkError: false, isTimeout: false }
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  return getApiError(error, fallback).message
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  requestOtp: (phone: string, channel: OtpChannel = 'whatsapp') =>
    api.post<RequestOtpResponse>('/auth/otp/request', { phone, channel }),

  verifyOtp: (phone: string, otp: string, role?: RegistrationRole) =>
    api.post<VerifyOtpResponse>('/auth/otp/verify', { phone, otp, role }),

  refreshToken: (refreshToken: string) =>
    api.post<RefreshTokenResponse>('/auth/token/refresh', { refreshToken }),

  /** Revokes the stored refresh token server-side. Safe to call without one. */
  logout: () => {
    const refreshToken = tokenStorage.getRefreshToken()
    return api.post<{ success: boolean }>('/auth/logout', { refreshToken })
  },

  logoutAll: () => api.post<{ success: boolean }>('/auth/logout-all'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Users API
// ─────────────────────────────────────────────────────────────────────────────

export const usersApi = {
  getProfile: () => api.get<UserProfile>('/users/me'),
  updateProfile: (data: { name?: string }) => api.patch<UserProfile>('/users/me', data),
  getActivity: () => api.get<ActivityItem[]>('/users/activity'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions API
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionsApi = {
  /** Entitlement snapshot: paid plan, 90-day trial countdown, upgrade flags. */
  getStatus: () => api.get<SubscriptionEntitlement>('/subscriptions/status'),

  /**
   * Create a payment record + gateway session. The gateway defaults to the
   * server's PAYMENT_PROVIDER; pass `provider` to override.
   */
  initiate: (plan: SubscriptionPlanId, provider?: PaymentProvider) =>
    api.post<InitiateSubscriptionResult>('/subscriptions/initiate', provider ? { plan, provider } : { plan }),

  /** Server-side verification + activation. Idempotent; safe to poll. */
  verify: (orderId: string) =>
    api.get<SubscriptionVerifyResult>(`/subscriptions/verify/${encodeURIComponent(orderId)}`),

  /**
   * Legacy Cashfree-only order creation (POST /payments/subscription/initialize).
   * Deliberately unused by the app: it trusts a client-supplied amount and
   * stores no plan metadata, so server-side verification would activate the
   * default (monthly) plan regardless of what was paid. Prefer `initiate` +
   * `verify`, which is what the web checkout uses.
   */
  legacyInitialize: (plan: SubscriptionPlanId, amount: number) =>
    api.post<LegacySubscriptionOrder>('/payments/subscription/initialize', { plan, amount }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments API
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsApi = {
  /** All payment rows for the signed-in user (subscriptions + bookings). */
  getHistory: () => api.get<PaymentRecord[]>('/payments/history'),

  getBookingPayments: (bookingId: string) =>
    api.get<PaymentRecord[]>(`/payments/booking/${encodeURIComponent(bookingId)}`),

  initializeBookingPayment: (input: BookingPaymentInitInput) =>
    api.post<BookingPaymentInitResult>('/payments/booking/initialize', input),

  confirmBookingPayment: (paymentId: string, body: { transactionId: string; method?: string }) =>
    api.patch<BookingPaymentConfirmResult>(
      `/payments/booking/${encodeURIComponent(paymentId)}/confirm`,
      body
    ),

  /** Driver action: completes the booking and releases the balance. */
  completeTrip: (input: TripCompletionInput) =>
    api.post<TripCompletionResult>('/payments/trip/complete', input),
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings & tracking API
// ─────────────────────────────────────────────────────────────────────────────

export const bookingsApi = {
  getMyBookings: () => api.get<BookingSummary[]>('/bookings/my-bookings'),
  getOne: (id: string) => api.get<BookingDetail>(`/bookings/${encodeURIComponent(id)}`),
  updateStatus: (id: string, status: BookingStatus) =>
    api.patch<BookingSummary>(`/bookings/${encodeURIComponent(id)}/status`, { status }),
  /** Factory owner only. */
  confirmAdvance: (id: string) =>
    api.patch<BookingSummary>(`/bookings/${encodeURIComponent(id)}/confirm-advance`),
  /** Factory owner only. */
  confirmBalance: (id: string) =>
    api.patch<BookingSummary>(`/bookings/${encodeURIComponent(id)}/confirm-balance`),
}

export const trackingApi = {
  getStatus: (bookingId: string) =>
    api.get<TrackingStatus>(`/tracking/${encodeURIComponent(bookingId)}`),
  recordCheckpoint: (bookingId: string, input: CheckpointCrossingInput) =>
    api.post<CheckpointResult>(`/tracking/${encodeURIComponent(bookingId)}/checkpoint`, input),
  submitPod: (bookingId: string, input: PodSubmitInput) =>
    api.post<PodSubmitResult>(`/tracking/${encodeURIComponent(bookingId)}/pod`, input),
  reportIncident: (bookingId: string, input: IncidentReportInput) =>
    api.post<IncidentReportResult>(`/tracking/${encodeURIComponent(bookingId)}/incident`, input),
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications API
// ─────────────────────────────────────────────────────────────────────────────

/** WhatsApp + in-app notification centre API. */
export const notificationsApi = {
  getNotifications: () => api.get<NotificationsFeed>('/notifications'),
  getUnreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (notificationKey: string) => api.post('/notifications/read', { notificationKey }),
  markAllRead: () => api.post('/notifications/read-all'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Search API
// ─────────────────────────────────────────────────────────────────────────────

export const searchApi = {
  trucks: (params: { lat: number; lng: number; radius: number }, config?: AxiosRequestConfig) =>
    api.get<TruckSearchResult[]>('/search/trucks', { ...config, params }),
}
