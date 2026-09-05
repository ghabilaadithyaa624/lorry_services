import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsDateString, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TruckType } from '@lorrycarry/database'

export class CreateLoadDto {
  @ApiProperty({ example: 15.5 })
  @IsNumber()
  @Min(0.5)
  @Max(100)
  tonnageRequired: number

  @ApiProperty({ example: 'MIDC Industrial Area, Pune' })
  @IsString()
  loadingAddress: string

  @ApiProperty({ example: '411018' })
  @IsString()
  loadingPin: string

  @ApiProperty({ example: 'Electronic City, Bangalore' })
  @IsString()
  unloadingAddress: string

  @ApiProperty({ example: '560100' })
  @IsString()
  unloadingPin: string

  @ApiProperty({ enum: TruckType })
  @IsEnum(TruckType)
  truckType: TruckType

  @ApiProperty({ example: 18, required: false })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(60)
  minLengthFt?: number

  @ApiProperty({ example: 7, required: false })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(15)
  minHeightFt?: number

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean

  @ApiProperty({ example: 45000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  maxPrice?: number

  @ApiProperty({ example: '2024-12-31T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  expectedDeliveryAt?: Date

  @ApiProperty({ example: 22500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  advancePayable?: number
}
