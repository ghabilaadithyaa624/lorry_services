import { IsString, IsNumber, IsOptional, IsBoolean, IsPositive, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateBookingDto {
  @ApiProperty({ example: 'load-uuid' })
  @IsString()
  loadId: string

  @ApiProperty({ example: 'truck-uuid' })
  @IsString()
  truckId: string

  @ApiProperty({ example: 42000 })
  @IsNumber()
  @IsPositive({ message: 'agreedPrice must be a positive number' })
  @Min(100, { message: 'agreedPrice must be at least ₹100' })
  agreedPrice: number

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  liabilityAccepted?: boolean

  @ApiProperty({ example: '1234567890123', required: false })
  @IsOptional()
  @IsString()
  ewayBillNumber?: string
}

export class ConfirmPaymentDto {
  @ApiProperty({ enum: ['advance', 'balance'] })
  @IsString()
  type: 'advance' | 'balance'
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: ['Confirmed', 'InTransit', 'Completed', 'Cancelled'] })
  @IsString()
  status: string
}

export class AddEwayBillDto {
  @ApiProperty({ example: '1234567890123' })
  @IsString()
  ewayBillNumber: string
}
