import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

/** Widest radius (km) the return-load scanner will search around the drop-off hub. */
export const RETURN_LOAD_MAX_RADIUS_KM = 300
/** Default radius (km) — return freight is discovered wider than the 50 km live-match filter. */
export const RETURN_LOAD_DEFAULT_RADIUS_KM = 150
/** Hard ceiling on returned opportunities per request. */
export const RETURN_LOAD_MAX_LIMIT = 50
export const RETURN_LOAD_DEFAULT_LIMIT = 10

/**
 * Query parameters for `GET /matches/truck/:truckId/return-loads`.
 *
 * Every field is optional: with no query the service resolves the drop-off hub
 * from the truck's most recent booking destination, then its current GPS
 * position, then its declared preferred corridors.
 */
export class ReturnLoadsQueryDto {
  @ApiPropertyOptional({
    example: 150,
    minimum: 1,
    maximum: RETURN_LOAD_MAX_RADIUS_KM,
    description: `Discovery radius in km around the drop-off hub (default ${RETURN_LOAD_DEFAULT_RADIUS_KM}, max ${RETURN_LOAD_MAX_RADIUS_KM})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(RETURN_LOAD_MAX_RADIUS_KM)
  radius?: number

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: RETURN_LOAD_MAX_LIMIT,
    description: `Maximum ranked opportunities to return (default ${RETURN_LOAD_DEFAULT_LIMIT}, max ${RETURN_LOAD_MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RETURN_LOAD_MAX_LIMIT)
  limit?: number

  @ApiPropertyOptional({
    example: 40,
    minimum: 0,
    maximum: 100,
    description: 'Drop opportunities whose composite return-load rank score is below this threshold',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number

  @ApiPropertyOptional({
    example: 12.9716,
    description: 'Override the drop-off hub latitude (e.g. the driver picks a different destination city)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  destinationLat?: number

  @ApiPropertyOptional({
    example: 77.5946,
    description: 'Override the drop-off hub longitude (must be sent together with destinationLat)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  destinationLng?: number
}
