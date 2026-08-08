import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import * as crypto from 'crypto'

export interface CreateOrderRequest {
  orderId: string
  amount: number
  customerId: string
  customerPhone: string
  customerName?: string
  description: string
}

export interface CreateOrderResponse {
  paymentSessionId: string
  orderId: string
  cfOrderId: string
}

/**
 * Cashfree Payment Service
 * Handles subscription payments and KYC verification
 * Docs: https://docs.cashfree.com/
 */
@Injectable()
export class CashfreeService {
  private readonly logger = new Logger(CashfreeService.name)
  private readonly baseUrl: string
  private readonly appId: string
  private readonly secretKey: string

  constructor(private config: ConfigService) {
    const isProd = config.get('NODE_ENV') === 'production'
    this.baseUrl = isProd 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg'
    this.appId = config.get('CASHFREE_APP_ID', '')
    this.secretKey = config.get('CASHFREE_SECRET_KEY', '')
  }

  /**
   * Create payment order for subscription
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    if (!this.appId || !this.secretKey) {
      this.logger.warn('Cashfree credentials not configured, proceeding in simulation/dev mode')
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          order_id: request.orderId,
          order_amount: request.amount,
          order_currency: 'INR',
          customer_details: {
            customer_id: request.customerId,
            customer_phone: request.customerPhone,
            customer_name: request.customerName || 'Customer',
          },
          order_meta: {
            return_url: `${this.config.get('CLIENT_URL', 'http://localhost:3000')}/payment/callback?order_id={order_id}`,
            notify_url: `${this.config.get('API_URL', 'http://localhost:3002/api/v1')}/webhooks/cashfree`,
          },
          order_note: request.description,
        },
        {
          headers: {
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
          },
        }
      )

      this.logger.log(`Cashfree order created: ${response.data.cf_order_id}`)

      return {
        paymentSessionId: response.data.payment_session_id,
        orderId: response.data.order_id,
        cfOrderId: response.data.cf_order_id,
      }
    } catch (error: any) {
      this.logger.error(`Cashfree order failed: ${error.response?.data?.message || error.message}`)
      throw new Error('Failed to create payment order')
    }
  }

  /**
   * Verify payment signature (for webhook security)
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    const secret = this.config.get('CASHFREE_WEBHOOK_SECRET', '')
    if (!secret) return true // Allow in dev environment if secret is unconfigured

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64')
    
    return signature === expectedSignature
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}`,
        {
          headers: {
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey,
            'x-api-version': '2023-08-01',
          },
        }
      )
      return response.data
    } catch (error: any) {
      this.logger.error(`Get order status failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Initiate KYC verification via DigiLocker
   */
  async initiateKyc(
    rcNumber: string,
    chassisNumber: string,
    callbackUrl: string
  ): Promise<{ referenceId: string; redirectUrl: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/verification/rc`,
        {
          rc_number: rcNumber,
          chassis_number: chassisNumber,
          callback_url: callbackUrl,
        },
        {
          headers: {
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey,
            'x-api-version': '2023-08-01',
          },
        }
      )

      return {
        referenceId: response.data.reference_id,
        redirectUrl: response.data.redirect_url,
      }
    } catch (error: any) {
      this.logger.error(`KYC initiation failed: ${error.message}`)
      throw new Error('Failed to initiate KYC verification')
    }
  }

  /**
   * Check KYC verification status
   */
  async getKycStatus(referenceId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/verification/rc/${referenceId}`,
        {
          headers: {
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey,
            'x-api-version': '2023-08-01',
          },
        }
      )
      return response.data
    } catch (error: any) {
      this.logger.error(`KYC status check failed: ${error.message}`)
      throw error
    }
  }
}
