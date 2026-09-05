import {
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TruckType } from '@prisma/client'

/**
 * Partial edit of a posted load. Every freight-side field an operator can
 * legitimately revise while the load is still Open:
 *
 *   - loading / unloading address (+ PIN) — re-geocoded server-side so the
 *     stored lat/lng and PostGIS points (and therefore proximity matching)
 *     stay accurate after a route correction
 *   - tonnage, truck type, min length/height
 *   - expected delivery date
 *   - budget (max price)
 *   - urgent flag
 *
 * Mutations are owner-only (admin override) and rejected once the load has
 * left the Open status — see LoadsService.assertLoadOwnership.
 */
export class UpdateLoadDto {
  @ApiProperty({ example: 'MIDC Industrial Area, Pune', required: false })
  @IsOptional()
  @IsString()
  loadingAddress?: string

  @ApiProperty({ example: '411018', required: false })
  @IsOptional()
  @IsString()
  loadingPin?: string

  @ApiProperty({ example: 'Electronic City, Bangalore', required: false })
  @IsOptional()
  @IsString()
  unloadingAddress?: string

  @ApiProperty({ example: '560100', required: false })
  @IsOptional()
  @IsString()
  unloadingPin?: string

  @ApiProperty({ example: 18, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(100)
  tonnageRequired?: number

  @ApiProperty({ enum: TruckType, required: false })
  @IsOptional()
  @IsEnum(TruckType)
  truckType?: TruckType

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean

  @ApiProperty({ example: 48000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  maxPrice?: number

  @ApiProperty({ example: 24, required: false })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(60)
  minLengthFt?: number

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(15)
  minHeightFt?: number

  @ApiProperty({ example: '2024-12-31T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  expectedDeliveryAt?: Date
}
