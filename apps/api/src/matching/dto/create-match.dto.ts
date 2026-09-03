import { IsString, IsOptional, IsNumber } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateMatchDto {
  @ApiProperty({ example: 'load-uuid', description: 'Need Load entry ID' })
  @IsString()
  loadId: string

  @ApiProperty({ example: 'truck-uuid', description: 'Need Vehicle entry ID' })
  @IsString()
  truckId: string

  @ApiProperty({ example: 42, required: false, description: 'Optional pre-calculated match score' })
  @IsOptional()
  @IsNumber()
  matchScore?: number
}

export class EvaluateMatchesDto {
  @ApiProperty({ example: 50, required: false, description: 'Proximity radius in km, max 50' })
  @IsOptional()
  @IsNumber()
  radiusKm?: number

  @ApiProperty({ example: 'load-uuid', required: false, description: 'Evaluate for specific load only' })
  @IsOptional()
  @IsString()
  loadId?: string

  @ApiProperty({ example: 'truck-uuid', required: false, description: 'Evaluate for specific truck only' })
  @IsOptional()
  @IsString()
  truckId?: string
}
