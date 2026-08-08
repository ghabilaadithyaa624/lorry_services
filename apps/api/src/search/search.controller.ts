import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { SearchService } from './search.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('trucks')
  @ApiOperation({ summary: 'Search trucks within radius (summary only)' })
  async searchTrucks(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
    @Query('truckType') truckType?: string,
    @Query('minTonnage') minTonnage?: string,
    @CurrentUser('id') userId?: string
  ) {
    return this.searchService.searchTrucks({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: radius ? parseInt(radius) : 50,
      truckType,
      minTonnage: minTonnage ? parseFloat(minTonnage) : undefined,
      userId: userId || '',
    })
  }

  @Get('loads')
  @ApiOperation({ summary: 'Search loads within radius (summary only)' })
  async searchLoads(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
    @Query('truckType') truckType?: string,
    @Query('maxTonnage') maxTonnage?: string,
    @CurrentUser('id') userId?: string
  ) {
    return this.searchService.searchLoads({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: radius ? parseInt(radius) : 50,
      truckType,
      maxTonnage: maxTonnage ? parseFloat(maxTonnage) : undefined,
      userId: userId || '',
    })
  }

  @Post(':type/:id/reveal')
  @ApiOperation({ summary: 'Reveal contact details (requires subscription)' })
  async revealContact(
    @Param('type') type: 'truck' | 'load',
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.searchService.revealContact(userId, id, type)
  }

  @Get('subscription-status')
  @ApiOperation({ summary: 'Check if user has active subscription' })
  async checkSubscription(@CurrentUser('id') userId: string) {
    const hasSubscription = await this.searchService.checkSubscription(userId)
    return { hasSubscription }
  }
}
