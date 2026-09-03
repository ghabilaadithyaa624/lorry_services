import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { CashfreeGateway } from './providers/cashfree.gateway'
import { RazorpayGateway } from './providers/razorpay.gateway'
import { StripeGateway } from './providers/stripe.gateway'

@Module({
  imports: [ConfigModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, CashfreeGateway, RazorpayGateway, StripeGateway],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
