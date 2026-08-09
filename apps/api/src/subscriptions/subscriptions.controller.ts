import {
  Controller, Get, Post, Body, Param, Headers, UseGuards, RawBodyRequest, Req,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import * as crypto from 'crypto'
import { SubscriptionsService } from './subscriptions.service'
import { InitiateSubscriptionDto } from './dto/initiate-subscription.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly config: ConfigService,
  ) {}

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate subscription payment (returns Cashfree payment URL)' })
  async initiate(
    @Body() dto: InitiateSubscriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.subscriptionsService.initiate(userId, dto.plan)
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current subscription status' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getStatus(userId)
  }

  /**
   * Cashfree webhook — receives payment status notifications
   * Must be public (no JwtAuthGuard), but signature-verified
   */
  @Public()
  @Post('webhook/cashfree')
  @ApiOperation({ summary: 'Cashfree payment webhook (internal)' })
  async cashfreeWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Verify Cashfree webhook signature
    const secretKey = this.config.get<string>('CASHFREE_SECRET_KEY')
    const rawBody = req.rawBody?.toString() ?? ''
    const expectedSig = crypto
      .createHmac('sha256', secretKey)
      .update(`${timestamp}${rawBody}`)
      .digest('base64')

    if (signature !== expectedSig) {
      return { received: false, error: 'Invalid signature' }
    }

    const event = JSON.parse(rawBody)
    const { type, data } = event

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const { order } = data
      await this.subscriptionsService.verifyAndActivate(
        order.order_id,
        data.payment?.cf_payment_id?.toString(),
      )
    } else if (type === 'PAYMENT_FAILED_WEBHOOK') {
      const { order, payment } = data
      await this.subscriptionsService.markFailed(
        order.order_id,
        payment?.payment_message,
      )
    }

    return { received: true }
  }

  /**
   * Return URL callback / verification endpoint — user lands here after Cashfree redirect
   * Frontend polls this to confirm payment status and activate subscription
   */
  @Public()
  @Get('callback/:orderId')
  @ApiOperation({ summary: 'Verify payment after Cashfree redirect' })
  async callback(@Param('orderId') orderId: string) {
    return this.subscriptionsService.verifyOrder(orderId)
  }

  @Public()
  @Get('verify/:orderId')
  @ApiOperation({ summary: 'Verify payment by order ID' })
  async verify(@Param('orderId') orderId: string) {
    return this.subscriptionsService.verifyOrder(orderId)
  }
}
