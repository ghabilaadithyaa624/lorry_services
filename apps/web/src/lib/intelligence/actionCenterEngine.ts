/**
 * Operational Action Center — web entry point.
 *
 * The derivation rules live in `@lorrycarry/shared` (pure + platform agnostic)
 * and are re-exported here for existing imports. This module adds the thin web
 * adapter that maps the payloads our REST endpoints actually return
 * (`/loads/my-loads`, `/trucks/my-trucks`, `/bookings/my-bookings`,
 * `/users/documents`, `/notifications`, `/subscriptions/status`,
 * `/admin/stats`) onto the engine input.
 *
 * It never fabricates sample tasks: a data source that failed to load is passed
 * as `undefined` so its rules are skipped entirely.
 */
import {
  deriveOperationalTasks,
  summarizeOperationalTasks,
  type ActionCenterAdminQueue,
  type ActionCenterBooking,
  type ActionCenterDocument,
  type ActionCenterLoad,
  type ActionCenterNotification,
  type ActionCenterSubscription,
  type ActionCenterTruck,
  type OperationalTask,
} from '@lorrycarry/shared'
import { normalizeRole } from '@/lib/roles'

export { deriveOperationalTasks, summarizeOperationalTasks }
export type {
  OperationalTask,
  ActionCenterAdminQueue,
  ActionCenterBooking,
  ActionCenterDocument,
  ActionCenterLoad,
  ActionCenterNotification,
  ActionCenterSubscription,
  ActionCenterTruck,
}

/** Shape of `/subscriptions/status` (entitlement) as consumed by the web app. */
export interface DashboardEntitlementLike {
  status?: string
  hasSubscription?: boolean
  hasPremiumAccess?: boolean
  isTrialActive?: boolean
  isTrial?: boolean
  plan?: string | null
  expiresAt?: string | Date | null
  trialEndsAt?: string | Date | null
  trialDaysRemaining?: number | null
  trialDaysLeft?: number | null
}

/** Raw `/admin/stats` fields relevant to the action center. */
export interface DashboardAdminStatsLike {
  pendingDocuments?: number
  pendingKyc?: number
  openDisputes?: number
  expiredTrials?: number
  unmatchedLoads?: number
}

export interface DashboardActionCenterSnapshot {
  role?: string | null
  loads?: Array<Record<string, any>> | null
  trucks?: Array<Record<string, any>> | null
  bookings?: Array<Record<string, any>> | null
  documents?: Array<Record<string, any>> | null
  notifications?: Array<Record<string, any>> | null
  entitlement?: DashboardEntitlementLike | null
  adminStats?: DashboardAdminStatsLike | null
  now?: Date | string | number
  maxTasks?: number
}

function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined
}

function mapLoads(loads?: Array<Record<string, any>> | null): ActionCenterLoad[] | undefined {
  return asArray<Record<string, any>>(loads)?.map((load) => ({
    id: String(load.id ?? ''),
    status: String(load.status ?? ''),
    tonnageRequired: Number(load.tonnageRequired ?? 0),
    loadingAddress: String(load.loadingAddress ?? ''),
  }))
}

function mapTrucks(trucks?: Array<Record<string, any>> | null): ActionCenterTruck[] | undefined {
  return asArray<Record<string, any>>(trucks)?.map((truck) => ({
    id: String(truck.id ?? ''),
    registrationNumber: String(truck.registrationNumber ?? 'Unregistered vehicle'),
    verificationStatus: String(truck.verificationStatus ?? ''),
    documents: Array.isArray(truck.documents)
      ? (truck.documents as Array<Record<string, any>>).map(mapDocument)
      : undefined,
  }))
}

function mapDocument(doc: Record<string, any>): ActionCenterDocument {
  return {
    id: doc.id ? String(doc.id) : undefined,
    truckId: doc.truckId ? String(doc.truckId) : undefined,
    type: doc.type ? String(doc.type) : undefined,
    verificationStatus: doc.verificationStatus ? String(doc.verificationStatus) : undefined,
    expiresAt: doc.expiresAt ?? null,
  }
}

function mapDocuments(
  documents?: Array<Record<string, any>> | null
): ActionCenterDocument[] | undefined {
  return asArray<Record<string, any>>(documents)?.map(mapDocument)
}

