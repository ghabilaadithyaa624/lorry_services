import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TruckType } from '@lorrycarry/database'

export class CreateTruckDto {
  @ApiProperty({ example: 'MH12AB1234' })
  @IsString()
  registrationNumber: string

  @ApiProperty({ enum: TruckType })
  @IsEnum(TruckType)
  bodyType: TruckType

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(8)
  @Max(60)
  lengthFt: number

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(6)
  @Max(15)
  heightFt: number

  @ApiProperty({ example: 16 })
  @IsNumber()
  @Min(0.5)
  @Max(100)
  tonnageCapacity: number

  @ApiProperty({ example: 'Pune, Maharashtra' })
  @IsString()
  currentLocationAddress: string

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  serviceableRadiusKm?: number

  @ApiProperty({ example: ['Bangalore', 'Mumbai', 'Hyderabad'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDestinations?: string[]
}
