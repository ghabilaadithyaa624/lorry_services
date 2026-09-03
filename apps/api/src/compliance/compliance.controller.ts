import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { UserRole } from '@lorrycarry/database'
import { ComplianceService } from './compliance.service'
import { UpdateEwayBillDto, UpdateFastagDto } from './dto/compliance.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ── Truck-level (Vahan RC, insurance, fitness, PUC, permit, FASTag) ───────

  @Post('trucks/:id/validate-rc')
  @Roles(UserRole.truck_owner, UserRole.admin)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Validate a truck RC against the Vahan API and store the snapshot' })
  async validateRC(
    @Param('id') truckId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.complianceService.validateTruckRC(truckId, userId, role)
  }

  @Get('trucks/:id')
  @ApiOperation({ summary: 'Compliance checklist for a truck (RC, insurance, fitness, FASTag)' })
  async getTruckChecklist(
    @Param('id') truckId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.complianceService.getTruckCompliance(truckId, userId, role)
  }

  @Patch('trucks/:id/fastag')
  @Roles(UserRole.truck_owner, UserRole.admin)
  @ApiOperation({ summary: 'Report FASTag status (Active / LowBalance / Inactive) for a truck' })
  async updateFastag(
    @Param('id') truckId: string,
    @Body() dto: UpdateFastagDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.complianceService.updateFastag(truckId, userId, role, dto.status)
  }

  // ── Booking-level (adds E-Way Bill lifecycle) ─────────────────────────────

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Trip compliance checklist (RC, insurance, E-Way Bill, FASTag)' })
  async getBookingChecklist(
    @Param('id') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.complianceService.getBookingCompliance(bookingId, userId, role)
  }

  @Post('bookings/:id/eway-bill')
  @Roles(UserRole.load_owner, UserRole.admin)
  @ApiOperation({ summary: 'Attach / update the 12-digit E-Way Bill number for a booking' })
  async updateEwayBill(
    @Param('id') bookingId: string,
    @Body() dto: UpdateEwayBillDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.complianceService.updateEwayBill(
      bookingId,
      userId,
      role,
      dto.ewayBillNumber ?? null,
      dto.validUpto,
    )
  }
}
