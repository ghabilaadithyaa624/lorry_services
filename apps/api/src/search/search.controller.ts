import { Controller, Get, Post, Query, Param, UseGuards, BadRequestException, Logger } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { SearchService } from './search.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name)

  constructor(
    private readonly searchService: SearchService,
    private readonly mapmyIndiaService: MapmyIndiaService,
  ) {}

  /**
   * Reverse geocode GPS coordinates to a human-readable Indian address.
   * Proxies browser-obtained lat/lng to the server-side Mappls API,
   * keeping the API key securely on the backend.
   */
  @Get('reverse-geocode')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Reverse geocode lat/lng to address via Mappls (server-side)' })
  async reverseGeocode(
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
  ) {
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('Valid numeric lat and lng query parameters are required')
    }

    if (lat < 6.0 || lat > 38.0 || lng < 68.0 || lng > 98.0) {
      throw new BadRequestException('Coordinates are outside the supported Indian geographic boundary')
    }

    this.logger.log(`Reverse geocoding GPS coordinates: ${lat}, ${lng}`)

    const result = await this.mapmyIndiaService.reverseGeocode(lat, lng)

    if (!result) {
      return {
        formattedAddress: null,
        city: null,
        state: null,
        pincode: null,
        lat,
        lng,
        error: 'Could not resolve address for the provided coordinates',
      }
    }

    return {
      formattedAddress: result.formattedAddress,
      city: result.city,
      state: result.state,
      pincode: result.pincode,
      lat: result.lat,
      lng: result.lng,
    }
  }

  /**
   * Geocode a manual address string to coordinates via Mappls.
   */
  @Get('geocode')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Geocode address to lat/lng via Mappls (server-side)' })
  async geocode(@Query('address') address: string) {
    if (!address || typeof address !== 'string' || address.trim().length < 2) {
      throw new BadRequestException('A valid address query string is required')
    }

    const result = await this.mapmyIndiaService.geocodeAddress(address.trim())
    if (!result) {
      return {
        formattedAddress: null,
        city: null,
        state: null,
        pincode: null,
        lat: null,
        lng: null,
        error: 'Location could not be geocoded',
      }
    }

    return {
      formattedAddress: result.formattedAddress,
      city: result.city,
      state: result.state,
      pincode: result.pincode,
      lat: result.lat,
      lng: result.lng,
    }
  }

  /**
   * Autosuggest place predictions for manual location typing via Mappls.
   */
  @Get('suggestions')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get place autosuggestions via Mappls' })
  async suggestions(
    @Query('query') query: string,
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
  ) {
    if (!query || query.trim().length < 2) {
      return []
    }

    let location: { lat: number; lng: number } | undefined
    if (latStr && lngStr) {
      const lat = parseFloat(latStr)
      const lng = parseFloat(lngStr)
      if (!isNaN(lat) && !isNaN(lng)) {
        location = { lat, lng }
      }
    }

    return this.mapmyIndiaService.getSuggestions(query.trim(), location)
  }

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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Reveal contact details (requires subscription - throttled to 10 req/min)' })
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
