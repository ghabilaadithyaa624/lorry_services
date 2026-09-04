import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import {
  PaymentGateway,
  CreateCheckoutInput,
  CheckoutSession,
  VerifyResult,
} from './payment-gateway.interface'

/**
 * Stripe adapter using the official SDK.
 * Uses one-time Checkout Sessions (mode: payment) so the existing
 * `Subscription.startedAt/expiresAt` billing model stays unchanged.
 * Docs: https://docs.stripe.com/api/checkout/sessions
 */
@Injectable()
export class StripeGateway implements PaymentGateway {
  readonly provider = 'stripe' as const
  private readonly logger = new Logger(StripeGateway.name)
  private readonly client: Stripe
  private readonly clientUrl: string
  private readonly apiUrl: string

  constructor(private readonly config: ConfigService) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY') || ''
    if (!secretKey) {
      this.logger.warn(
        'Stripe credentials not configured. Set STRIPE_SECRET_KEY (checkout calls will fail until then).',
      )
    }
    // SDK throws on an empty key; use a dev placeholder so the app still boots
    // with the default Cashfree gateway.
    this.client = new Stripe(secretKey || 'sk_test_dev')
    this.clientUrl = config.get<string>('CLIENT_URL') || 'http://localhost:3010'
    const rawApiUrl = config.get<string>('API_URL') || 'http://localhost:3002'
    this.apiUrl = rawApiUrl.replace(/\/api\/v1\/?$/, '')
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: Math.round(input.amount * 100),
            product_data: {
              name: `LorryCarry ${input.planLabel}`,
              description: `LorryCarry premium marketplace access — ${input.planLabel}`,
            },
          },
        },
      ],
      metadata: {
        userId: input.userId,
        plan: input.plan,
        paymentId: input.paymentId,
        orderId: input.orderId,
      },
      success_url: `${this.clientUrl}/subscribe/callback?provider=stripe&order_id={CHECKOUT_SESSION_ID}&payment_id=${input.paymentId}`,
      cancel_url: `${this.clientUrl}/subscribe?provider=stripe&canceled=1`,
      // Stripe supports email only; phone is required for LorryCarry and will
      // not be sent to Stripe to avoid exposing PII.
      locale: 'auto',
    })

    this.logger.log(`Stripe Checkout Session created: ${session.id}`)
    return {
      gatewayOrderId: session.id,
      payload: {
        sessionId: session.id,
        checkoutUrl: session.url,
        currency: 'inr',
        amount: input.amount,
      },
    }
  }

  async verifyPayment(gatewayOrderId: string): Promise<VerifyResult> {
    try {
      const session = await this.client.checkout.sessions.retrieve(gatewayOrderId)
      if (session.payment_status === 'paid') {
        return {
          paid: true,
          txnId: session.payment_intent?.toString() || session.id,
          status: session.payment_status,
        }
      }
      return { paid: false, status: session.payment_status || session.status || 'UNKNOWN' }
    } catch (err: any) {
      this.logger.error(`Stripe verification error for ${gatewayOrderId}:`, err.message)
      return { paid: false, status: 'UNKNOWN', message: 'Unable to verify with Stripe' }
    }
  }

  /**
   * Verify + parse a Stripe webhook. Returns the typed event so the caller can
   * dispatch on `event.type`. Throws when the signature is invalid.
   */
  constructEvent(rawBody: Buffer | string, signature: string | undefined): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') || ''
    if (!secret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured; rejecting unsigned webhook')
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }
    return this.client.webhooks.constructEvent(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
      signature || '',
      secret,
    )
  }
}
