import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export const BOOKING_DOCUMENT_VERIFICATION_STATUSES = ['Pending', 'Verified', 'Rejected'] as const

/** Filters for the admin booking-document review queue. */
export class ListBookingDocumentsQueryDto {
  @ApiPropertyOptional({ enum: BOOKING_DOCUMENT_VERIFICATION_STATUSES })
  @IsOptional()
  @IsIn([...BOOKING_DOCUMENT_VERIFICATION_STATUSES])
  status?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}

/** Admin verify/reject action on a booking chain document. */
export class VerifyBookingDocumentDto {
  @ApiProperty({ enum: ['Verified', 'Rejected'] })
  @IsIn(['Verified', 'Rejected'])
  status: 'Verified' | 'Rejected'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
