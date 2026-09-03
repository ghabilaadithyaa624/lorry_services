import type { SubscriptionPlanId } from '@lorrycarry/shared'

export type ProviderId = 'cashfree' | 'razorpay' | 'stripe'

export interface CreateCheckoutInput {
  /** Local payment record id (uuid). */
  paymentId: string
  /** Gateway-facing order id (sub_<user>_<ts> or SUB_<uuid>). */
  orderId: string
  userId: string
  customerPhone: string
  customerName?: string | null
  plan: SubscriptionPlanId
  amount: number
  currency: string
  planLabel: string
}

export interface CheckoutSession {
  /** Opaque gateway session/order id the client needs to drive checkout. */
  gatewayOrderId: string
  /**
   * Provider-specific payload returned to the client:
   * - cashfree: { paymentSessionId }
   * - razorpay: { razorpayOrderId, keyId, amount, currency, name, description }
   * - stripe:   { sessionId, checkoutUrl }
   */
  payload: Record<string, unknown>
}

export interface VerifyResult {
  paid: boolean
  /** Gateway transaction/reference id (cf_payment_id, payment id, session id). */
  txnId?: string
  status?: string
  message?: string
}

/**
 * Common contract implemented by Cashfree / Razorpay / Stripe adapters so the
 * subscription engine can switch gateways without touching its flow.
 */
export interface PaymentGateway {
  readonly provider: ProviderId
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>
  /** Verify a payment server-side using the gateway order/session id. */
  verifyPayment(gatewayOrderId: string): Promise<VerifyResult>
}
