/**
 * Operational Action Center — REST adapter for the shared, pure task engine.
 * Unknown/failed sources remain undefined; only a successful empty list means
 * "no records". In particular, /users/documents and /notifications are envelopes.
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

/** Canonical entitlement plus legacy trial fields still returned by older APIs. */
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
  upgradeReason?: string | null
}

export interface DashboardAdminStatsLike {
  pendingDocuments?: number
  pendingKyc?: number
  openDisputes?: number
  expiredTrials?: number
  unmatchedLoads?: number
}

/** Raw response bodies — validate at this boundary, not with truthy defaults. */
export interface DashboardActionCenterSnapshot {
  role?: string | null
  loads?: unknown
  trucks?: unknown
  bookings?: unknown
  documents?: unknown
  notifications?: unknown
  entitlement?: unknown
  adminStats?: unknown
  now?: Date | string | number
  maxTasks?: number
}

type ApiRecord = Record<string, unknown>

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function number(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !value.trim()) return undefined
  const result = Number(value)
  return Number.isFinite(result) ? result : undefined
}

function count(value: unknown): number | undefined {
  const result = number(value)
  return result !== undefined && Number.isInteger(result) && result >= 0 ? result : undefined
}

function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function date(value: unknown): string | Date | undefined {
  return value instanceof Date || typeof value === 'string' ? value : undefined
}

function records(value: unknown, envelopeKey?: string, requireIds = false): ApiRecord[] | undefined {
  const rows = isRecord(value) && envelopeKey ? value[envelopeKey] : value
  // Do not turn a malformed response such as [null] into an empty fleet.
  if (!Array.isArray(rows) || !rows.every(isRecord)) return undefined
  if (requireIds && !rows.every((row) => text(row.id))) return undefined
  return rows
}

function mapLoads(value: unknown): ActionCenterLoad[] | undefined {
  return records(value, undefined, true)?.map((load) => ({
    id: text(load.id)!,
    status: text(load.status) ?? '',
    tonnageRequired: number(load.tonnageRequired) ?? 0,
    loadingAddress: text(load.loadingAddress) ?? '',
    bookingCount: isRecord(load._count) ? count(load._count.bookings) : undefined,
  }))
}

function mapDocument(doc: ApiRecord): ActionCenterDocument {
  return {
    id: text(doc.id),
    truckId: text(doc.truckId),
    type: text(doc.type),
    verificationStatus: text(doc.verificationStatus),
    expiresAt: date(doc.expiryDate ?? doc.expiresAt),
  }
}

function mapDocuments(value: unknown): ActionCenterDocument[] | undefined {
  return records(value, 'documents')?.map(mapDocument)
}

function mapTrucks(value: unknown): ActionCenterTruck[] | undefined {
  return records(value, undefined, true)?.map((truck) => ({
    id: text(truck.id)!,
    registrationNumber: text(truck.registrationNumber) ?? text(truck.id)!,
    verificationStatus: text(truck.verificationStatus) ?? '',
    documents: mapDocuments(truck.documents),
  }))
}

function mapBookings(value: unknown): ActionCenterBooking[] | undefined {
  return records(value, undefined, true)?.map((booking) => ({
    id: text(booking.id)!,
    loadId: text(booking.loadId),
    status: text(booking.status) ?? '',
    advanceConfirmed: bool(booking.advanceConfirmed),
    balanceConfirmed: bool(booking.balanceConfirmed),
    agreedPrice: number(booking.agreedPrice),
    // Preserve absent vs explicitly empty: partial records aren't missing bills.
    ewayBillNumber: booking.ewayBillNumber === null
      ? null
      : typeof booking.ewayBillNumber === 'string' ? booking.ewayBillNumber.trim() : undefined,
    ewayBillStatus: text(booking.ewayBillStatus),
    whatsappTriggerStatus: text(booking.whatsappTriggerStatus ?? booking.whatsappStatus),
    load: isRecord(booking.load)
      ? {
          loadingAddress: text(booking.load.loadingAddress),
          unloadingAddress: text(booking.load.unloadingAddress),
        }
      : undefined,
    truck: isRecord(booking.truck)
      ? { registrationNumber: text(booking.truck.registrationNumber) }
      : undefined,
  }))
}

