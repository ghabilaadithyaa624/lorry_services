import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator'
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
  @Min(1)
  agreedPrice: number

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  liabilityAccepted?: boolean
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
