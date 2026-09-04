import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class UpdateFastagDto {
  @ApiProperty({ enum: ['Active', 'LowBalance', 'Inactive'], example: 'Active' })
  @IsIn(['Active', 'LowBalance', 'Inactive'])
  status: 'Active' | 'LowBalance' | 'Inactive'
}

export class ValidateRCResponseDto {
  @ApiProperty({ example: true })
  valid: boolean

  @ApiProperty({ example: true })
  found: boolean

  @ApiProperty({ example: 'MH12QW8842' })
  registrationNumber: string

  @ApiProperty({ enum: ['vahan_api', 'sandbox', 'unavailable'] })
  source: string

  @ApiProperty({ required: false })
  error?: string
}

export class UpdateEwayBillDto {
  @ApiProperty({ example: '381234567890', description: '12-digit E-Way Bill number. Send null/empty to detach.' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, {
    message: 'ewayBillNumber must be exactly 12 digits (as issued on the GST / NIC e-way bill portal)',
  })
  @MaxLength(12)
  ewayBillNumber?: string | null

  @ApiProperty({ example: '2026-09-05T18:30:00.000Z', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/, { message: 'validUpto must be an ISO date (YYYY-MM-DD)' })
  validUpto?: string
}
