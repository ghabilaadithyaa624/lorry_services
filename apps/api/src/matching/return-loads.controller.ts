import { Controller, Get, Header, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ReturnLoadsService } from './return-loads.service'
import { ReturnLoadsQueryDto } from './dto/return-loads-query.dto'

@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Alias only this read endpoint; existing matching/mutation routes stay unchanged.
@Controller(['matching', 'matches'])
export class ReturnLoadsController {
  constructor(private readonly returnLoadsService: ReturnLoadsService) {}

  @Get('truck/:truckId/return-loads')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Rank open return loads within 50 km of your truck’s drop-off hub',
    description:
      'Truck owner only. Uses an optional coordinate pair override, otherwise the latest completed booking destination, then valid truck GPS. Preferred destinations inform corridor ranking, never an unbounded text search. Shipper contacts require an active, started and unexpired subscription; trial-only accounts remain masked.',
  })
  @ApiResponse({ status: 200, description: 'Ranked opportunities, resolved hub and contact-access metadata' })
  @ApiResponse({ status: 400, description: 'Invalid truck UUID or query parameters' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Truck missing or not owned by the caller' })
  @ApiResponse({ status: 503, description: 'Return-load discovery temporarily unavailable' })
  getReturnLoadsForTruck(
    @Param('truckId', ParseUUIDPipe) truckId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ReturnLoadsQueryDto,
  ) {
    return this.returnLoadsService.getReturnLoadsForTruck(truckId, userId, {
      radiusKm: query.radius,
      limit: query.limit,
      minScore: query.minScore,
      destinationLat: query.destinationLat,
      destinationLng: query.destinationLng,
    })
  }
}
