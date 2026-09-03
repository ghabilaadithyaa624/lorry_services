import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum MatchStatusDto {
  Pending = 'Pending',
  Booked = 'Booked',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export class UpdateMatchStatusDto {
  @ApiProperty({ enum: MatchStatusDto, example: 'Booked' })
  @IsEnum(MatchStatusDto)
  status: MatchStatusDto

  @ApiProperty({ example: 'booking-uuid', required: false, description: 'Link booking when status becomes Booked' })
  @IsOptional()
  @IsString()
  bookingId?: string
}
