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
