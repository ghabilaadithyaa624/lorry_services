import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@lorrycarry/database'
import { S3Service } from '../common/services/s3.service'
import {
  BOOKING_DOCUMENT_KEY_PREFIX,
  type BookingDocumentStageName,
  type BookingDocumentVerificationStatus,
} from './booking-documents.constants'
import type { RequestBookingDocumentUploadUrlDto, RegisterBookingDocumentDto } from './dto/booking-documents.dto'

/** Shape of the authenticated principal after JwtAuthGuard. */
export interface AuthedUser {
  id: string
  role?: string
  phone?: string
  name?: string
}

const UPLOAD_URL_TTL_SECONDS = 300 // 5 minutes: enough to PUT one file
const DOWNLOAD_URL_TTL_SECONDS = 3600 // 1 hour, matching the truck KYC flow

const DOCUMENT_VIEW_INCLUDE = {
  uploadedBy: { select: { id: true, name: true } },
  verifiedBy: { select: { id: true, name: true } },
} as const

const BOOKING_PARTY_SELECT = {
  id: true,
  loadOwnerId: true,
  truckOwnerId: true,
} as const

/** Extension derived from the allowed content types. */
const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}

/**
 * Booking digital document chain — upload / list / download / admin verify.
 *
 * Authorization model:
 *  - read (list + download URL): either booking counterparty, or an admin
 *  - write (upload-url + register): booking counterparties only
 *  - verify/reject + review queue: admins only (see AdminBookingDocumentsController)
 */
@Injectable()
export class BookingDocumentsService {
  private readonly logger = new Logger(BookingDocumentsService.name)

  constructor(private readonly s3: S3Service) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  /**
   * List all chain documents for a booking (newest first). The S3 key is never
   * exposed here — clients fetch a time-limited download URL per document.
   */
  async list(bookingId: string, user: AuthedUser) {
    const booking = await this.getBookingOrThrow(bookingId)
    this.assertCanRead(user, booking)

    const documents = await prisma.bookingDocument.findMany({
      where: { bookingId },
      include: DOCUMENT_VIEW_INCLUDE,
      orderBy: [{ stage: 'asc' }, { uploadedAt: 'desc' }],
    })

    return { bookingId, documents: documents.map((doc) => this.toView(doc)) }
  }

  /** Admin review queue with optional status / booking filters. */
  async listForAdmin(
    query: { status?: string; bookingId?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, query.page ?? 1)
    const limit = Math.min(100, Math.max(1, query.limit ?? 20))

    const where = {
      ...(query.status
        ? { verificationStatus: query.status as BookingDocumentVerificationStatus }
        : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.bookingDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...DOCUMENT_VIEW_INCLUDE,
          booking: {
            select: {
              id: true,
              status: true,
              ewayBillNumber: true,
              load: { select: { loadingAddress: true, unloadingAddress: true } },
              loadOwner: { select: { id: true, name: true, phone: true } },
              truckOwner: { select: { id: true, name: true, phone: true } },
              truck: { select: { id: true, registrationNumber: true } },
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      }),
      prisma.bookingDocument.count({ where }),
    ])

    return { data, total, page, limit }
  }

