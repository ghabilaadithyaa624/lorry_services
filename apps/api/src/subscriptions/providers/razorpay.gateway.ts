import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Razorpay = require('razorpay')
import * as crypto from 'crypto'
import {
  PaymentGateway,
  CreateCheckoutInput,
  CheckoutSession,
  VerifyResult,
} from './payment-gateway.interface'

/**
 * Razorpay adapter using the official Node SDK.
 * Razorpay amounts are always in the smallest currency unit (paise).
 * Docs: https://razorpay.com/docs/api/orders/
 */
@Injectable()
export class RazorpayGateway implements PaymentGateway {
  readonly provider = 'razorpay' as const
  private readonly logger = new Logger(RazorpayGateway.name)
  private readonly client: Razorpay
  private readonly keyId: string

  constructor(private readonly config: ConfigService) {
    this.keyId = config.get<string>('RAZORPAY_KEY_ID') || ''
    const keySecret = config.get<string>('RAZORPAY_KEY_SECRET') || ''
    if (!this.keyId || !keySecret) {
      this.logger.warn(
        'Razorpay credentials not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (checkout calls will fail until then).',
      )
    }
    // SDK requires non-empty values at construction; use dev placeholders so the
    // app still boots with the default Cashfree gateway.
    this.client = new Razorpay({
      key_id: this.keyId || 'rzp_test_dev',
      key_secret: keySecret || 'rzp_dev_secret',
    })
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    try {
      const order = await this.client.orders.create({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.orderId,
        notes: {
          plan: input.plan,
          userId: input.userId,
          paymentId: input.paymentId,
        },
      })

      this.logger.log(`Razorpay order created: ${order.id} (${order.receipt})`)
      return {
        gatewayOrderId: order.id,
        payload: {
          razorpayOrderId: order.id,
          keyId: this.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'LorryCarry',
          description: `LorryCarry ${input.planLabel} Subscription`,
        },
      }
    } catch (err: any) {
      this.logger.error('Razorpay order creation failed', err.error?.description || err.message)
      throw new Error(
        `Razorpay order creation failed: ${err.error?.description || err.message || 'unknown error'}`,
      )
    }
  }

  async verifyPayment(gatewayOrderId: string): Promise<VerifyResult> {
    try {
      const order = await this.client.orders.fetch(gatewayOrderId)
      if (order.status === 'paid') {
        let txnId: string | undefined
        try {
          const payments = await this.client.orders.fetchPayments(gatewayOrderId)
          txnId = payments.items?.[0]?.id
        } catch (pErr: any) {
          this.logger.warn(`Could not fetch Razorpay payments for ${gatewayOrderId}: ${pErr.message}`)
        }
        return { paid: true, txnId, status: order.status }
      }
      return { paid: false, status: order.status }
    } catch (err: any) {
      this.logger.error(
        `Razorpay verification error for ${gatewayOrderId}:`,
        err.error?.description || err.message,
      )
      return { paid: false, status: 'UNKNOWN', message: 'Unable to verify with Razorpay' }
    }
  }

  /** HMAC-SHA256 (hex) verification of Razorpay webhook payloads. */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')
    if (!secret) {
      // Never accept unsigned webhooks in production.
      if (this.config.get<string>('NODE_ENV') === 'production') return false
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not configured; skipping signature check in dev')
      return true
    }
    if (!signature) return false

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const received = signature.toLowerCase()
    if (expected.length !== received.length) return false

    // Constant-time comparison
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ received.charCodeAt(i)
    }
    return diff === 0
  }
}
