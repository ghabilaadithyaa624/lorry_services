import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { TrackingService } from './tracking.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':bookingId')
  @ApiOperation({ summary: 'Get tracking status and checkpoints for a booking' })
  async getStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.trackingService.getTrackingStatus(bookingId, userId)
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

  @Post(':bookingId/pod')
  @ApiOperation({ summary: 'Submit Proof of Delivery (POD) photo & sign-off' })
  async submitPod(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { podUrl?: string; consigneeName?: string; notes?: string }
  ) {
    return this.trackingService.recordPodUpload(bookingId, userId, body)
  }

  @Post(':bookingId/incident')
  @ApiOperation({ summary: 'Report operational delay or incident to dispatch' })
  async reportIncident(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { category: string; description: string; impactMinutes?: number }
  ) {
    return this.trackingService.reportIncident(bookingId, userId, body)
  }
}
