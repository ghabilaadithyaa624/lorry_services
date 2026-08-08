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
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.load_owner)
  @ApiOperation({ summary: 'Create booking (requires subscription)' })
  async create(
    @Body() dto: {
      loadId: string
      truckId: string
      agreedPrice: number
      ewayBillNumber?: string
      liabilityAccepted: boolean
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.create(userId, dto)
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get my bookings' })
  async findMyBookings(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.bookingsService.findByUser(
      userId,
      role === UserRole.load_owner ? 'load_owner' : 'truck_owner'
    )
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
