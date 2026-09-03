import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { CashfreeService } from './cashfree.service'
import { RazorpayService } from './razorpay.service'

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, CashfreeService, RazorpayService],
  exports: [PaymentsService, CashfreeService, RazorpayService],
})
export class PaymentsModule {}
