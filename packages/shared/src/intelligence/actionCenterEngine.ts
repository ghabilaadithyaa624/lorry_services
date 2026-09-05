/**
 * LorryCarry Logistics Intelligence — Operational Action Center Engine
 * Derives actionable operational notifications directly from real database states.
 * Pure and platform-agnostic: shared by API, web, admin and mobile.
 *
 * Every rule below maps 1:1 to a field that already exists in the Prisma schema
 * (see `docs/logistics-intelligence-audit.md` §2) — the engine never invents
 * sample/demo tasks. When a data source is not supplied the matching rules are
 * simply skipped, so a partially loaded dashboard degrades gracefully instead
 * of showing fabricated work.
 */

export interface OperationalTask {
  id: string
  title: string
  description: string
  category: 'COMPLIANCE' | 'PAYMENT' | 'DISPATCH' | 'COMMERCIAL'
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  actionUrl: string
  actionLabel: string
}

/** Vehicle document (RC / Insurance) as returned by `GET /users/documents`. */
export interface ActionCenterDocument {
  id?: string
  truckId?: string
  type?: string
  verificationStatus?: string
  expiresAt?: string | Date | null
}

export interface ActionCenterTruck {
  id: string
  registrationNumber: string
  verificationStatus: string
  documents?: ActionCenterDocument[] | unknown[]
}

export interface ActionCenterLoad {
  id: string
  status: string
  tonnageRequired: number
  loadingAddress: string
  /** Total bookings on the load, including historical cancellations. */
  bookingCount?: number
}

export interface ActionCenterBooking {
  id: string
  status: string
  loadId?: string
  advanceConfirmed?: boolean
  balanceConfirmed?: boolean
  agreedPrice?: number | string | null
  ewayBillNumber?: string | null
  ewayBillStatus?: string | null
  /** Outbound WhatsApp dispatch trigger state, when the API exposes it. */
  whatsappTriggerStatus?: string | null
  load?: { loadingAddress?: string | null; unloadingAddress?: string | null } | null
  truck?: { registrationNumber?: string | null } | null
}

/** Snapshot of `GET /subscriptions/status` (paid pass or 3-month free trial). */
export interface ActionCenterSubscription {
  isActive?: boolean
  status?: string
  plan?: string | null
  isTrial?: boolean
  expiresAt?: string | Date | null
  daysRemaining?: number | null
}

/** Notification feed row (`GET /notifications`) used for delivery failures. */
export interface ActionCenterNotification {
  id: string
  channel?: string | null
  providerStatus?: string | null
  title?: string | null
}

/** Admin moderation counters (`GET /admin/stats`). */
export interface ActionCenterAdminQueue {
  pendingKyc?: number
  pendingDocuments?: number
  openDisputes?: number
  expiredTrials?: number
  unmatchedLoads?: number
}

