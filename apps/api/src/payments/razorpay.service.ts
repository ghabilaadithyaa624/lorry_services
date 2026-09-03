import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import crypto from 'crypto'

export class RazorpayError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message)
    this.name = 'RazorpayError'
  }
}

export interface CreateOrderRequest {
  amount: number // in paise (INR * 100)
  currency?: string
  receipt: string
  notes?: Record<string, string>
}

export interface CreateOrderResponse {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: 'created' | 'attempted' | 'captured'
  created_at: number
  notes?: Record<string, string>
}

export interface PaymentLinkRequest {
  amount: number
  currency?: string
  description: string
  customer: {
    name: string
    email?: string
    contact: string
  }
  notify?: {
    sms?: boolean
    email?: boolean
  }
  reminder_enable?: boolean
}

export interface PaymentLinkResponse {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  description: string
  short_url: string
  long_url: string
  created_at: number
}

/**
 * Razorpay Payment Gateway Service
 * Handles booking advance and balance payments
 * Docs: https://razorpay.com/docs/api/
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name)
  private readonly keyId: string
  private readonly keySecret: string
  private readonly baseUrl = 'https://api.razorpay.com/v1'

  constructor(private config: ConfigService) {
    this.keyId = this.config.get('RAZORPAY_KEY_ID', '')
    this.keySecret = this.config.get('RAZORPAY_KEY_SECRET', '')
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret)
  }

  /**
   * Generate Basic Auth header
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    return `Basic ${credentials}`
  }

  /**
   * Create a Razorpay order for booking payment
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    if (!this.isConfigured()) {
      this.logger.warn('Razorpay credentials not configured, proceeding in simulation mode')
      // Return mock order for development
      return {
        id: `order_sim_${Date.now()}`,
        entity: 'order',
        amount: request.amount,
        amount_paid: 0,
        amount_due: request.amount,
        currency: request.currency || 'INR',
        receipt: request.receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
        notes: request.notes,
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency || 'INR',
          receipt: request.receipt,
          notes: request.notes,
          partial_payment: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new RazorpayError(`Razorpay API error: ${error.error?.description || response.statusText}`, error)
      }

      const order = await response.json() as CreateOrderResponse
      this.logger.log(`Razorpay order created: ${order.id}`)
      return order
    } catch (error) {
      if (error instanceof RazorpayError) throw error
      this.logger.error('Failed to create Razorpay order', error)
      throw new InternalServerErrorException('Failed to create payment order')
    }
  }

  /**
   * Create a payment link for easier UPI/Card payments
   */
  async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    if (!this.isConfigured()) {
      this.logger.warn('Razorpay credentials not configured, proceeding in simulation mode')
      return {
        id: `plink_sim_${Date.now()}`,
        entity: 'payment_link',
        amount: request.amount,
        currency: request.currency || 'INR',
        status: 'created',
        description: request.description,
        short_url: `https://razorpay.com/simulate/${Date.now()}`,
        long_url: `https://razorpay.com/simulate/${Date.now()}`,
        created_at: Math.floor(Date.now() / 1000),
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/payment_links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency || 'INR',
          description: request.description,
          customer: request.customer,
          notify: request.notify || { sms: true, email: true },
          reminder_enable: request.reminder_enable ?? true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new RazorpayError(`Razorpay API error: ${error.error?.description || response.statusText}`, error)
      }

      const paymentLink = await response.json() as PaymentLinkResponse
      this.logger.log(`Razorpay payment link created: ${paymentLink.id}`)
      return paymentLink
    } catch (error) {
      if (error instanceof RazorpayError) throw error
      this.logger.error('Failed to create payment link', error)
      throw new InternalServerErrorException('Failed to create payment link')
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    if (!this.isConfigured()) {
      return {
        id: orderId,
        status: 'paid',
        amount: 0,
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      })

      if (!response.ok) {
        throw new RazorpayError(`Failed to get order: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      this.logger.error(`Failed to get order ${orderId}`, error)
      throw error
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = this.config.get('RAZORPAY_WEBHOOK_SECRET', '')
    
    if (!webhookSecret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not configured. Signature verification skipped.')
      return true
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error)
      return false
    }
  }

  /**
   * Process refund
   */
  async processRefund(paymentId: string, amount?: number, notes?: Record<string, string>): Promise<any> {
    if (!this.isConfigured()) {
      return {
        id: `refund_sim_${Date.now()}`,
        entity: 'refund',
        payment_id: paymentId,
        amount: amount || 0,
        status: 'processed',
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          amount,
          notes,
        }),
      })

      if (!response.ok) {
        throw new RazorpayError(`Refund failed: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      this.logger.error(`Failed to process refund for payment ${paymentId}`, error)
      throw error
    }
  }
}
