import { IsString, IsIn, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class InitiateSubscriptionDto {
  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsString()
  @IsIn(['monthly', 'quarterly', 'annual'])
  plan: 'monthly' | 'quarterly' | 'annual'

  /** Optional gateway override; defaults to PAYMENT_PROVIDER env (cashfree). */
  @ApiPropertyOptional({ enum: ['cashfree', 'razorpay', 'stripe'] })
  @IsOptional()
  @IsString()
  @IsIn(['cashfree', 'razorpay', 'stripe'])
  provider?: 'cashfree' | 'razorpay' | 'stripe'
}