  /** Admin verify / reject. Mirrors truck KYC semantics (Verified/Rejected). */
  async verify(adminId: string, documentId: string, status: 'Verified' | 'Rejected', notes?: string) {
    const doc = await prisma.bookingDocument.findUnique({ where: { id: documentId } })
    if (!doc) throw new NotFoundException('Booking document not found')

    const updated = await prisma.bookingDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: status,
        verifiedById: adminId,
        verificationNotes: notes ?? null,
        verifiedAt: new Date(),
      },
      include: DOCUMENT_VIEW_INCLUDE,
    })

    return this.toView(updated)
  }

  // ── Upload flow ──────────────────────────────────────────────────────────

  /**
   * Step 1 — issue a short-lived pre-signed PUT URL so the browser uploads the
   * file directly to private object storage. The returned `key` is required by
   * `register()` once the PUT succeeded.
   */
  async requestUploadUrl(bookingId: string, user: AuthedUser, dto: RequestBookingDocumentUploadUrlDto) {
    const booking = await this.getBookingOrThrow(bookingId)
    this.assertCanWrite(user, booking)

    const stage = dto.stage as BookingDocumentStageName
    const ext = this.extensionFor(dto.contentType)
    const key = this.buildObjectKey(bookingId, stage, ext)

    try {
      const uploadUrl = await this.s3.generatePresignedPutUrl(key, dto.contentType, UPLOAD_URL_TTL_SECONDS)
      return {
        bookingId,
        stage,
        key,
        uploadUrl,
        contentType: dto.contentType,
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      }
    } catch (error) {
      this.logger.error(`Failed to generate pre-signed upload URL for booking ${bookingId}: ${error}`)
      throw new InternalServerErrorException('Failed to generate secure upload URL')
    }
  }

  /**
   * Step 2 — register a completed direct-to-storage upload in the chain.
   *
   * Server-side checks before persisting:
   *  1. the caller is a booking counterparty,
   *  2. the key was issued by us for THIS booking+stage (prefix + extension),
   *  3. the object actually exists in storage (no phantom rows).
   * Re-registering the same key is idempotent.
   */
  async register(bookingId: string, user: AuthedUser, dto: RegisterBookingDocumentDto) {
    const booking = await this.getBookingOrThrow(bookingId)
    this.assertCanWrite(user, booking)

    const stage = dto.stage as BookingDocumentStageName
    const ext = this.extensionFor(dto.contentType)
    const expectedPrefix = `${BOOKING_DOCUMENT_KEY_PREFIX}/${bookingId}/${stage}/`

    if (!dto.key.startsWith(expectedPrefix) || !dto.key.endsWith(`.${ext}`)) {
      throw new BadRequestException('Invalid object key. Upload a document issued for this booking & stage.')
    }

    // Idempotency — the client may retry after a network hiccup.
    const existing = await prisma.bookingDocument.findFirst({
      where: { bookingId, stage, s3Key: dto.key },
      include: DOCUMENT_VIEW_INCLUDE,
    })
    if (existing) return this.toView(existing)

    // Reject phantom registrations: the file must really be in storage.
    const exists = await this.verifyObjectExists(dto.key)
    if (!exists) {
      throw new BadRequestException('Uploaded file was not found in storage. Please re-upload the document.')
    }

    const created = await prisma.bookingDocument.create({
      data: {
        bookingId,
        stage,
        s3Key: dto.key,
        docNumber: dto.docNumber?.trim() || null,
        originalFilename: dto.fileName?.trim() || null,
        mimeType: dto.contentType ?? null,
        fileSize: dto.fileSize ?? null,
        signedBy: dto.signedBy?.trim() || null,
        uploadedById: user.id,
        verificationStatus: 'Pending',
      },
      include: DOCUMENT_VIEW_INCLUDE,
    })

    this.logger.log(`Booking ${bookingId} — ${stage} document registered by ${user.id}`)
    return this.toView(created)
  }

  /** Issue a 1-hour pre-signed GET URL for one chain document. */
  async getDownloadUrl(bookingId: string, documentId: string, user: AuthedUser) {
    const booking = await this.getBookingOrThrow(bookingId)
    this.assertCanRead(user, booking)

    const doc = await prisma.bookingDocument.findFirst({
      where: { id: documentId, bookingId },
    })
    if (!doc) throw new NotFoundException('Booking document not found')

    let downloadUrl: string
    try {
      downloadUrl = await this.s3.getSignedUrl(doc.s3Key, DOWNLOAD_URL_TTL_SECONDS)
    } catch (error) {
      this.logger.error(`Failed to generate download URL for booking document ${documentId}: ${error}`)
      throw new InternalServerErrorException('Failed to generate secure download URL')
    }

    const safeExtension = doc.mimeType && CONTENT_TYPE_EXTENSION[doc.mimeType]
      ? CONTENT_TYPE_EXTENSION[doc.mimeType]
      : 'file'
    const fileName = doc.originalFilename
      || `${doc.stage}-${doc.docNumber || 'document'}.${safeExtension}`

    return {
      bookingId,
      documentId: doc.id,
      stage: doc.stage,
      fileName,
      downloadUrl,
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
      expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    }
  }

  // ── Authorization helpers ────────────────────────────────────────────────

  private async getBookingOrThrow(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: BOOKING_PARTY_SELECT,
    })
    if (!booking) throw new NotFoundException('Booking not found')
    return booking
  }

  private isParty(userId: string, booking: { loadOwnerId: string; truckOwnerId: string }) {
    return booking.loadOwnerId === userId || booking.truckOwnerId === userId
  }

  private assertCanRead(user: AuthedUser, booking: { loadOwnerId: string; truckOwnerId: string }) {
    if (this.isParty(user.id, booking) || user.role === 'admin') return
    throw new ForbiddenException('You are not a party to this booking')
  }

  private assertCanWrite(user: AuthedUser, booking: { loadOwnerId: string; truckOwnerId: string }) {
    if (this.isParty(user.id, booking)) return
    throw new ForbiddenException('Only booking counterparties can upload documents')
  }

  // ── Storage helpers ──────────────────────────────────────────────────────

  private extensionFor(contentType?: string): string {
    if (!contentType || !CONTENT_TYPE_EXTENSION[contentType]) {
      throw new BadRequestException('Invalid content type. Only JPEG, PNG and PDF are allowed.')
    }
    return CONTENT_TYPE_EXTENSION[contentType]
  }

  private buildObjectKey(bookingId: string, stage: BookingDocumentStageName, ext: string) {
    return `${BOOKING_DOCUMENT_KEY_PREFIX}/${bookingId}/${stage}/${uuidv4()}.${ext}`
  }

  /** Best-effort existence check; transport errors are logged and tolerated. */
  private async verifyObjectExists(key: string): Promise<boolean> {
    try {
      return await this.s3.objectExists(key)
    } catch (error) {
      this.logger.warn(`Storage existence check failed for ${key} (${error}); trusting the upload.`)
      return true
    }
  }

  private toView(doc: any) {
    return {
      id: doc.id,
      bookingId: doc.bookingId,
      stage: doc.stage,
      docNumber: doc.docNumber,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      signedBy: doc.signedBy,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      verificationStatus: doc.verificationStatus,
      verificationNotes: doc.verificationNotes,
      verifiedById: doc.verifiedById,
      verifiedAt: doc.verifiedAt,
      verifiedBy: doc.verifiedBy,
    }
  }
}
