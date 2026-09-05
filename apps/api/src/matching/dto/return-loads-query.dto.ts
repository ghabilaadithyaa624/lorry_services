import { IsInt, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { DEFAULT_RETURN_LOAD_RADIUS_KM } from '@lorrycarry/shared'

/** Hard limits apply to both HTTP callers and internal service calls. */
export const RETURN_LOAD_MAX_RADIUS_KM = 50
export const RETURN_LOAD_DEFAULT_RADIUS_KM = DEFAULT_RETURN_LOAD_RADIUS_KM
export const RETURN_LOAD_MAX_LIMIT = 50
export const RETURN_LOAD_DEFAULT_LIMIT = 10

// Unlike Number(value), this does not turn blank strings, arrays or null into 0.
const QueryNumber = () => Transform(({ value }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
)

/** Query for GET /matching/truck/:truckId/return-loads (also aliased under /matches). */
export class ReturnLoadsQueryDto {
  @ApiPropertyOptional({
    default: RETURN_LOAD_DEFAULT_RADIUS_KM,
    minimum: 1,
    maximum: RETURN_LOAD_MAX_RADIUS_KM,
    description: 'Pickup proximity radius in km (spherical distance, not a road-route estimate)',
  })
  @IsOptional()
  @QueryNumber()
  @IsNumber()
  @Min(1)
  @Max(RETURN_LOAD_MAX_RADIUS_KM)
  radius?: number

  @ApiPropertyOptional({
    default: RETURN_LOAD_DEFAULT_LIMIT,
    minimum: 1,
    maximum: RETURN_LOAD_MAX_LIMIT,
    description: 'Maximum ranked opportunities to return',
  })
  @IsOptional()
  @QueryNumber()
  @IsInt()
  @Min(1)
  @Max(RETURN_LOAD_MAX_LIMIT)
  limit?: number

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    maximum: 100,
    description: 'Minimum composite return-load rank score',
  })
  @IsOptional()
  @QueryNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number

  @ApiPropertyOptional({
    example: 12.9716,
    minimum: -90,
    maximum: 90,
    description: 'Optional destination override; must be paired with destinationLng',
  })
  @ValidateIf((query) => query.destinationLat !== undefined || query.destinationLng !== undefined)
  @QueryNumber()
  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLat?: number

  @ApiPropertyOptional({
    example: 77.5946,
    minimum: -180,
    maximum: 180,
    description: 'Optional destination override; must be paired with destinationLat',
  })
  @ValidateIf((query) => query.destinationLat !== undefined || query.destinationLng !== undefined)
  @QueryNumber()
  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLng?: number
}
