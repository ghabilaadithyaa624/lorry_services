import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UserRole } from '@lorrycarry/database'
import { BookingDocumentsService } from './booking-documents.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import {
  ListBookingDocumentsQueryDto,
  VerifyBookingDocumentDto,
} from './dto/admin-booking-documents.dto'

/**
 * Admin review surface for the booking document chain: the verification queue
 * plus verify/reject actions. Mirror of the truck KYC document endpoints.
 */
@ApiTags('Admin · Booking Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('admin/booking-documents')
export class AdminBookingDocumentsController {
  constructor(private readonly bookingDocumentsService: BookingDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List booking chain documents (review queue with filters)' })
  async list(@Query() query: ListBookingDocumentsQueryDto) {
    return this.bookingDocumentsService.listForAdmin({
      status: query.status,
      bookingId: query.bookingId,
      page: query.page,
      limit: query.limit,
    })
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify or reject a booking chain document' })
  async verify(
    @Param('id') documentId: string,
    @Body() dto: VerifyBookingDocumentDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.bookingDocumentsService.verify(adminId, documentId, dto.status, dto.notes)
  }
}
