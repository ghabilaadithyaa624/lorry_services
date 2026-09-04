import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  BOOKING_DOCUMENT_CONTENT_TYPES,
  BOOKING_DOCUMENT_STAGES,
} from '../booking-documents.constants'

/**
 * Request a pre-signed S3 upload URL for a booking chain document.
 * The caller then PUTs the file directly to `uploadUrl` and finally calls
 * `POST /bookings/:id/documents` with the returned key to register it.
 */
export class RequestBookingDocumentUploadUrlDto {
  @ApiProperty({ enum: BOOKING_DOCUMENT_STAGES, example: 'POD' })
  @IsIn([...BOOKING_DOCUMENT_STAGES])
  stage: string

  @ApiProperty({ example: 'consignee-pod-signed.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string

  @ApiProperty({ enum: BOOKING_DOCUMENT_CONTENT_TYPES, example: 'image/jpeg' })
  @IsIn([...BOOKING_DOCUMENT_CONTENT_TYPES])
  contentType: string

  @ApiPropertyOptional({ example: 'POD-8492' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  docNumber?: string

  @ApiPropertyOptional({ example: 'Ramesh Kumar (Warehouse Manager)' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  signedBy?: string
}

/** Register a completed direct-to-storage upload against the booking chain. */
export class RegisterBookingDocumentDto {
  @ApiProperty({ enum: BOOKING_DOCUMENT_STAGES, example: 'POD' })
  @IsIn([...BOOKING_DOCUMENT_STAGES])
  stage: string

  /** Object key returned by the upload-url endpoint. */
  @ApiProperty({ example: 'booking-documents/<bookingId>/POD/<uuid>.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  key: string

  @ApiProperty({ enum: BOOKING_DOCUMENT_CONTENT_TYPES, example: 'image/jpeg' })
  @IsIn([...BOOKING_DOCUMENT_CONTENT_TYPES])
  contentType: string

  @ApiPropertyOptional({ example: 'consignee-pod-signed.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string

  @ApiPropertyOptional({ example: 'POD-8492' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  docNumber?: string

  @ApiPropertyOptional({ example: 'Ramesh Kumar (Warehouse Manager)' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  signedBy?: string

  @ApiPropertyOptional({ example: 452193 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100 MB upper bound; the UI layer enforces 10 MB
  fileSize?: number
}
