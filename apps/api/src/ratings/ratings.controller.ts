import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { RatingsService, CreateRatingDto } from './ratings.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  /**
   * Submit a rating for a completed trip
   */
  @Post()
  @ApiOperation({ summary: 'Submit rating for completed trip' })
  async createRating(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.createRating(userId, dto)
  }

  /**
   * Get rating summary for a user
   */
  @Get('summary/:userId')
  @ApiOperation({ summary: 'Get rating summary for a user' })
  async getRatingSummary(@Param('userId') userId: string) {
    return this.ratingsService.getRatingSummary(userId)
  }

  /**
   * Get all ratings for a user
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all ratings for a user' })
  async getUserRatings(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.ratingsService.getUserRatings(
      userId,
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
    )
  }

  /**
   * Get pending ratings for current user
   */
  @Get('pending')
  @ApiOperation({ summary: 'Get pending ratings for current user' })
  async getPendingRatings(@CurrentUser('id') userId: string) {
    return this.ratingsService.getPendingRatings(userId)
  }
}