export interface DeriveOperationalTasksParams {
  userRole: 'factory_owner' | 'truck_driver' | 'transporter' | 'admin'
  loads?: ActionCenterLoad[]
  trucks?: ActionCenterTruck[]
  bookings?: ActionCenterBooking[]
  /** Fleet documents (RC / Insurance) across every truck owned by the user. */
  documents?: ActionCenterDocument[]
  /** Legacy boolean flag kept for existing callers. */
  hasSubscription?: boolean
  subscription?: ActionCenterSubscription
  notifications?: ActionCenterNotification[]
  adminQueue?: ActionCenterAdminQueue
  /** Reference instant — injectable so expiry rules stay deterministic in tests. */
  now?: Date | string | number
  /** Optional cap applied after urgency sorting (highest urgency survives). */
  maxTasks?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Documents legally required before a lorry can be dispatched in India. */
const REQUIRED_DOCUMENT_TYPES: Array<{ type: string; label: string }> = [
  { type: 'RC', label: 'Registration Certificate (RC)' },
  { type: 'Insurance', label: 'Commercial Insurance' },
]

/** A subscription/trial inside this window is treated as "expiring soon". */
export const SUBSCRIPTION_EXPIRY_WARNING_DAYS = 7

const URGENCY_RANK: Record<OperationalTask['urgency'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

function toTime(value?: Date | string | number | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

/** Never turn an absent or invalid agreed price into a fabricated ₹0 due. */
function halfFreight(amount?: number | string | null): string | undefined {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined
  return `₹${Math.round(numeric * 0.5).toLocaleString('en-IN')}`
}

/** Short human reference for a trip, matching the dashboard trip chips. */
function tripRef(bookingId: string): string {
  return `TRIP-${String(bookingId).slice(0, 8).toUpperCase()}`
}

function routeLabel(booking: ActionCenterBooking): string {
  const from = booking.load?.loadingAddress?.split(',')[0]?.trim()
  const to = booking.load?.unloadingAddress?.split(',')[0]?.trim()
  if (from && to) return `${from} → ${to}`
  return tripRef(booking.id)
}

function normalize(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function isDocumentVerified(doc: ActionCenterDocument): boolean {
  return normalize(doc.verificationStatus) === 'verified'
}

/**
 * Aggregates every operational task the signed-in user must act on.
 * Returned tasks are sorted HIGH → MEDIUM → LOW (stable within a tier).
 */
export function deriveOperationalTasks(params: DeriveOperationalTasksParams): OperationalTask[] {
  const tasks: OperationalTask[] = []
  const now = toTime(params.now) ?? Date.now()
  const isAdmin = params.userRole === 'admin'
  // Transporters operate on BOTH sides of the marketplace, so they receive the
  // union of factory-owner (load) and truck-driver (vehicle) operational tasks.
  const isTransporter = params.userRole === 'transporter'
  const isTruckDriver = params.userRole === 'truck_driver' || isTransporter
  const isFactoryOwner = params.userRole === 'factory_owner' || isTransporter

  // ── 1. Subscription / trial entitlement ──────────────────────────────────
  if (!isAdmin) {
    const sub = params.subscription
    const expiresAtTime = toTime(sub?.expiresAt)
    const daysRemaining =
      expiresAtTime !== null
        ? Math.ceil((expiresAtTime - now) / DAY_MS)
        : typeof sub?.daysRemaining === 'number' && Number.isFinite(sub.daysRemaining)
          ? sub.daysRemaining
          : null
    const statusExpired = normalize(sub?.status) === 'expired'
    const dateExpired = expiresAtTime !== null && expiresAtTime <= now
    const isExpired = Boolean(sub) && (statusExpired || dateExpired)
    const isActive =
      sub?.isActive ?? (normalize(sub?.status) === 'active' || normalize(sub?.status) === 'trial')

    if (isExpired) {
      tasks.push({
        id: 'sub-expired',
        title: sub?.isTrial ? 'Free Trial Expired' : 'Direct Transporter Pass Expired',
        description:
          'Contact reveals are locked. Renew your pass to keep calling verified transporters and shippers directly with zero brokerage.',
        category: 'COMMERCIAL',
        urgency: 'HIGH',
        actionUrl: '/subscribe',
        actionLabel: 'Renew Pass',
      })
    } else if (
      isActive &&
      daysRemaining !== null &&
      daysRemaining >= 0 &&
      daysRemaining <= SUBSCRIPTION_EXPIRY_WARNING_DAYS
    ) {
      tasks.push({
        id: 'sub-expiring',
        title: sub?.isTrial
          ? `Free Trial Ends in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`
          : `Subscription Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`,
        description:
          'Renew before expiry so direct phone and WhatsApp contact on matched loads and lorries stays uninterrupted.',
        category: 'COMMERCIAL',
        urgency: 'MEDIUM',
        actionUrl: '/subscribe',
        actionLabel: 'Renew Now',
      })
    } else if (params.hasSubscription === false) {
      tasks.push({
        id: 'sub-upgrade',
        title: 'Direct Transporter Pass Required',
        description:
          'Subscribe to unlock direct phone and WhatsApp contact with verified transporters across India.',
        category: 'COMMERCIAL',
        urgency: 'MEDIUM',
        actionUrl: '/subscribe',
        actionLabel: 'Unlock Direct Access',
      })
    }
  }

  // ── 2. Fleet KYC & vehicle document compliance (truck driver) ────────────
  if (isTruckDriver && params.trucks) {
    const trucks = params.trucks
    const fleetDocuments = Array.isArray(params.documents) ? params.documents : []

    trucks.forEach((truck) => {
      if (!truck.id) return
      // A nested document list covers this truck only, not the entire fleet.
      const hasDocumentSignal =
        Array.isArray(params.documents) || Array.isArray(truck.documents)
      const verification = normalize(truck.verificationStatus)

      if (verification === 'pending') {
        tasks.push({
          id: `kyc-pending-${truck.id}`,
          title: `Vehicle KYC Pending: ${truck.registrationNumber}`,
          description:
            'Vehicle verification is pending. Review the RC and insurance status for this lorry; uploaded documents may still be under review.',
          category: 'COMPLIANCE',
          urgency: 'HIGH',
          actionUrl: '/documents',
          actionLabel: 'Review Verification',
        })
      } else if (verification === 'rejected') {
        tasks.push({
          id: `kyc-rejected-${truck.id}`,
          title: `Vehicle Verification Rejected: ${truck.registrationNumber}`,
          description:
            'Compliance rejected this vehicle. Re-upload a legible RC book and valid commercial insurance to return to the load board.',
          category: 'COMPLIANCE',
          urgency: 'HIGH',
          actionUrl: '/documents',
          actionLabel: 'Re-upload Documents',
        })
      }

      if (!hasDocumentSignal) return

      const truckDocuments = [
        ...((truck.documents as ActionCenterDocument[] | undefined) || []),
        ...fleetDocuments.filter((doc) => doc.truckId === truck.id),
      ].filter((doc): doc is ActionCenterDocument => Boolean(doc) && typeof doc === 'object')

      REQUIRED_DOCUMENT_TYPES.forEach(({ type, label }) => {
        const matches = truckDocuments.filter(
          (doc) => normalize(doc.type) === normalize(type)
        )

        if (matches.length === 0) {
          tasks.push({
            id: `doc-missing-${normalize(type)}-${truck.id}`,
            title: `${label} Missing: ${truck.registrationNumber}`,
            description: `Upload the ${label.toLowerCase()} for this lorry — shippers only see vehicles with a complete document set.`,
            category: 'COMPLIANCE',
            urgency: 'HIGH',
            actionUrl: '/documents',
            actionLabel: `Upload ${type}`,
          })
          return
        }

        if (matches.some(isDocumentVerified)) return

        const rejected = matches.find((doc) => normalize(doc.verificationStatus) === 'rejected')
        if (rejected) {
          tasks.push({
            id: `doc-rejected-${rejected.id || `${normalize(type)}-${truck.id}`}`,
            title: `${label} Rejected: ${truck.registrationNumber}`,
            description:
              'Review the compliance notes and upload a corrected copy to restore verification clearance.',
            category: 'COMPLIANCE',
            urgency: 'HIGH',
            actionUrl: '/documents',
            actionLabel: `Re-upload ${type}`,
          })
          return
        }

        const pending = matches.find((doc) => normalize(doc.verificationStatus) === 'pending')
        if (!pending) return // An unknown status is not evidence of a pending review.
        tasks.push({
          id: `doc-unverified-${pending.id || `${normalize(type)}-${truck.id}`}`,
          title: `${label} Awaiting Verification: ${truck.registrationNumber}`,
          description:
            'Our compliance desk is reviewing this document. Keep the original handy in case a clearer copy is requested.',
          category: 'COMPLIANCE',
          urgency: 'MEDIUM',
          actionUrl: '/documents',
          actionLabel: 'Track Verification',
        })
      })
    })

    if (trucks.length === 0) {
      tasks.push({
        id: 'fleet-empty',
        title: 'Register Your First Lorry',
        description:
          'Add your vehicle with its RC details and serviceable radius to start receiving matched freight on your corridor.',
        category: 'DISPATCH',
        urgency: 'HIGH',
        actionUrl: '/my-trucks',
        actionLabel: 'Register Truck',
      })
    }
  }

  // ── 3. Booking payment & compliance milestones ───────────────────────────
  if (!isAdmin && params.bookings) {
    params.bookings.forEach((booking) => {
      const status = normalize(booking.status)
      if (!booking.id || !['pending', 'confirmed', 'intransit', 'in_transit', 'completed'].includes(status)) return

      const isCompleted = status === 'completed'
      const isDispatched = status === 'confirmed' || status === 'intransit' || status === 'in_transit'
      const amount = halfFreight(booking.agreedPrice)
      const bookingUrl = `/booking/${encodeURIComponent(booking.id)}`

      // 3a. Loading advance (50%) — released by the shipper. Missing flags are
      // unknown, not false: partial API records must not invent payment dues.
      if (booking.advanceConfirmed === false) {
        if (isFactoryOwner) {
          tasks.push({
            id: `advance-pending-${booking.id}`,
            title: `Loading Advance Due: ${amount ?? routeLabel(booking)}`,
            description: `${routeLabel(booking)}: confirm the 50% loading advance release to authorize dispatch.`,
            category: 'PAYMENT',
            urgency: 'HIGH',
            actionUrl: bookingUrl,
            actionLabel: 'Confirm Advance',
          })
        } else if (isTruckDriver && !isCompleted) {
          tasks.push({
            id: `advance-awaiting-${booking.id}`,
            title: `Advance Not Released: ${routeLabel(booking)}`,
            description: `The shipper has not confirmed the 50% loading advance${amount ? ` of ${amount}` : ''}. Follow up before loading the consignment.`,
            category: 'PAYMENT',
            urgency: 'MEDIUM',
            actionUrl: bookingUrl,
            actionLabel: 'Open Trip',
          })
        }
      }

      // 3b. Delivery balance (50%) on a completed trip.
      if (isCompleted && booking.balanceConfirmed === false) {
        if (isFactoryOwner) {
          tasks.push({
            id: `balance-pending-${booking.id}`,
            title: `Delivery Balance Due: ${amount ?? routeLabel(booking)}`,
            description: `${routeLabel(
              booking
            )} is delivered. Release the remaining 50% balance against the POD to close the trip.`,
            category: 'PAYMENT',
            urgency: 'HIGH',
            actionUrl: bookingUrl,
            actionLabel: 'Release Balance',
          })
        } else if (isTruckDriver) {
          tasks.push({
            id: `balance-awaiting-${booking.id}`,
            title: `Balance Payment Pending: ${amount ?? routeLabel(booking)}`,
            description: `Trip ${tripRef(
              booking.id
            )} is delivered but the shipper has not confirmed the balance. Share the POD and follow up.`,
            category: 'PAYMENT',
            urgency: 'HIGH',
            actionUrl: bookingUrl,
            actionLabel: 'Request Balance',
          })
        }
      }

      // 3c. E-Way Bill compliance for dispatched consignments.
      const ewayStatus = normalize(booking.ewayBillStatus)
      const hasEwaySignal = booking.ewayBillNumber !== undefined || booking.ewayBillStatus != null
      const ewayGenerated =
        Boolean(booking.ewayBillNumber?.trim()) || ['active', 'generated', 'valid'].includes(ewayStatus)
      if (isDispatched && hasEwaySignal && !ewayGenerated) {
        tasks.push({
          id: `eway-missing-${booking.id}`,
          title: `E-Way Bill Missing: ${routeLabel(booking)}`,
          description: isFactoryOwner
            ? 'No E-Way Bill is recorded. Check whether one is required for this consignment and attach it before dispatch.'
            : 'No E-Way Bill is recorded. Ask the shipper to confirm applicability and provide the bill before moving the consignment.',
          category: 'COMPLIANCE',
          urgency: 'HIGH',
          actionUrl: bookingUrl,
          actionLabel: isFactoryOwner ? 'Add E-Way Bill' : 'Review E-Way Bill',
        })
      }

      // 3d. Failed WhatsApp dispatch trigger on this booking, when exposed.
      if (normalize(booking.whatsappTriggerStatus) === 'failed') {
        tasks.push({
          id: `whatsapp-failed-${booking.id}`,
          title: `WhatsApp Alert Failed: ${tripRef(booking.id)}`,
          description:
            'The counterparty was not reached on WhatsApp. Verify the number or call directly so dispatch is not delayed.',
          category: 'DISPATCH',
          urgency: 'MEDIUM',
          actionUrl: bookingUrl,
          actionLabel: 'Review Contact',
        })
      }
    })
  }

  // ── 4. Open, still unmatched freight (shipper) ───────────────────────────
  if (isFactoryOwner && params.loads) {
    const openLoads = params.loads.filter((load) => {
      if (!load.id || normalize(load.status) !== 'open') return false
      const bookings = params.bookings?.filter((booking) => booking.loadId === load.id)
      // Do not advertise already-booked loads from a racing dashboard snapshot.
      if (bookings?.some((booking) => normalize(booking.status) !== 'cancelled')) return false
      // A reopened load with only cancelled bookings is unmatched again. When
      // booking details failed to load, respect the server's non-zero count.
      return !load.bookingCount || (bookings !== undefined && bookings.length >= load.bookingCount)
    })
    if (openLoads.length > 0) {
      tasks.push({
        id: 'open-loads-match',
        title: `${openLoads.length} Open Load${openLoads.length === 1 ? '' : 's'} Awaiting a Match`,
        description:
          'These freight requirements are still open. Search for suitable lorries and review availability with drivers.',
        category: 'DISPATCH',
        urgency: 'LOW',
        actionUrl: '/search?type=truck',
        actionLabel: 'Find Lorries',
      })
    }
  }

  // ── 5. Failed WhatsApp notifications from the alert feed ─────────────────
  if (params.notifications) {
    const failed = Array.from(new Map(params.notifications.map((n) => [n.id, n])).values()).filter((n) => {
      const status = normalize(n.providerStatus)
      const channel = normalize(n.channel)
      return Boolean(n.id) && channel === 'whatsapp' && (status === 'failed' || status === 'undelivered')
    })

    if (failed.length > 0) {
      tasks.push({
        id: 'whatsapp-delivery-failed',
        title: `${failed.length} WhatsApp Alert${failed.length === 1 ? '' : 's'} Not Delivered`,
        description:
          'Recent dispatch alerts could not be delivered on WhatsApp. Confirm your registered number and notification opt-in.',
        category: 'DISPATCH',
        urgency: 'MEDIUM',
        actionUrl: '/notifications',
        actionLabel: 'Review Alerts',
      })
    }
  }

  // ── 6. Admin moderation queues ───────────────────────────────────────────
  if (isAdmin && params.adminQueue) {
    const queue = params.adminQueue
    const pendingKyc = queue.pendingKyc ?? queue.pendingDocuments ?? 0

    if (pendingKyc > 0) {
      tasks.push({
        id: 'admin-kyc-queue',
        title: `${pendingKyc} Vehicle Document${pendingKyc === 1 ? '' : 's'} Awaiting Verification`,
        description:
          'RC and insurance uploads are queued for compliance review. Unverified lorries stay hidden from the marketplace.',
        category: 'COMPLIANCE',
        urgency: 'HIGH',
        actionUrl: '/admin/kyc',
        actionLabel: 'Review KYC Queue',
      })
    }

    if ((queue.openDisputes ?? 0) > 0) {
      tasks.push({
        id: 'admin-disputes',
        title: `${queue.openDisputes} Open Dispute${queue.openDisputes === 1 ? '' : 's'}`,
        description:
          'Shipper or transporter disputes are awaiting resolution. Investigate before the settlement window closes.',
        category: 'COMMERCIAL',
        urgency: 'HIGH',
        actionUrl: '/admin/disputes',
        actionLabel: 'Resolve Disputes',
      })
    }

    if ((queue.unmatchedLoads ?? 0) > 0) {
      tasks.push({
        id: 'admin-unmatched-loads',
        title: `${queue.unmatchedLoads} Unmatched Open Load${queue.unmatchedLoads === 1 ? '' : 's'}`,
        description:
          'These consignments have no booking yet. Check corridor coverage and verified truck supply on those lanes.',
        category: 'DISPATCH',
        urgency: 'MEDIUM',
        actionUrl: '/admin/listings',
        actionLabel: 'Inspect Listings',
      })
    }

    if ((queue.expiredTrials ?? 0) > 0) {
      tasks.push({
        id: 'admin-expired-trials',
        title: `${queue.expiredTrials} Expired Free Trial${queue.expiredTrials === 1 ? '' : 's'}`,
        description:
          'Accounts whose 3-month trial lapsed are locked out of contact reveals. Work the upgrade queue.',
        category: 'COMMERCIAL',
        urgency: 'LOW',
        actionUrl: '/admin/subscriptions',
        actionLabel: 'Open Upgrade Queue',
      })
    }
  }

  const sorted = Array.from(new Map(tasks.map((task) => [task.id, task])).values())
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency])

  return typeof params.maxTasks === 'number' && params.maxTasks >= 0
    ? sorted.slice(0, params.maxTasks)
    : sorted
}

/** Convenience summary used by badges / navbar counters. */
export function summarizeOperationalTasks(tasks: OperationalTask[]): {
  total: number
  high: number
  medium: number
  low: number
} {
  return {
    total: tasks.length,
    high: tasks.filter((t) => t.urgency === 'HIGH').length,
    medium: tasks.filter((t) => t.urgency === 'MEDIUM').length,
    low: tasks.filter((t) => t.urgency === 'LOW').length,
  }
}
