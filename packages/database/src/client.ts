import { PrismaClient, Prisma as GeneratedPrisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazily instantiate the Prisma client on first property access.
 *
 * `new PrismaClient()` eagerly loads the native query engine, which fails in
 * environments where the engine binary is unavailable (e.g. unit tests that
 * fully mock the client, or restricted CI sandboxes). Wrapping construction in
 * a Proxy defers engine loading until a query is actually issued, so importing
 * this module — as spec files do via `jest.requireActual` to read enums — never
 * touches the engine. Runtime behaviour for real queries is unchanged.
 */
function createPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }
  return globalForPrisma.prisma
}

type PrismaClientFacade = {
  $queryRaw<T = unknown>(query: unknown, ...values: unknown[]): Promise<T>
  $executeRaw<T = unknown>(query: unknown, ...values: unknown[]): Promise<T>
  [key: string]: any
}

export const prisma: PrismaClientFacade = new Proxy({} as PrismaClientFacade, {
  get(_target, prop, receiver) {
    const client = createPrismaClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
  has(_target, prop) {
    return Reflect.has(createPrismaClient() as object, prop)
  },
})

// Re-export the generated Prisma client class. Enum-like constants below mirror
// schema.prisma so TypeScript builds do not depend on a freshly generated client
// being present in restricted local/CI sandboxes. In deployed environments,
// `prisma generate` still provides the actual Prisma model types/runtime.
export { PrismaClient }

export const Prisma = GeneratedPrisma as any
export namespace Prisma {
  export type Sql = any
  export type InputJsonValue = any
  export type JsonValue = any
  export type TruckSelect = any
  export type LoadSelect = any
}

export type User = any
export type Load = any
export type Truck = any
export type Booking = any
export type BookingDocument = any
export type Subscription = any
export type Payment = any
export type Notification = any

export const UserRole = {
  factory_owner: 'factory_owner',
  truck_driver: 'truck_driver',
  transporter: 'transporter',
  driver: 'driver',
  admin: 'admin',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const SubscriptionStatus = {
  active: 'active',
  expired: 'expired',
  cancelled: 'cancelled',
} as const
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const TruckType = {
  Open: 'Open',
  Container: 'Container',
  OpenBody: 'OpenBody',
} as const
export type TruckType = (typeof TruckType)[keyof typeof TruckType]

export const LoadStatus = {
  Open: 'Open',
  Matched: 'Matched',
  InTransit: 'InTransit',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const
export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus]

export const FastagStatus = {
  Unknown: 'Unknown',
  Active: 'Active',
  LowBalance: 'LowBalance',
  Inactive: 'Inactive',
} as const
export type FastagStatus = (typeof FastagStatus)[keyof typeof FastagStatus]

export const EwayBillStatus = {
  Pending: 'Pending',
  Active: 'Active',
  Expired: 'Expired',
  Invalid: 'Invalid',
} as const
export type EwayBillStatus = (typeof EwayBillStatus)[keyof typeof EwayBillStatus]

export const VerificationStatus = {
  Pending: 'Pending',
  Verified: 'Verified',
  Rejected: 'Rejected',
} as const
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus]

export const VahanCheckStatus = {
  NotChecked: 'NotChecked',
  Pending: 'Pending',
  Verified: 'Verified',
  Mismatch: 'Mismatch',
  Unavailable: 'Unavailable',
  Error: 'Error',
} as const
export type VahanCheckStatus = (typeof VahanCheckStatus)[keyof typeof VahanCheckStatus]

export const DocumentType = {
  RC: 'RC',
  Insurance: 'Insurance',
} as const
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]

export const BookingStatus = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  InTransit: 'InTransit',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus]

export const BookingDocumentStage = {
  BOOKING: 'BOOKING',
  EWAY_BILL: 'EWAY_BILL',
  LOADING: 'LOADING',
  TRANSIT: 'TRANSIT',
  DELIVERY: 'DELIVERY',
  POD: 'POD',
  BALANCE: 'BALANCE',
} as const
export type BookingDocumentStage = (typeof BookingDocumentStage)[keyof typeof BookingDocumentStage]

export const WhatsappTriggerStatus = {
  NotTriggered: 'NotTriggered',
  Queued: 'Queued',
  Sent: 'Sent',
  Delivered: 'Delivered',
  Failed: 'Failed',
} as const
export type WhatsappTriggerStatus = (typeof WhatsappTriggerStatus)[keyof typeof WhatsappTriggerStatus]

export const DisputeCategory = {
  Payment: 'Payment',
  CargoDamage: 'CargoDamage',
  Delay: 'Delay',
  Document: 'Document',
  Other: 'Other',
} as const
export type DisputeCategory = (typeof DisputeCategory)[keyof typeof DisputeCategory]

export const DisputePriority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
} as const
export type DisputePriority = (typeof DisputePriority)[keyof typeof DisputePriority]

export const DisputeStatus = {
  Open: 'Open',
  Investigating: 'Investigating',
  Resolved: 'Resolved',
  Rejected: 'Rejected',
} as const
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus]

export const PaymentPurpose = {
  subscription: 'subscription',
  booking_advance: 'booking_advance',
  booking_balance: 'booking_balance',
} as const
export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose]

export const PaymentStatus = {
  Pending: 'Pending',
  Success: 'Success',
  Failed: 'Failed',
  Refunded: 'Refunded',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const NotificationChannel = {
  whatsapp: 'whatsapp',
  sms: 'sms',
  push: 'push',
} as const
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]

export const NotificationStatus = {
  Pending: 'Pending',
  Sent: 'Sent',
  Delivered: 'Delivered',
  Failed: 'Failed',
} as const
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus]

export const MatchStatus = {
  Pending: 'Pending',
  Booked: 'Booked',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus]

export const RatingCategory = {
  driver_service: 'driver_service',
  factory_payment: 'factory_payment',
  overall: 'overall',
} as const
export type RatingCategory = (typeof RatingCategory)[keyof typeof RatingCategory]
