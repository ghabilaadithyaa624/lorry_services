import { IsString, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class InitiateSubscriptionDto {
  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsString()
  @IsIn(['monthly', 'quarterly', 'annual'])
  plan: 'monthly' | 'quarterly' | 'annual'
}
