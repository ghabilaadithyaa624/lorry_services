import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { prisma } from '@lorrycarry/database'
import axios from 'axios'

const PLAN_CONFIG = {
  monthly:   { price: 999,  durationDays: 30,  label: 'Monthly Unlimited' },
  quarterly: { price: 2499, durationDays: 90,  label: 'Quarterly Unlimited' },
  annual:    { price: 7999, durationDays: 365, label: 'Annual Unlimited' },
} as const

type PlanId = keyof typeof PLAN_CONFIG

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(private config: ConfigService) {}

  /**
   * Create a Cashfree payment order and return payment URL
   */
  async initiate(userId: string, plan: PlanId) {
    const planConfig = PLAN_CONFIG[plan]
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException('User not found')

    const orderId = `sub_${userId.slice(0, 8)}_${Date.now()}`
    const cashfreeApiKey = this.config.get<string>('CASHFREE_API_KEY') || this.config.get<string>('CASHFREE_APP_ID')
    const cashfreeSecretKey = this.config.get<string>('CASHFREE_SECRET_KEY')
    const cashfreeEnv = this.config.get<string>('CASHFREE_ENV', 'sandbox')
    const appUrl = this.config.get<string>('APP_URL') || this.config.get<string>('CLIENT_URL') || 'http://localhost:3010'
    const rawApiUrl = this.config.get<string>('API_URL') || 'http://localhost:3002'
    const apiUrl = rawApiUrl.replace(/\/api\/v1\/?$/, '')

    const baseUrl = cashfreeEnv === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg'

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: planConfig.price,
        currency: 'INR',
        purpose: 'subscription',
        status: 'Pending',
        provider: 'cashfree',
        providerOrderId: orderId,
        metadata: { plan, planLabel: planConfig.label },
      },
    })

    // Create Cashfree order
    const orderPayload = {
      order_id: orderId,
      order_amount: planConfig.price,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_phone: user.phone,
        customer_name: user.name || 'LorryCarry User',
      },
      order_meta: {
        return_url: `${appUrl}/subscribe/callback?order_id={order_id}&payment_id=${payment.id}`,
        notify_url: `${apiUrl}/api/v1/payments/webhook/cashfree`,
      },
      order_note: `LorryCarry ${planConfig.label} Subscription`,
    }

    try {
      const res = await axios.post(`${baseUrl}/orders`, orderPayload, {
        headers: {
          'x-client-id': cashfreeApiKey,
          'x-client-secret': cashfreeSecretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
      })

      this.logger.log(`Cashfree order created: ${JSON.stringify(res.data)}`)

      return {
        paymentSessionId: res.data.payment_session_id,
        orderId: res.data.order_id ?? orderId,
        paymentId: payment.id,
        amount: planConfig.price,
        plan,
      }
    } catch (err: any) {
      this.logger.error('Cashfree order creation failed', err.response?.data)
      throw new BadRequestException('Payment initiation failed. Please try again.')
    }
  }

  /**
   * Verify Cashfree order with Cashfree PG API and activate subscription
   * Used by return URL callback and polling verification
   */
  async verifyOrder(orderId: string) {
    this.logger.log(`Cashfree verification started: orderId=${orderId}`)

    // 1. Find local payment record
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: orderId },
    })

    if (!payment) {
      this.logger.warn(`Payment verification failed: orderId=${orderId} (record not found)`)
      return {
        status: 'FAILED',
        orderId,
        message: 'Payment record not found',
      }
    }

    // 2. Check if already marked Success & active subscription exists (Idempotency)
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { paymentId: payment.id },
          { userId: payment.userId, status: 'active', expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { expiresAt: 'desc' },
    })

    if (payment.status === 'Success' && existingSubscription) {
      this.logger.log(`Payment already verified and subscription active: orderId=${orderId}`)
      return {
        status: 'SUCCESS',
        orderId,
        paymentId: payment.id,
        hasSubscription: true,
        plan: existingSubscription.plan,
        expiresAt: existingSubscription.expiresAt,
      }
    }

    // 3. Query Cashfree Sandbox/Production API
    const cashfreeApiKey = this.config.get<string>('CASHFREE_API_KEY') || this.config.get<string>('CASHFREE_APP_ID')
    const cashfreeSecretKey = this.config.get<string>('CASHFREE_SECRET_KEY')
    const cashfreeEnv = this.config.get<string>('CASHFREE_ENV', 'sandbox')
    const baseUrl = cashfreeEnv === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg'

    const headers = {
      'x-client-id': cashfreeApiKey,
      'x-client-secret': cashfreeSecretKey,
      'x-api-version': '2023-08-01',
    }

    try {
      // Get order details from Cashfree
      const orderRes = await axios.get(`${baseUrl}/orders/${orderId}`, { headers })
      const orderStatus = orderRes.data?.order_status
      this.logger.log(`Cashfree order status: orderId=${orderId} status=${orderStatus}`)

      // Get payments list for order from Cashfree
      let paymentsData: any[] = []
      try {
        const paymentsRes = await axios.get(`${baseUrl}/orders/${orderId}/payments`, { headers })
        paymentsData = Array.isArray(paymentsRes.data) ? paymentsRes.data : []
      } catch (pErr: any) {
        this.logger.warn(`Could not fetch payments list for order ${orderId}: ${pErr.message}`)
      }

      const successfulPayment = paymentsData.find((p: any) => p.payment_status === 'SUCCESS')
      const paymentStatus = successfulPayment?.payment_status ?? paymentsData[0]?.payment_status ?? orderStatus

      this.logger.log(`Cashfree payment status: orderId=${orderId} paymentStatus=${paymentStatus}`)

      // If order is PAID or any payment attempt SUCCEEDED
      if (orderStatus === 'PAID' || successfulPayment) {
        const txnId = successfulPayment?.cf_payment_id?.toString() || orderRes.data?.cf_order_id?.toString() || orderId
        const activationResult = await this.verifyAndActivate(orderId, txnId)

        return {
          status: 'SUCCESS',
          orderId,
          paymentId: payment.id,
          hasSubscription: true,
          plan: (payment.metadata as any)?.plan,
          expiresAt: activationResult.expiresAt,
        }
      }

      // If order is still ACTIVE / pending
      if (orderStatus === 'ACTIVE') {
        return {
          status: 'PENDING',
          orderId,
          message: 'Payment is being processed by Cashfree',
        }
      }

      // If order is EXPIRED / TERMINATED / CANCELLED
      if (['EXPIRED', 'TERMINATED', 'CANCELLED'].includes(orderStatus)) {
        await this.markFailed(orderId, `Cashfree order status: ${orderStatus}`)
        this.logger.warn(`Payment verification failed: orderId=${orderId} status=${orderStatus}`)
        return {
          status: 'FAILED',
          orderId,
          message: `Payment failed (${orderStatus})`,
        }
      }

      return {
        status: 'PENDING',
        orderId,
        message: 'Payment status pending',
      }
    } catch (err: any) {
      this.logger.error(`Payment verification error: orderId=${orderId}`, err.response?.data || err.message)
      return {
        status: 'PENDING',
        orderId,
        message: 'Unable to verify payment with Cashfree at this time',
      }
    }
  }

  /**
   * Verify Cashfree payment and activate subscription
   * Called from webhook or return URL verification
   */
  async verifyAndActivate(orderId: string, cashfreeTxnId: string) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: orderId },
    })
    if (!payment) throw new BadRequestException('Payment record not found')

    // Idempotency: check if subscription already exists for this payment
    const existingSubscription = await prisma.subscription.findFirst({
      where: { paymentId: payment.id },
    })
    if (existingSubscription) {
      this.logger.log(`Subscription already exists for paymentId=${payment.id}, skipping creation`)
      return { activated: true, expiresAt: existingSubscription.expiresAt }
    }

    const plan = (payment.metadata as any)?.plan as PlanId
    const planConfig = PLAN_CONFIG[plan] || PLAN_CONFIG.monthly

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + planConfig.durationDays)

    this.logger.log(`Subscription activation started: userId=${payment.userId} plan=${plan}`)

    // Update payment + create subscription atomically
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'Success',
          providerTxnId: cashfreeTxnId,
          paidAt: now,
        },
      }),
      prisma.subscription.create({
        data: {
          userId: payment.userId,
          plan,
          status: 'active',
          startedAt: now,
          expiresAt,
          paymentId: payment.id,
        },
      }),
    ])

    this.logger.log(`Subscription activated: userId=${payment.userId} plan=${plan} expires=${expiresAt.toISOString()}`)
    return { activated: true, expiresAt }
  }

  /**
   * Mark payment as failed
   */
  async markFailed(orderId: string, reason?: string) {
    await prisma.payment.updateMany({
      where: { providerOrderId: orderId, status: 'Pending' },
      data: { status: 'Failed', failureReason: reason },
    })
  }

  /**
   * Get current subscription status for user
   */
  async getStatus(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'active', expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    })
    return {
      hasSubscription: !!subscription,
      plan: subscription?.plan ?? null,
      expiresAt: subscription?.expiresAt ?? null,
    }
  }
}
