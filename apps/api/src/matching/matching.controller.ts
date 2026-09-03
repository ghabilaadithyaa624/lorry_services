import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MatchingService, MatchStatus } from './matching.service'
import { CreateMatchDto, EvaluateMatchesDto } from './dto/create-match.dto'
import { UpdateMatchStatusDto } from './dto/update-match-status.dto'

@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('my-matches')
  @ApiOperation({ summary: 'Get my matches (both as load owner and truck owner) with status tags Pending/Booked/Completed, proximity ≤50km' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Booked', 'Completed', 'Cancelled'] })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Proximity radius km, max 50' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyMatches(
    @CurrentUser('id') userId: string,
    @Query('status') status?: MatchStatus,
    @Query('radius') radius?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchingService.getMyMatches(userId, {
      status,
      radiusKm: radius ? parseInt(radius, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    })
  }

  @Get('load/:loadId')
  @ApiOperation({ summary: 'Find matching trucks for a Need Load entry — tonnage, route, budget, proximity ≤50km' })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Radius km, max 50' })
  async getMatchesForLoad(
    @Param('loadId') loadId: string,
    @CurrentUser('id') userId: string,
    @Query('radius') radius?: string,
  ) {
    const r = radius ? parseInt(radius, 10) : 50
    return this.matchingService.getMatchesForLoad(loadId, userId, r)
  }

  @Get('truck/:truckId')
  @ApiOperation({ summary: 'Find matching loads for a Need Vehicle entry — tonnage, route, budget, proximity ≤50km' })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Radius km, max 50' })
  async getMatchesForTruck(
    @Param('truckId') truckId: string,
    @CurrentUser('id') userId: string,
    @Query('radius') radius?: string,
  ) {
    const r = radius ? parseInt(radius, 10) : 50
    return this.matchingService.getMatchesForTruck(truckId, userId, r)
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate and persist matches for a load/truck or all open loads (triggers WhatsApp on match)' })
  async evaluate(
    @Body() dto: EvaluateMatchesDto,
  ) {
    const radius = dto.radiusKm ?? 50
    if (dto.loadId) {
      return this.matchingService.evaluateMatchesForLoad(dto.loadId, radius)
    }
    if (dto.truckId) {
      return this.matchingService.evaluateMatchesForTruck(dto.truckId, radius)
    }
    return this.matchingService.evaluateAll(radius)
  }

  @Post('evaluate/load/:loadId')
  @ApiOperation({ summary: 'Evaluate matches for a specific Need Load (WhatsApp trigger)' })
  async evaluateLoad(@Param('loadId') loadId: string, @Query('radius') radius?: string) {
    const r = radius ? parseInt(radius, 10) : 50
    return this.matchingService.evaluateMatchesForLoad(loadId, r)
  }

  @Post('evaluate/truck/:truckId')
  @ApiOperation({ summary: 'Evaluate matches for a specific Need Vehicle (WhatsApp trigger)' })
  async evaluateTruck(@Param('truckId') truckId: string, @Query('radius') radius?: string) {
    const r = radius ? parseInt(radius, 10) : 50
    return this.matchingService.evaluateMatchesForTruck(truckId, r)
  }

  @Post()
  @ApiOperation({ summary: 'Manually create a match between Need Load and Need Vehicle' })
  async create(@Body() dto: CreateMatchDto) {
    // Compute score then persist via service helper
    const load = await (await import('@lorrycarry/database')).prisma.load.findUnique({ where: { id: dto.loadId } })
    const truck = await (await import('@lorrycarry/database')).prisma.truck.findUnique({ where: { id: dto.truckId } })
    if (!load || !truck) throw new Error('Load or Truck not found')
    const svc: any = this.matchingService
    const matchScore = dto.matchScore ?? svc.calculateMatchScore(load, truck).score
    // Approximate distance for persistence
    let distanceKm = 15
    if (load.loadingLat && load.loadingLng && truck.currentLat && truck.currentLng) {
      distanceKm = svc.calculateGeoDistance(Number(truck.currentLat), Number(truck.currentLng), Number(load.loadingLat), Number(load.loadingLng))
    }
    const tonnageCompatible = Number(truck.tonnageCapacity) >= Number(load.tonnageRequired)
    const routeCompatible = distanceKm <= 50
    const budgetCompatible = !load.maxPrice || Number(load.maxPrice) >= 10000 // simplified gate, detailed computed in score
    return this.matchingService.createOrUpdateMatch(dto.loadId, dto.truckId, {
      distanceKm,
      score: matchScore,
      tonnageCompatible,
      routeCompatible,
      budgetCompatible,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single match with status and computed factors' })
  async getOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.matchingService.getMatchById(id, userId)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update match status: Pending → Booked → Completed' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateMatchStatusDto, @CurrentUser('id') userId: string) {
    return this.matchingService.updateMatchStatus(id, userId, dto.status as MatchStatus, dto.bookingId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a match (owner only)' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.matchingService.deleteMatch(id, userId)
  }
}
