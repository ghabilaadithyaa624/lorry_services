import { IsNumber, IsOptional, IsEnum, IsArray, Min, Max, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TruckType } from '@lorrycarry/database'

/**
 * Partial edit of a registered truck. The registration number is immutable
 * (it is Vahan-verified and unique); location moves go through the dedicated
 * `PATCH /trucks/:id/location` endpoint which re-geocodes and re-runs matching.
 */
export class UpdateTruckDto {
  @ApiProperty({ enum: TruckType, required: false })
  @IsOptional()
  @IsEnum(TruckType)
  bodyType?: TruckType

  @ApiProperty({ example: 24, required: false })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(60)
  lengthFt?: number

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(15)
  heightFt?: number

  @ApiProperty({ example: 18, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(100)
  tonnageCapacity?: number

  @ApiProperty({ example: 75, required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  serviceableRadiusKm?: number

  @ApiProperty({ example: ['Bangalore', 'Hyderabad'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDestinations?: string[]
}
