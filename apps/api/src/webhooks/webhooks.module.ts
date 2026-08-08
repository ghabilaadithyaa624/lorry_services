import { Module } from '@nestjs/common'
import { WebhooksController } from './webhooks.controller'
import { PaymentsModule } from '../payments/payments.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PaymentsModule, AuthModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
