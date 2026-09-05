import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { FreightEstimate, PricingInput } from './intelligence/pricingEngine'
import type { MatchResult } from './intelligence/matchingEngine'
import type { NationalLogisticsSummary } from './intelligence/nationalLogisticsEngine'
import { isPublicPath } from './publicRoutes'
import { normalizeRole } from './roles'
import type { PublicRegistrationRole } from './roles'

// Use the same-origin rewrite by default so browser requests work behind a
// preview/proxy host. Direct API origins remain configurable for deployments.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

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
              /**
               * Only force the login hop on authenticated screens. Public pages
               * such as `/help` and `/security` render the app shell and probe
               * the API on mount; for an anonymous visitor that probe always
               * answers 401, and the redirect used to bounce them off a page
               * they are allowed to read. Stale credentials are still cleared.
               * `isPublicPath` returns false for a missing pathname, so the
               * existing behaviour is preserved wherever it is unknown.
               */
              if (!isPublicPath(window.location?.pathname)) {
                window.location.href = '/login'
              }
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

  verifyOtp: (phone: string, otp: string, role?: PublicRegistrationRole) =>
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
  getAnalytics: (rangeDays = 30) => api.get(`/admin/analytics?range=${rangeDays}`),
  getIntelligence: () => api.get<NationalLogisticsSummary>('/admin/intelligence'),
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
  checkVahan: (truckId: string) =>
    api.post(`/admin/trucks/${truckId}/vahan-check`),
  listSubscriptions: (page = 1, limit = 20) =>
    api.get(`/admin/subscriptions?page=${page}&limit=${limit}`),
  listBookings: (page = 1, limit = 20) =>
    api.get(`/admin/bookings?page=${page}&limit=${limit}`),
  listDisputes: (status?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)
    return api.get(`/admin/disputes?${params.toString()}`)
  },
  resolveDispute: (disputeId: string, status: 'Investigating' | 'Resolved' | 'Rejected', resolution?: string) =>
    api.patch(`/admin/disputes/${disputeId}/resolve`, { status, resolution }),
}

/**
 * Subscription / trial entitlement API.
 * Feature 13: 3-month free trial, countdown data & multi-gateway checkout.
 */
export const subscriptionsApi = {
  /** Full entitlement snapshot (trial + subscription status, countdown data). */
  getStatus: () => api.get('/subscriptions/status'),

  /** Create a gateway checkout session (cashfree | razorpay | stripe). */
  initiate: (plan: 'monthly' | 'quarterly' | 'annual', provider?: 'cashfree' | 'razorpay' | 'stripe') =>
    api.post('/subscriptions/initiate', { plan, provider }),

  /** Server-side payment verification used by the callback page. */
  verify: (orderId: string) => api.get(`/subscriptions/verify/${orderId}`),

  /** Dedicated callback verification endpoint (kept for Cashfree compat). */
  callback: (orderId: string) => api.get(`/subscriptions/callback/${orderId}`),
}

/**
 * Booking commercial terms API.
 * Payment milestones use dedicated confirm-advance / confirm-balance
 * endpoints rather than PATCH /bookings/:id/status.
 */
export const bookingsApi = {
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getOne: (id: string) => api.get(`/bookings/${id}`),
  create: (data: {
    loadId: string
    truckId: string
    agreedPrice: number
    ewayBillNumber?: string
    liabilityAccepted?: boolean
  }) => api.post('/bookings', data),
  /** Factory owner confirms 50% loading advance release. */
  confirmAdvance: (id: string) => api.patch(`/bookings/${id}/confirm-advance`),
  /** Factory owner confirms 50% delivery balance release on POD receipt. */
  confirmBalance: (id: string) => api.patch(`/bookings/${id}/confirm-balance`),
  /** Lifecycle status only — do not use this to confirm advance/balance. */
  updateStatus: (
    id: string,
    status: string,
    extra?: { advanceConfirmed?: boolean; balanceConfirmed?: boolean },
  ) => api.patch(`/bookings/${id}/status`, { status, ...extra }),
  createDispute: (
    id: string,
    data: { category?: string; priority?: string; description: string },
  ) => api.post(`/bookings/${id}/disputes`, data),
}

