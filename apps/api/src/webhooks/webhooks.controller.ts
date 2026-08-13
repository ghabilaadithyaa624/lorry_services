import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PaymentsService } from '../payments/payments.service'
import { GupshupService } from '../auth/gupshup.service'
import { CashfreeService } from '../payments/cashfree.service'
import { Public } from '../common/decorators/public.decorator'

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private paymentsService: PaymentsService,
    private gupshupService: GupshupService,
    private cashfreeService: CashfreeService,
  ) {}

  @Public()
  @Post('cashfree')
  async handleCashfreeWebhook(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    const isValid = this.cashfreeService.verifyWebhookSignature(payload, signature)
    if (!isValid) {
      throw new BadRequestException('Invalid or missing webhook signature')
    }

    const result = await this.paymentsService.handleWebhook(payload)
    
    // Send WhatsApp notification on success
    if (result.success && result.userId) {
      // Notification handled after subscription activation
    }

    return result
  }

  @Public()
  @Post('gupshup')
  async handleGupshupWebhook(@Body() payload: any) {
    // Handle WhatsApp delivery status
    await this.gupshupService.handleWebhook(payload)
    return { received: true }
  }
}
