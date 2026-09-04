import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import {
  VerifyDocumentDto,
  VerifyTruckDto,
  PaginationDto,
  DisputeFilterDto,
  ResolveDisputeDto,
} from './dto/admin.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats — totals, revenue, pending docs' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.adminService.getDashboardStats(userId)
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Dashboard analytics — trips, earnings, bookings & route efficiency heatmap' })
  @ApiQuery({ name: 'range', required: false, description: 'Range in days: 30 (default), 90, 180 or 365' })
  async getAnalytics(@CurrentUser('id') userId: string, @Query('range') range?: string) {
    const parsed = Number(range)
    return this.adminService.getAnalytics(userId, [30, 90, 180, 365].includes(parsed) ? parsed : 30)
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with counts' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  async listUsers(
    @CurrentUser('id') userId: string,
    @Query('role') role?: UserRole,
    @Query() pagination?: PaginationDto,
  ) {
    return this.adminService.listUsers(userId, role, pagination?.page, pagination?.limit)
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  @Get('documents/pending')
  @ApiOperation({ summary: 'List all pending KYC documents for review' })
  async getPendingDocuments(@CurrentUser('id') userId: string) {
    return this.adminService.getPendingDocuments(userId)
  }

  @Patch('documents/:id/verify')
  @ApiOperation({ summary: 'Verify or reject a KYC document' })
  async verifyDocument(
    @Param('id') documentId: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.verifyDocument(userId, documentId, dto.status, dto.notes)
  }

  // ── Trucks & Vahan / RC verification ──────────────────────────────────────

  @Post('trucks/:id/vahan-check')
  @ApiOperation({ summary: 'Run a Vahan / Parivahan registration lookup for a truck' })
  async checkVahan(
    @Param('id') truckId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.checkVahan(userId, truckId)
  }

  @Patch('trucks/:id/verify')
  @ApiOperation({ summary: 'Directly verify or reject a truck' })
  async verifyTruck(
    @Param('id') truckId: string,
    @Body() dto: VerifyTruckDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.verifyTruck(userId, truckId, dto.status)
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions' })
  async listSubscriptions(
    @CurrentUser('id') userId: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.adminService.listSubscriptions(userId, pagination?.page, pagination?.limit)
  }

  // ── Bookings ───────────────────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings' })
  async listBookings(
    @CurrentUser('id') userId: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.adminService.listBookings(userId, pagination?.page, pagination?.limit)
  }

  // ── Disputes ───────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'List booking disputes for the resolution queue' })
  async listDisputes(
    @CurrentUser('id') userId: string,
    @Query() filters?: DisputeFilterDto,
  ) {
    return this.adminService.listDisputes(
      userId,
      filters?.status,
      filters?.page,
      filters?.limit,
    )
  }

  @Patch('disputes/:id/resolve')
  @ApiOperation({ summary: 'Move a booking dispute through investigation or resolve it' })
  async resolveDispute(
    @Param('id') disputeId: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.resolveDispute(userId, disputeId, dto.status, dto.resolution)
  }
}