function mapNotifications(value: unknown): ActionCenterNotification[] | undefined {
  return records(value, 'notifications', true)?.map((item) => ({
    id: text(item.id)!,
    channel: text(item.channel),
    providerStatus: text(item.providerStatus),
    title: text(item.title),
  }))
}

/** Missing entitlement fields do not imply an expired subscription. */
export function mapEntitlement(
  value: unknown
): { subscription?: ActionCenterSubscription; hasSubscription?: boolean } {
  if (!isRecord(value)) return {}
  const status = text(value.status)?.toLowerCase()
  const knownStatus = status && ['active', 'trial', 'expired'].includes(status) ? status : undefined
  const trialActive = bool(value.isTrialActive) ?? bool(value.isTrial)
  const hasPremiumAccess = bool(value.hasPremiumAccess)
    ?? (trialActive === true ? true : bool(value.hasSubscription))
    ?? (knownStatus ? knownStatus !== 'expired' : undefined)
  if (hasPremiumAccess === undefined && !knownStatus) return {}

  const isTrial = trialActive === true || knownStatus === 'trial'
    || value.plan === 'free_trial' || value.upgradeReason === 'trial_expired'
  const expiresAt = isTrial ? value.trialEndsAt ?? value.expiresAt : value.expiresAt

  return {
    subscription: {
      isActive: hasPremiumAccess,
      status: knownStatus ?? (hasPremiumAccess ? (isTrial ? 'trial' : 'active') : undefined),
      plan: text(value.plan) ?? null,
      isTrial,
      expiresAt: date(expiresAt) ?? null,
      daysRemaining: isTrial ? number(value.trialDaysRemaining ?? value.trialDaysLeft) ?? null : null,
    },
    hasSubscription: hasPremiumAccess,
  }
}

function mapAdminQueue(value: unknown): ActionCenterAdminQueue | undefined {
  if (!isRecord(value)) return undefined
  const queue: ActionCenterAdminQueue = {
    pendingKyc: count(value.pendingKyc),
    pendingDocuments: count(value.pendingDocuments),
    openDisputes: count(value.openDisputes),
    expiredTrials: count(value.expiredTrials),
    unmatchedLoads: count(value.unmatchedLoads),
  }
  return Object.values(queue).some((count) => count !== undefined) ? queue : undefined
}

export function deriveDashboardActionTasks(snapshot: DashboardActionCenterSnapshot): OperationalTask[] {
  const role = normalizeRole(snapshot.role)
  if (!role) return [] // Never assign factory-owner tasks to an unresolved session.
  return deriveOperationalTasks({
    userRole: role,
    loads: mapLoads(snapshot.loads),
    trucks: mapTrucks(snapshot.trucks),
    bookings: mapBookings(snapshot.bookings),
    documents: mapDocuments(snapshot.documents),
    notifications: mapNotifications(snapshot.notifications),
    ...mapEntitlement(snapshot.entitlement),
    adminQueue: mapAdminQueue(snapshot.adminStats),
    now: snapshot.now,
    maxTasks: snapshot.maxTasks,
  })
}

/** A failed source must not produce a reassuring green "all clear" panel. */
export function getActionCenterUnavailableSources(snapshot: DashboardActionCenterSnapshot): string[] {
  const role = normalizeRole(snapshot.role)
  if (!role) return ['Account role']
  if (role === 'admin') return mapAdminQueue(snapshot.adminStats) ? [] : ['Moderation queues']

  const unavailable: string[] = []
  if (!mapEntitlement(snapshot.entitlement).subscription) unavailable.push('Subscription')
  if (!mapBookings(snapshot.bookings)) unavailable.push('Trips')
  if (!mapNotifications(snapshot.notifications)) unavailable.push('WhatsApp alerts')
  if (role === 'factory_owner') {
    if (!mapLoads(snapshot.loads)) unavailable.push('Loads')
  } else {
    const trucks = mapTrucks(snapshot.trucks)
    if (!trucks) unavailable.push('Fleet')
    // /trucks/my-trucks embeds each truck's documents. That is sufficient even
    // when the signed-document endpoint is unavailable (including an empty fleet).
    if (!mapDocuments(snapshot.documents) && !trucks?.every((truck) => Array.isArray(truck.documents))) {
      unavailable.push('Vehicle documents')
    }
  }
  return unavailable
}
