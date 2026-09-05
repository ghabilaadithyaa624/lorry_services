import { IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TruckType } from '@prisma/client'

/**
 * Partial edit of a posted load. Only the freight-side fields an operator can
 * legitimately revise while the load is still Open — route addresses are fixed
 * at posting time (they drive geocoded matching), so a route change means a new
 * post, not an edit.
 */
export class UpdateLoadDto {
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
}
