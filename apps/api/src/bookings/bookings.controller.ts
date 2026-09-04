import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UserRole, BookingStatus } from '@lorrycarry/database'
import { BookingsService } from './bookings.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { isFreightSideRole } from '../common/utils/roles.util'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateBookingDto } from './dto/create-booking.dto'
import { CreateDisputeDto } from './dto/create-dispute.dto'

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.factory_owner)
  @ApiOperation({ summary: 'Create booking (requires subscription)' })
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.create(userId, {
      loadId: dto.loadId,
      truckId: dto.truckId,
      agreedPrice: dto.agreedPrice,
      ewayBillNumber: dto.ewayBillNumber,
      liabilityAccepted: dto.liabilityAccepted ?? false,
    })
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get my bookings' })
  async findMyBookings(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.bookingsService.findByUser(
      userId,
      isFreightSideRole(role) ? 'factory_owner' : 'truck_driver'
    )
  }

  @Post(':id/disputes')
  @ApiOperation({ summary: 'Raise a dispute against a booking as one of its counterparties' })
  async createDispute(
    @Param('id') bookingId: string,
    @Body() dto: CreateDisputeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.createDispute(bookingId, userId, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details with checkpoints' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.findOne(id, userId)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
    @Body() updateData: { advanceConfirmed?: boolean; balanceConfirmed?: boolean },
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.updateStatus(id, userId, status, updateData)
  }
}
