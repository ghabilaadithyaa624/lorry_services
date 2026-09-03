import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class VerifyDocumentDto {
  @ApiProperty({ enum: ['Verified', 'Rejected'] })
  @IsString()
  @IsIn(['Verified', 'Rejected'])
  status: 'Verified' | 'Rejected'

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string
}

export class VerifyTruckDto {
  @ApiProperty({ enum: ['Verified', 'Rejected'] })
  @IsString()
  @IsIn(['Verified', 'Rejected'])
  status: 'Verified' | 'Rejected'
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['Investigating', 'Resolved', 'Rejected'] })
  @IsString()
  @IsIn(['Investigating', 'Resolved', 'Rejected'])
  status: 'Investigating' | 'Resolved' | 'Rejected'

  @ApiProperty({ required: false, description: 'Decision or investigation note saved with the case' })
  @IsOptional()
  @IsString()
  resolution?: string
}

export class DisputeFilterDto {
  @ApiProperty({ required: false, enum: ['Open', 'Investigating', 'Resolved', 'Rejected'] })
  @IsOptional()
  @IsString()
  @IsIn(['Open', 'Investigating', 'Resolved', 'Rejected'])
  status?: 'Open' | 'Investigating' | 'Resolved' | 'Rejected'

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20
}

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20
}
