import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { CashfreeService } from './cashfree.service'

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, CashfreeService],
  exports: [PaymentsService, CashfreeService],
})
export class PaymentsModule {}
