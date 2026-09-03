import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import {
  PaymentGateway,
  CreateCheckoutInput,
  CheckoutSession,
  VerifyResult,
} from './payment-gateway.interface'

/**
 * Cashfree PG adapter.
 * Docs: https://docs.cashfree.com/reference/pg
 */
@Injectable()
export class CashfreeGateway implements PaymentGateway {
  readonly provider = 'cashfree' as const
  private readonly logger = new Logger(CashfreeGateway.name)
  private readonly apiKey: string
  private readonly secretKey: string
  private readonly baseUrl: string
  private readonly clientUrl: string
  private readonly apiUrl: string
  private readonly headers: Record<string, string>

  constructor(private readonly config: ConfigService) {
    this.apiKey =
      config.get<string>('CASHFREE_API_KEY') || config.get<string>('CASHFREE_APP_ID') || ''
    this.secretKey = config.get<string>('CASHFREE_SECRET_KEY') || ''
    const env = config.get<string>('CASHFREE_ENV', 'sandbox')
    this.baseUrl =
      env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
    this.clientUrl = config.get<string>('CLIENT_URL') || 'http://localhost:3010'
    const rawApiUrl = config.get<string>('API_URL') || 'http://localhost:3002'
    this.apiUrl = rawApiUrl.replace(/\/api\/v1\/?$/, '')
    this.headers = {
      'x-client-id': this.apiKey,
      'x-client-secret': this.secretKey,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
    }
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const orderPayload = {
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: input.currency,
      customer_details: {
        customer_id: input.userId,
        customer_phone: input.customerPhone,
        customer_name: input.customerName || 'LorryCarry User',
      },
      order_meta: {
        return_url: `${this.clientUrl}/subscribe/callback?provider=cashfree&order_id={order_id}&payment_id=${input.paymentId}`,
        notify_url: `${this.apiUrl}/api/v1/subscriptions/webhook/cashfree`,
      },
      order_note: `LorryCarry ${input.planLabel} Subscription`,
    }

    try {
      const res = await axios.post(`${this.baseUrl}/orders`, orderPayload, {
        headers: this.headers,
      })
      this.logger.log(`Cashfree order created: ${res.data.order_id}`)
      return {
        gatewayOrderId: res.data.order_id || input.orderId,
        payload: { paymentSessionId: res.data.payment_session_id },
      }
    } catch (err: any) {
      this.logger.error('Cashfree order creation failed', err.response?.data || err.message)
      throw new Error('Cashfree order creation failed. Please try again later.')
    }
  }

  async verifyPayment(gatewayOrderId: string): Promise<VerifyResult> {
    try {
      const orderRes = await axios.get(`${this.baseUrl}/orders/${gatewayOrderId}`, {
        headers: this.headers,
      })
      const orderStatus: string = orderRes.data?.order_status || ''

      let paymentsData: any[] = []
      try {
        const paymentsRes = await axios.get(`${this.baseUrl}/orders/${gatewayOrderId}/payments`, {
          headers: this.headers,
        })
        paymentsData = Array.isArray(paymentsRes.data) ? paymentsRes.data : []
      } catch (pErr: any) {
        this.logger.warn(
          `Could not fetch payments list for order ${gatewayOrderId}: ${pErr.message}`,
        )
      }

      const successfulPayment = paymentsData.find((p: any) => p.payment_status === 'SUCCESS')
      const paymentStatus =
        successfulPayment?.payment_status ?? paymentsData[0]?.payment_status ?? orderStatus

      if (orderStatus === 'PAID' || successfulPayment) {
        return {
          paid: true,
          txnId: successfulPayment?.cf_payment_id?.toString() || undefined,
          status: paymentStatus,
        }
      }
      return { paid: false, status: paymentStatus || orderStatus }
    } catch (err: any) {
      this.logger.error(
        `Cashfree verification error for ${gatewayOrderId}:`,
        err.response?.data || err.message,
      )
      return { paid: false, status: 'UNKNOWN', message: 'Unable to verify with Cashfree' }
    }
  }
}
