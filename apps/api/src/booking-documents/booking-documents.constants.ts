/**
 * Booking document chain domain constants.
 *
 * The seven stages mirror the lifecycle of a freight trip — from the booking
 * advice / lorry receipt through to the balance settlement invoice. These
 * literals are shared by the service (key derivation, validation) and DTOs.
 */
export const BOOKING_DOCUMENT_STAGES = [
  'BOOKING',
  'EWAY_BILL',
  'LOADING',
  'TRANSIT',
  'DELIVERY',
  'POD',
  'BALANCE',
] as const

export type BookingDocumentStageName = (typeof BOOKING_DOCUMENT_STAGES)[number]

/** Content types accepted for chain documents (PDF scans & photos). */
export const BOOKING_DOCUMENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const

export type BookingDocumentContentType = (typeof BOOKING_DOCUMENT_CONTENT_TYPES)[number]

/** Storage folder per booking, e.g. `booking-documents/<bookingId>/POD/<uuid>.jpg`. */
export const BOOKING_DOCUMENT_KEY_PREFIX = 'booking-documents'

/**
 * Verification lifecycle for a chain document. Mirrors the shared
 * `VerificationStatus` enum used by truck KYC documents
 * (`Pending | Verified | Rejected`) without importing the generated Prisma
 * client at compile time.
 */
export type BookingDocumentVerificationStatus = 'Pending' | 'Verified' | 'Rejected'
