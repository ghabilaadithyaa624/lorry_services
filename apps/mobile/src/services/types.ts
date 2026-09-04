/**
 * API contracts consumed by the mobile app.
 *
 * These mirror the NestJS responses in apps/api and the shared constants in
 * packages/shared. They are duplicated here (like `lib/roles.ts`) so the
 * Expo bundle does not depend on a pre-built workspace package.
 */
import type { AnyUserRole } from '../lib/roles'

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export type OtpChannel = 'whatsapp' | 'sms'

export interface AuthUser {
  id: string
  phone: string
  name: string | null
  role: AnyUserRole
  isNewUser?: boolean
  trial?: {
    startedAt: string
    expiresAt: string
    durationDays: number
  }
}

export interface RequestOtpResponse {
  success: boolean
  message?: string
  channel?: string
  isExistingUser?: boolean
  /** Only present in non-production API builds. */
  devOtp?: string
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface RefreshTokenResponse {
  accessToken: string
  /** The API rotates refresh tokens; the previous token is revoked once used. */
  refreshToken?: string
}

/** Subset of GET /users/me used by the app (the endpoint returns more). */
export interface UserProfile {
  id: string
  phone: string
  name: string | null
  role: AnyUserRole
  createdAt: string
  [key: string]: unknown
}

export interface ActivityItem {
  id: string
  category: string
  title: string
  description: string
  timestamp: string
  status?: string
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions (mirrors packages/shared SubscriptionEntitlement)
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionPlanId = 'monthly' | 'quarterly' | 'annual'
export type PaymentProvider = 'cashfree' | 'razorpay' | 'stripe'
export type EntitlementStatus = 'trial' | 'active' | 'expired'

/** GET /subscriptions/status */
export interface SubscriptionEntitlement {
  status: EntitlementStatus
  /** True only for a paid, unexpired subscription (not the trial). */
  hasSubscription: boolean
  /** Paid subscription OR active trial. */
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
 * Provider-specific checkout payload returned by POST /subscriptions/initiate.
 *  - cashfree: { paymentSessionId }
 *  - razorpay: { razorpayOrderId, keyId, amount, currency, name, description }
 *  - stripe:   { sessionId, checkoutUrl }
 */
export interface SubscriptionCheckoutPayload {
  paymentSessionId?: string
  razorpayOrderId?: string
  keyId?: string
  amount?: number
  currency?: string
  name?: string
  description?: string
  sessionId?: string
  checkoutUrl?: string | null
  [key: string]: unknown
}

/** POST /subscriptions/initiate */
export interface InitiateSubscriptionResult {
  provider: PaymentProvider
  paymentId: string
  /** Gateway order / session id — pass to GET /subscriptions/verify/:orderId. */
  orderId: string
  amount: number
  plan: SubscriptionPlanId
  checkout: SubscriptionCheckoutPayload
}

export type VerificationStatus = 'SUCCESS' | 'PENDING' | 'FAILED'

/** GET /subscriptions/verify/:orderId and GET /subscriptions/callback/:orderId */
export interface SubscriptionVerifyResult {
  status: VerificationStatus
  orderId: string
  paymentId?: string
  hasSubscription?: boolean
  plan?: SubscriptionPlanId | string | null
  expiresAt?: string | null
  message?: string
}

/** POST /payments/subscription/initialize (legacy, Cashfree only). */
export interface LegacySubscriptionOrder {
  paymentId: string
  paymentSessionId: string
  orderId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentPurpose = 'subscription' | 'booking_advance' | 'booking_balance'
export type PaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded'

/** Prisma `Payment` row as serialised by GET /payments/history. */
export interface PaymentRecord {
  id: string
  userId: string
  bookingId: string | null
  /** Prisma Decimal — serialised as a string. */
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
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface BookingPaymentInitInput {
  bookingId: string
  paymentType: 'advance' | 'balance'
  paymentMethod?: 'upi' | 'card' | 'netbanking'
}

/** POST /payments/booking/initialize */
export interface BookingPaymentInitResult {
  success: boolean
  paymentId: string
  amount: number
  totalPrice: number
  advanceAmount: number
  balanceAmount: number
  paymentType: 'advance' | 'balance'
  provider: 'razorpay' | 'cashfree'
  orderId: string
  currency: string
  /** Razorpay payment link (hosted page) when Razorpay is configured. */
  paymentLinkId?: string
  shortUrl?: string
  /** Cashfree session id (needs the Cashfree SDK / hosted checkout). */
  paymentSessionId?: string
}

export interface BookingPaymentConfirmResult {
  success: boolean
  bookingId: string | null
  paymentType?: 'advance' | 'balance'
  bookingStatus?: BookingStatus
  message?: string
}

export interface TripCompletionInput {
  bookingId: string
  podDetails: {
    consigneeName: string
    podPhotoUrl?: string
    deliveryNotes?: string
  }
}

/** POST /payments/trip/complete */
export interface TripCompletionResult {
  success: boolean
  bookingId: string
  completedAt: string | null
  balanceReleased: boolean
  balanceAmount: number
  promptRating: boolean
  factoryOwnerId: string
  driverId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings & tracking
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors the Prisma `BookingStatus` enum (JSON values, not DB mappings). */
export type BookingStatus = 'Pending' | 'Confirmed' | 'InTransit' | 'Completed' | 'Cancelled'

/** GET /bookings/my-bookings */
export interface BookingSummary {
  id: string
  loadId: string
  truckId: string
  loadOwnerId: string
  truckOwnerId: string
  /** Prisma Decimal — serialised as a string. */
  agreedPrice: string | number
  advanceConfirmed: boolean
  advanceConfirmedAt: string | null
  balanceConfirmed: boolean
  balanceConfirmedAt: string | null
  ewayBillNumber?: string | null
  status: BookingStatus
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  load: {
    loadingAddress: string
    unloadingAddress: string
    tonnageRequired: string | number
  } | null
  truck: {
    registrationNumber: string
    bodyType: string
  } | null
}

export interface BookingCheckpoint {
  id: string
  seq: number
  name: string
  radiusM: number
  crossedAt: string | null
  crossedBy: string | null
  etaMinutes: number | null
}

/** GET /bookings/:id */
export interface BookingDetail extends Omit<BookingSummary, 'load' | 'truck'> {
  load: {
    loadingAddress: string
    unloadingAddress: string
    [key: string]: unknown
  }
  truck: {
    registrationNumber: string
    bodyType: string
    user: { name: string | null; phone: string }
    [key: string]: unknown
  }
  checkpoints: BookingCheckpoint[]
}

export interface TrackingCheckpoint {
  seq: number
  name: string
  crossed: boolean
  crossedAt: string | null
}

/** GET /tracking/:bookingId */
export interface TrackingStatus {
  totalCheckpoints: number
  crossedCount: number
  currentCheckpoint: string
  lastCrossedAt: string | null
  nextCheckpoint: { name: string; etaMinutes: number | null } | null
  checkpoints: TrackingCheckpoint[]
}

export interface CheckpointCrossingInput {
  checkpointSeq: number
  lat: number
  lng: number
}

/** POST /tracking/:bookingId/checkpoint — returns 200 with success=false when rejected. */
export interface CheckpointResult {
  success: boolean
  message: string
}

export interface PodSubmitInput {
  podUrl?: string
  consigneeName?: string
  notes?: string
}

export interface PodSubmitResult {
  success: boolean
  message: string
  bookingId: string
  consigneeName: string
  status: BookingStatus
  timestamp: string
}

export interface IncidentReportInput {
  category: string
  description: string
  impactMinutes?: number
}

export interface IncidentReportResult {
  success: boolean
  message: string
  bookingId: string
  category: string
  impactMinutes: number
  reportedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

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

/** GET /notifications */
export interface NotificationsFeed {
  notifications: NotificationItem[]
  unreadCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

export interface TruckSearchResult {
  id: string
  bodyType: string
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  distanceKm: number
  verificationStatus: string
}
