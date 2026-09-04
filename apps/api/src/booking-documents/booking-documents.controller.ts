import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { BookingDocumentsService } from './booking-documents.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import {
  RequestBookingDocumentUploadUrlDto,
  RegisterBookingDocumentDto,
} from './dto/booking-documents.dto'

/**
 * Booking document chain endpoints.
 *
 * Available to the two booking counterparties (factory owner / truck driver)
 * and — read-only — to admins. Uploads follow the pre-signed flow:
 *
 *   1. POST  /bookings/:id/documents/upload-url   → { uploadUrl, key }
 *   2. PUT   <uploadUrl>                           (direct-to-storage, browser)
 *   3. POST  /bookings/:id/documents               → registered chain document
 *   4. GET   /bookings/:id/documents/:docId/download-url → { downloadUrl }
 */
@ApiTags('Bookings · Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/documents')
export class BookingDocumentsController {
  constructor(private readonly bookingDocumentsService: BookingDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List booking document chain (parties & admins)' })
  async list(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.bookingDocumentsService.list(bookingId, { id: userId, role })
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Request pre-signed S3 upload URL for a chain stage' })
  async requestUploadUrl(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: RequestBookingDocumentUploadUrlDto,
  ) {
    return this.bookingDocumentsService.requestUploadUrl(bookingId, { id: userId, role }, dto)
  }

  @Post()
  @ApiOperation({ summary: 'Register a completed direct-to-storage upload in the chain' })
  async register(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: RegisterBookingDocumentDto,
  ) {
    return this.bookingDocumentsService.register(bookingId, { id: userId, role }, dto)
  }

  @Get(':documentId/download-url')
  @ApiOperation({ summary: 'Get a time-limited pre-signed download URL' })
  async getDownloadUrl(
    @Param('bookingId') bookingId: string,
    @Param('documentId') documentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.bookingDocumentsService.getDownloadUrl(bookingId, documentId, { id: userId, role })
  }
}
