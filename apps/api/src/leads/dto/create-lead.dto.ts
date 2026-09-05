import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export const LEAD_COMPANY_TYPES = [
  'factory_shipper',
  'fleet_owner',
  'transporter',
  'logistics_manager',
  'other',
] as const

export const LEAD_FLEET_SIZES = ['1-5', '6-20', '21-50', '51+'] as const

export const LEAD_MONTHLY_LOADS = ['1-10', '11-50', '51-200', '200+'] as const

export type LeadCompanyType = (typeof LEAD_COMPANY_TYPES)[number]
export type LeadFleetSize = (typeof LEAD_FLEET_SIZES)[number]
export type LeadMonthlyLoads = (typeof LEAD_MONTHLY_LOADS)[number]

/**
 * Public Request Demo payload.
 *
 * Only the fields a sales walkthrough needs. No documents, passwords,
 * OTPs or payment data — and the service that consumes this DTO does not
 * persist the payload.
 */
export class CreateLeadDto {
  @ApiProperty({ example: 'Priya Sharma', description: 'Full name' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string

  @ApiProperty({ example: 'Aarav Textiles Pvt Ltd' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName: string

  @ApiProperty({
    example: '+919876543210',
    description: 'Indian mobile number, with or without +91',
  })
  @Transform(trim)
  @IsString()
  @Matches(/^(\+?91[\s-]?)?[6-9]\d{9}$/, {
    message: 'Enter a valid 10-digit Indian mobile number',
  })
  mobile: string

  @ApiProperty({
    enum: LEAD_COMPANY_TYPES,
    example: 'factory_shipper',
    description: 'Role / company type',
  })
  @IsIn(LEAD_COMPANY_TYPES)
  companyType: LeadCompanyType

  @ApiPropertyOptional({ enum: LEAD_FLEET_SIZES, example: '6-20' })
  @IsOptional()
  @IsIn(LEAD_FLEET_SIZES)
  fleetSize?: LeadFleetSize

  @ApiPropertyOptional({ enum: LEAD_MONTHLY_LOADS, example: '11-50' })
  @IsOptional()
  @IsIn(LEAD_MONTHLY_LOADS)
  monthlyLoads?: LeadMonthlyLoads

  @ApiProperty({ example: 'Pune, Maharashtra' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  cityState: string

  @ApiPropertyOptional({ example: 'We move 20 FTLs a month on the Pune–Chennai lane.' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string

  /**
   * Honeypot — real users never fill this. A non-empty value is treated as
   * a bot and the service returns a fake success without processing.
   */
  @ApiPropertyOptional({ description: 'Leave empty' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string
}
