import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  RawBodyRequest,
  Req,
  BadRequestException,
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
  @ApiOperation({ summary: 'Initiate subscription payment (Cashfree / Razorpay / Stripe)' })
  async initiate(
    @Body() dto: InitiateSubscriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.subscriptionsService.initiate(userId, dto.plan, dto.provider)
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get entitlement status incl. 3-month trial + countdown data' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getStatus(userId)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cashfree
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cashfree webhook — receives payment status notifications.
   * Public (no JwtAuthGuard) but signature-verified.
   */
  @Public()
  @Post('webhook/cashfree')
  @ApiOperation({ summary: 'Cashfree payment webhook (internal)' })
  async cashfreeWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const secretKey = this.config.get<string>('CASHFREE_SECRET_KEY') || ''
    const rawBody = req.rawBody?.toString() ?? ''

    const expectedSig = crypto
      .createHmac('sha256', secretKey)
      .update(`${timestamp}${rawBody}`)
      .digest('base64')

    if (!signature || signature !== expectedSig) {
      return { received: false, error: 'Invalid signature' }
    }

    const event = JSON.parse(rawBody)
    const { type, data } = event

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      await this.subscriptionsService.verifyAndActivate(
        data?.order?.order_id,
        data?.payment?.cf_payment_id?.toString(),
      )
    } else if (type === 'PAYMENT_FAILED_WEBHOOK') {
      await this.subscriptionsService.markFailed(
        data?.order?.order_id,
        data?.payment?.payment_message,
      )
    }

    return { received: true }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Razorpay
  // ─────────────────────────────────────────────────────────────────────────

  @Public()
  @Post('webhook/razorpay')
  @ApiOperation({ summary: 'Razorpay payment webhook (internal)' })
  async razorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() ?? ''
    const valid = this.subscriptionsService
      .getRazorpayGateway()
      .verifyWebhookSignature(rawBody, signature)
    if (!valid) {
      return { received: false, error: 'Invalid signature' }
    }

    const event = JSON.parse(rawBody)
    const entity = event?.payload?.payment?.entity || event?.payload?.order?.entity || {}

    if (event?.event === 'payment.captured' || event?.event === 'order.paid') {
      const orderId = entity.order_id || entity.id
      if (!orderId) throw new BadRequestException('Missing order id in webhook payload')
      await this.subscriptionsService.verifyAndActivate(orderId, entity.id)
    } else if (event?.event === 'payment.failed') {
      const orderId = entity.order_id || entity.id
      await this.subscriptionsService.markFailed(orderId, entity.error_description || 'Payment failed')
    }

    return { received: true }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stripe
  // ─────────────────────────────────────────────────────────────────────────

  @Public()
  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Stripe payment webhook (internal)' })
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() ?? ''
    let event: any
    try {
      event = this.subscriptionsService.getStripeGateway().constructEvent(rawBody, signature)
    } catch (err: any) {
      return { received: false, error: 'Invalid signature', message: err.message }
    }

    const session = event.data?.object || {}
    const orderId = session.id

    if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
      await this.subscriptionsService.verifyAndActivate(orderId, session.payment_intent?.toString())
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      await this.subscriptionsService.markFailed(orderId, `Stripe session ${event.type}`)
    }

    return { received: true }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Return-URL verification (all providers)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Return URL callback / verification endpoint — user lands here after the
   * gateway redirect. Frontend polls this to confirm payment + activate.
   */
  @Public()
  @Get('callback/:orderId')
  @ApiOperation({ summary: 'Verify payment after gateway redirect' })
  async callback(@Param('orderId') orderId: string) {
    return this.subscriptionsService.verifyOrder(orderId)
  }

  @Public()
  @Get('verify/:orderId')
  @ApiOperation({ summary: 'Verify payment by order ID (all providers)' })
  async verify(@Param('orderId') orderId: string) {
    return this.subscriptionsService.verifyOrder(orderId)
  }
}