function mapBookings(
  bookings?: Array<Record<string, any>> | null
): ActionCenterBooking[] | undefined {
  return asArray<Record<string, any>>(bookings)?.map((booking) => ({
    id: String(booking.id ?? ''),
    status: String(booking.status ?? ''),
    advanceConfirmed: Boolean(booking.advanceConfirmed),
    balanceConfirmed: Boolean(booking.balanceConfirmed),
    agreedPrice: Number(booking.agreedPrice ?? 0),
    ewayBillNumber: booking.ewayBillNumber ?? null,
    ewayBillStatus: booking.ewayBillStatus ?? null,
    whatsappTriggerStatus:
      booking.whatsappTriggerStatus ?? booking.whatsappStatus ?? null,
    load: booking.load
      ? {
          loadingAddress: booking.load.loadingAddress ?? null,
          unloadingAddress: booking.load.unloadingAddress ?? null,
        }
      : null,
    truck: booking.truck ? { registrationNumber: booking.truck.registrationNumber ?? null } : null,
  }))
}

function mapNotifications(
  notifications?: Array<Record<string, any>> | null
): ActionCenterNotification[] | undefined {
  return asArray<Record<string, any>>(notifications)?.map((item) => ({
    id: String(item.id ?? ''),
    channel: item.channel ?? null,
    providerStatus: item.providerStatus ?? null,
    title: item.title ?? null,
  }))
}

/**
 * Normalizes the `/subscriptions/status` payload (paid pass or 3-month trial)
 * into the engine's entitlement shape.
 */
export function mapEntitlement(
  entitlement?: DashboardEntitlementLike | null
): { subscription?: ActionCenterSubscription; hasSubscription?: boolean } {
  if (!entitlement) return {}

  const isTrial = Boolean(entitlement.isTrialActive ?? entitlement.isTrial)
  const hasPremiumAccess = Boolean(
    entitlement.hasPremiumAccess ?? entitlement.hasSubscription ?? isTrial
  )
  const status = entitlement.status ?? (hasPremiumAccess ? (isTrial ? 'trial' : 'active') : 'expired')

  const expiresAt = isTrial
    ? entitlement.trialEndsAt ?? entitlement.expiresAt ?? null
    : entitlement.expiresAt ?? null

  const daysRemaining = isTrial
    ? entitlement.trialDaysRemaining ?? entitlement.trialDaysLeft ?? null
    : null

  return {
    subscription: {
      isActive: hasPremiumAccess,
      status,
      plan: entitlement.plan ?? null,
      isTrial,
      expiresAt,
      daysRemaining,
    },
    hasSubscription: hasPremiumAccess,
  }
}

function mapAdminQueue(
  stats?: DashboardAdminStatsLike | null
): ActionCenterAdminQueue | undefined {
  if (!stats) return undefined
  return {
    pendingKyc: stats.pendingKyc ?? stats.pendingDocuments ?? 0,
    pendingDocuments: stats.pendingDocuments ?? 0,
    openDisputes: stats.openDisputes ?? 0,
    expiredTrials: stats.expiredTrials ?? 0,
    unmatchedLoads: stats.unmatchedLoads ?? 0,
  }
}

/**
 * Builds the Operational Action Center task list from live dashboard data.
 * Unknown / legacy roles are normalized (`load_owner` → `factory_owner`, …).
 */
export function deriveDashboardActionTasks(
  snapshot: DashboardActionCenterSnapshot
): OperationalTask[] {
  const role = normalizeRole(snapshot.role) || 'factory_owner'
  const { subscription, hasSubscription } = mapEntitlement(snapshot.entitlement)

  return deriveOperationalTasks({
    userRole: role,
    loads: mapLoads(snapshot.loads),
    trucks: mapTrucks(snapshot.trucks),
    bookings: mapBookings(snapshot.bookings),
    documents: mapDocuments(snapshot.documents),
    notifications: mapNotifications(snapshot.notifications),
    subscription,
    hasSubscription,
    adminQueue: mapAdminQueue(snapshot.adminStats),
    now: snapshot.now,
    maxTasks: snapshot.maxTasks,
  })
}