// Loads API — freight-side posts (factory owners and transporters)
export const loadsApi = {
  getMyLoads: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/loads/my-loads', { params }),
  /** Edit an open load (owner only server-side). */
  updateLoad: (
    loadId: string,
    data: {
      loadingAddress?: string
      loadingPin?: string
      unloadingAddress?: string
      unloadingPin?: string
      tonnageRequired?: number
      truckType?: string
      urgent?: boolean
      maxPrice?: number
      minLengthFt?: number
      minHeightFt?: number
      expectedDeliveryAt?: string
    },
  ) => api.patch(`/loads/${loadId}`, data),
  /** Delete an open load (owner only server-side). */
  deleteLoad: (loadId: string) => api.delete(`/loads/${loadId}`),
}

// Trucks & Documents API
export const trucksApi = {
  getMyTrucks: () => api.get('/trucks/my-trucks'),
  /** Edit the revisable specs of an owned truck (owner only server-side). */
  updateTruck: (
    truckId: string,
    data: {
      bodyType?: string
      lengthFt?: number
      heightFt?: number
      tonnageCapacity?: number
      serviceableRadiusKm?: number
      preferredDestinations?: string[]
    },
  ) => api.patch(`/trucks/${truckId}`, data),
  /** Move an owned truck's current location (re-geocodes & re-runs proximity matching, owner only). */
  updateTruckLocation: (truckId: string, address: string) =>
    api.patch(`/trucks/${truckId}/location`, { address }),
  /** Delete an owned truck (blocked server-side while bookings are active). */
  deleteTruck: (truckId: string) => api.delete(`/trucks/${truckId}`),
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
 * Booking digital freight document chain API.
 *
 * The chain covers the seven trip stages: BOOKING → EWAY_BILL → LOADING →
 * TRANSIT → DELIVERY → POD → BALANCE. Files are stored in private object
 * storage (AWS S3 / MinIO); this client only ever exchanges short-lived
 * pre-signed URLs with the API — no storage credentials or permanent links.
 *
 * Upload flow (3 steps):
 *   1. requestUploadUrl()   → { uploadUrl, key }
 *   2. PUT the file bytes to `uploadUrl` (plain fetch — no auth headers)
 *   3. register()           → persisted chain document (verified by admins)
 */
export type BookingDocumentStage =
  | 'BOOKING'
  | 'EWAY_BILL'
  | 'LOADING'
  | 'TRANSIT'
  | 'DELIVERY'
  | 'POD'
  | 'BALANCE'

export type BookingDocumentVerificationStatus = 'Pending' | 'Verified' | 'Rejected'

export interface BookingDocumentRecord {
  id: string
  bookingId: string
  stage: BookingDocumentStage
  docNumber?: string | null
  originalFilename?: string | null
  mimeType?: string | null
  fileSize?: number | null
  signedBy?: string | null
  uploadedAt: string
  uploadedBy?: { id: string; name?: string | null } | null
  verificationStatus: BookingDocumentVerificationStatus
  verificationNotes?: string | null
  verifiedById?: string | null
  verifiedAt?: string | null
  verifiedBy?: { id: string; name?: string | null } | null
}

export interface BookingDocumentUploadUrlRequest {
  stage: BookingDocumentStage
  fileName: string
  contentType: 'image/jpeg' | 'image/png' | 'application/pdf'
  docNumber?: string
  signedBy?: string
}

export interface BookingDocumentUploadUrl {
  bookingId: string
  stage: BookingDocumentStage
  key: string
  uploadUrl: string
  contentType: string
  expiresIn: number
}

export interface BookingDocumentRegisterRequest {
  stage: BookingDocumentStage
  key: string
  contentType: 'image/jpeg' | 'image/png' | 'application/pdf'
  fileName?: string
  docNumber?: string
  signedBy?: string
  fileSize?: number
}

export interface BookingDocumentDownloadUrl {
  bookingId: string
  documentId: string
  stage: BookingDocumentStage
  fileName: string
  downloadUrl: string
  expiresIn: number
  expiresAt: string
}

export const bookingDocumentsApi = {
  /** List chain documents for a booking (parties & admins only). */
  list: (bookingId: string) =>
    api.get<{ bookingId: string; documents: BookingDocumentRecord[] }>(
      `/bookings/${bookingId}/documents`
    ),

  /** Step 1 — request a pre-signed PUT URL for a chain stage. */
  requestUploadUrl: (bookingId: string, body: BookingDocumentUploadUrlRequest) =>
    api.post<BookingDocumentUploadUrl>(`/bookings/${bookingId}/documents/upload-url`, body),

  /** Step 3 — register a completed direct-to-storage upload. */
  register: (bookingId: string, body: BookingDocumentRegisterRequest) =>
    api.post<BookingDocumentRecord>(`/bookings/${bookingId}/documents`, body),

  /** Get a fresh, time-limited pre-signed download URL for one document. */
  getDownloadUrl: (bookingId: string, documentId: string) =>
    api.get<BookingDocumentDownloadUrl>(
      `/bookings/${bookingId}/documents/${documentId}/download-url`
    ),
}

// Matching Engine — Need Load ↔ Need Vehicle
export type MatchStatus = 'Pending' | 'Booked' | 'Completed' | 'Cancelled'
export interface MatchRecord {
  id: string
  loadId: string
  truckId: string
  loadOwnerId: string
  truckOwnerId: string
  status: MatchStatus
  distanceKm?: number | string
  matchScore?: number
  tonnageCompatible?: boolean
  routeCompatible?: boolean
  budgetCompatible?: boolean
  bookingId?: string | null
  notifiedAt?: string | null
  createdAt: string
  updatedAt: string
  load?: {
    id: string
    tonnageRequired: number | string
    loadingAddress: string
    unloadingAddress: string
    truckType: string
    maxPrice?: number | string | null
    status: string
    user?: { phone?: string; name?: string }
  }
  truck?: {
    id: string
    registrationNumber: string
    bodyType: string
    tonnageCapacity: number | string
    verificationStatus: string
    currentLat?: number | string | null
    currentLng?: number | string | null
    user?: { phone?: string; name?: string }
  }
  booking?: { id: string; status: string; agreedPrice?: number | string } | null
  computedMatch?: {
    score: number
    rating: string
    label: string
    reasons: string[]
    warnings: string[]
    isCapacityFit: boolean
    isBudgetFit: boolean
    isProximityFit: boolean
    distanceKm: number
  }
}

/**
 * Return-load (backhaul) intelligence — `GET /matching/truck/:truckId/return-loads`.
 * The API resolves the drop-off hub, queries the open load board around it, and
 * ranks the candidates with the shared return-load engine.
 */
export type ReturnLoadAnchorSource =
  | 'query_override'
  | 'booking_destination'
  | 'truck_current_location'
  | 'unresolved'

export interface ReturnLoadAnchor {
  lat: number | null
  lng: number | null
  label: string
  source: ReturnLoadAnchorSource
  bookingId?: string
  bookingStatus?: string
  droppedAt?: string | null
  detail: string
}

export interface ReturnLoadRankFactor {
  key: 'matchScore' | 'pickupProximity' | 'payload' | 'bodyType' | 'rate' | 'corridor'
  label: string
  score: number
  maxScore: number
  value: string
  detail: string
}

export interface ReturnLoadContact {
  locked: boolean
  name: string | null
  phone: string | null
  message?: string
}

export interface ReturnLoadOpportunity {
  loadId: string
  rank: number
  rankScore: number
  rankFactors: ReturnLoadRankFactor[]
  matchScore: number
  matchRating: string
  /** Full explainable match breakdown — feeds `MatchScoreBadge` / `ReturnLoadOpportunityCard`. */
  matchResult: MatchResult
  routeLabel: string
  loadingAddress: string
  unloadingAddress: string
  tonnageRequired: number
  truckType: string
  estimatedFreight: number
  benchmarkFreight: number
  rateVsBenchmark: number
  pickupDistanceFromDestinationKm: number
  potentialEmptyRunReductionKm: number
  payloadUtilizationPct: number
  payloadCompatible: boolean
  bodyTypeCompatible: boolean
  bodyTypeExact: boolean
  budgetFit: boolean
  preferredCorridor: boolean
  urgent: boolean
  postedAt: string | null
  isReturnLoad: true
  contact: ReturnLoadContact
  disclaimer: string
}

export interface ReturnLoadsResponse {
  truck: {
    id: string
    registrationNumber: string | null
    bodyType: string
    tonnageCapacity: number
    verificationStatus: string | null
    currentLat: number | null
    currentLng: number | null
    preferredDestinations: string[]
  }
  anchor: ReturnLoadAnchor
  radiusKm: number
  candidatesEvaluated: number
  totalRanked: number
  contactUnlocked: boolean
  generatedAt: string
  disclaimer: string
  opportunities: ReturnLoadOpportunity[]
}

export const matchesApi = {
  /** Get matches visible to current user (both dashboards) — supports status & ≤50km proximity filter */
  getMyMatches: (params?: { status?: MatchStatus; radius?: number; page?: number; limit?: number }) =>
    api.get<{ data: MatchRecord[]; total: number; page: number; limit: number }>('/matches/my-matches', {
      params: {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.radius ? { radius: String(params.radius) } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      },
    }),

  /** Find trucks matching a specific Need Load (tonnage/route/budget, ≤50km) */
  getMatchesForLoad: (loadId: string, radius = 50) =>
    api.get<Array<{ truck: any; match: any; distanceKm: number }>>(`/matches/load/${loadId}`, { params: { radius } }),

  /** Find loads matching a specific Need Vehicle (tonnage/route/budget, ≤50km) */
  getMatchesForTruck: (truckId: string, radius = 50) =>
    api.get<Array<{ load: any; match: any; distanceKm: number }>>(`/matches/truck/${truckId}`, { params: { radius } }),

  /**
   * Return-load (backhaul) opportunities for a truck, ranked by deadhead
   * distance from the drop-off hub, match score, payload utilisation, body
   * type, rate vs benchmark and preferred corridor. Shipper contacts stay
   * masked unless the caller has an active subscription. Radius defaults to
   * 50 km and is limited to 1–50 km. This endpoint is truck-owner only.
   */
  getReturnLoads: (
    truckId: string,
    params?: {
      radius?: number
      limit?: number
      minScore?: number
      destinationLat?: number
      destinationLng?: number
    },
    signal?: AbortSignal,
  ) =>
    api.get<ReturnLoadsResponse>(`/matching/truck/${encodeURIComponent(truckId)}/return-loads`, {
      params: params ?? {},
      signal,
    }),

  /** Trigger WhatsApp-backed evaluation for a load or truck */
  evaluateForLoad: (loadId: string, radius = 50) => api.post(`/matches/evaluate/load/${loadId}`, null, { params: { radius } }),
  evaluateForTruck: (truckId: string, radius = 50) => api.post(`/matches/evaluate/truck/${truckId}`, null, { params: { radius } }),
  evaluate: (dto: { loadId?: string; truckId?: string; radiusKm?: number }) => api.post('/matches/evaluate', dto),

  getOne: (id: string) => api.get<MatchRecord>(`/matches/${id}`),
  updateStatus: (id: string, status: MatchStatus, bookingId?: string) =>
    api.patch<MatchRecord>(`/matches/${id}/status`, { status, bookingId }),
  delete: (id: string) => api.delete(`/matches/${id}`),
  create: (loadId: string, truckId: string) => api.post<MatchRecord>('/matches', { loadId, truckId }),
}

/**
 * Verification & Compliance API — Vahan RC validation, FASTag status and
 * E-Way Bill lifecycle tracking.
 */
export type ComplianceItemStatus = 'compliant' | 'action_required' | 'pending' | 'expired'

export interface ComplianceItem {
  key: string
  label: string
  status: ComplianceItemStatus
  detail: string
  source: 'vahan_api' | 'sandbox' | 'booking' | 'manual' | 'document'
  verifiedAt?: string
  expiresAt?: string
}

export interface ComplianceChecklist {
  scope: 'truck' | 'booking'
  scopeId: string
  registrationNumber?: string
  overall: ComplianceItemStatus
  items: ComplianceItem[]
  checkedAt: string
}

export interface VahanValidationResult {
  valid: boolean
  found: boolean
  registrationNumber: string
  source: 'vahan_api' | 'sandbox' | 'unavailable'
  checkedAt: string
  error?: string
  data?: Record<string, unknown>
}

export const complianceApi = {
  /** Full compliance checklist for a truck (RC, insurance, fitness, PUC, permit, FASTag). */
  getTruckChecklist: (truckId: string) =>
    api.get<ComplianceChecklist>(`/compliance/trucks/${truckId}`),

  /** Run a fresh Vahan RC validation and store the snapshot. */
  validateTruckRc: (truckId: string) =>
    api.post<{ validation: VahanValidationResult; checklist: ComplianceChecklist }>(
      `/compliance/trucks/${truckId}/validate-rc`
    ),

  /** Report FASTag readiness for a truck. */
  updateFastag: (truckId: string, status: 'Active' | 'LowBalance' | 'Inactive') =>
    api.patch<{ checklist: ComplianceChecklist }>(`/compliance/trucks/${truckId}/fastag`, { status }),

  /** Trip compliance checklist for a booking (adds E-Way Bill lifecycle). */
  getBookingChecklist: (bookingId: string) =>
    api.get<ComplianceChecklist>(`/compliance/bookings/${bookingId}`),

  /** Attach / update the 12-digit E-Way Bill number on a booking. */
  updateEwayBill: (bookingId: string, ewayBillNumber: string, validUpto?: string) =>
    api.post<{
      ewayBill: {
        ewayBillNumber: string | null
        ewayBillStatus: string
        ewayBillValidUpto: string | null
        ewayBillUpdatedAt: string | null
      }
      checklist: ComplianceChecklist
    }>(`/compliance/bookings/${bookingId}/eway-bill`, {
      ewayBillNumber,
      validUpto: validUpto || undefined,
    }),
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
  // Middleware and route protection read the `userRole` cookie. Persist the
  // normalized (canonical) role so stale legacy labels never reach the cookie
  // and transporters/admins resolve to the right dashboard on the next request.
  const canonicalRole = normalizeRole(role) ?? role
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`
  document.cookie = `userRole=${canonicalRole}; path=/; max-age=${7 * 24 * 60 * 60}`
  csrfToken = null
  fetchingCsrfPromise = null
}

export const clearAuthCookies = () => {
  document.cookie = 'accessToken=; path=/; max-age=0'
  document.cookie = 'userRole=; path=/; max-age=0'
  csrfToken = null
}

/**
 * Freight Pricing Intelligence API.
 * Calls POST /pricing/estimate on the NestJS backend.
 */
export const pricingApi = {
  /** Calculate indicative freight rate estimate grounded in Indian transport economics. */
  estimate: (data: PricingInput) =>
    api.post<FreightEstimate>('/pricing/estimate', data),
}