import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { TrackingService } from './tracking.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':bookingId')
  @ApiOperation({ summary: 'Get tracking status and checkpoints for a booking' })
  async getStatus(@Param('bookingId') bookingId: string) {
    return this.trackingService.getTrackingStatus(bookingId)
  }

  @Post(':bookingId/checkpoint')
  @ApiOperation({ summary: 'Record geofence crossing event' })
  async recordCheckpoint(
    @Param('bookingId') bookingId: string,
    @Body() body: { checkpointSeq: number; lat: number; lng: number }
  ) {
    return this.trackingService.processGeofenceCrossing(
      bookingId,
      body.checkpointSeq,
      { lat: body.lat, lng: body.lng }
    )
  }
}
