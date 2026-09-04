/**
 * Shared response/request types for the LorryCarry mobile API client.
 *
 * These mirror the contracts exposed by `apps/api` (NestJS) and
 * `packages/shared`. Keep them in sync with the backend — the mobile app must
 * never invent fields the server does not return.
 */

import type { AnyUserRole, RegistrationRole } from '../lib/roles'

// ───────────────────────────────────────────────────────────────────────────
// Auth
// ───────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  phone: string
  name: string | null
  role: AnyUserRole
}

export interface OtpRequestResponse {
  success: boolean
  message?: string
  isExistingUser?: boolean
  /** Only returned by non-production API environments. */
  devOtp?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface VerifyOtpResponse extends AuthTokens {
  user: AuthUser
}

export type { RegistrationRole }

// ───────────────────────────────────────────────────────────────────────────
// Subscriptions — GET /subscriptions/status, POST /subscriptions/initiate
// ───────────────────────────────────────────────────────────────────────────

export type SubscriptionPlanId = 'monthly' | 'quarterly' | 'annual'
export type PaymentProvider = 'cashfree' | 'razorpay' | 'stripe'

/** Response of `GET /subscriptions/status` (shared `SubscriptionEntitlement`). */
export interface SubscriptionEntitlement {
  status: 'trial' | 'active' | 'expired'
  hasSubscription: boolean
  hasPremiumAccess: boolean
  isTrialActive: boolean
  plan: SubscriptionPlanId | null
  expiresAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialDaysRemaining: number
  trialDurationDays: number
  upgradeRequired: boolean
  upgradeReason: string | null
}

/**
 * Provider specific checkout payload returned by `POST /subscriptions/initiate`.
 * - cashfree: `{ paymentSessionId }` (requires the Cashfree JS/native SDK)
 * - razorpay: `{ razorpayOrderId, keyId, amount, currency, name, description }`
 * - stripe:   `{ sessionId, checkoutUrl }` (directly openable in a browser)
 */
export interface CheckoutPayload {
  paymentSessionId?: string
  razorpayOrderId?: string
  keyId?: string
  amount?: number
  currency?: string
  name?: string
  description?: string
  sessionId?: string
  checkoutUrl?: string
}

export interface InitiateSubscriptionResponse {
  provider: PaymentProvider
  paymentId: string
  orderId: string
  amount: number
  plan: SubscriptionPlanId
  checkout: CheckoutPayload
}

/** Response of `GET /subscriptions/verify/:orderId` and `/subscriptions/callback/:orderId`. */
export interface VerifyOrderResponse {
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
  orderId: string
  paymentId?: string
  hasSubscription?: boolean
  plan?: SubscriptionPlanId | null
  expiresAt?: string | null
  message?: string
}

/** Response of `POST /payments/subscription/initialize` (Cashfree only). */
export interface SubscriptionOrderResponse {
  paymentId: string
  paymentSessionId: string
  orderId: string
}

// ───────────────────────────────────────────────────────────────────────────
// Payments — GET /payments/history
// ───────────────────────────────────────────────────────────────────────────

export type PaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded'
export type PaymentPurpose =
  | 'subscription'
  | 'booking_advance'
  | 'booking_balance'
  | 'penalty'
  | 'refund'

/** A `Payment` row as serialised by the API (Decimal amounts arrive as strings). */
export interface PaymentRecord {
  id: string
  userId: string
  bookingId: string | null
  amount: string | number
  currency: string
  purpose: PaymentPurpose
  status: PaymentStatus
  provider: string
  providerOrderId: string | null
  providerTxnId: string | null
  paymentMethod: string | null
  paidAt: string | null
  failureReason: string | null
  metadata?: { plan?: SubscriptionPlanId; planLabel?: string; [key: string]: unknown } | null
  createdAt: string
  updatedAt: string
}

// ───────────────────────────────────────────────────────────────────────────
// Bookings / trips
// ───────────────────────────────────────────────────────────────────────────

export type BookingStatus = 'Pending' | 'Confirmed' | 'InTransit' | 'Completed' | 'Cancelled'

export interface BookingSummary {
  id: string
  status: BookingStatus
  agreedPrice: string | number
  advanceConfirmed: boolean
  balanceConfirmed: boolean
  loadOwnerId?: string
  truckOwnerId?: string
  createdAt: string
  updatedAt?: string
  load?: {
    loadingAddress?: string | null
    unloadingAddress?: string | null
    tonnageRequired?: string | number | null
  } | null
  truck?: {
    registrationNumber?: string | null
    bodyType?: string | null
  } | null
}

export interface TripCheckpoint {
  id: string
  bookingId: string
  checkpointSeq: number
  name?: string | null
  reachedAt?: string | null
  lat?: number | null
  lng?: number | null
}

export interface TrackingSnapshot {
  bookingId: string
  status?: BookingStatus
  checkpoints?: TripCheckpoint[]
  currentLat?: number | null
  currentLng?: number | null
  etaMinutes?: number | null
}

export interface TripCompletionResponse {
  success?: boolean
  bookingId?: string
  balanceAmount?: number
  message?: string
}

// ───────────────────────────────────────────────────────────────────────────
// Notifications
// ───────────────────────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'BOOKING'
  | 'LOAD'
  | 'TRUCK'
  | 'PAYMENT'
  | 'KYC'
  | 'TRACKING'
  | 'SYSTEM'

export interface NotificationItem {
  id: string
  category: NotificationCategory
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  channel?: string
  providerStatus?: string
}

export interface NotificationFeed {
  notifications: NotificationItem[]
  unreadCount: number
}

// ───────────────────────────────────────────────────────────────────────────
// Search
// ───────────────────────────────────────────────────────────────────────────

export interface TruckSearchResult {
  id: string
  bodyType: string
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  distanceKm: number
  verificationStatus: string
}
