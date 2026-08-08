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
    const cashfreeApiKey = this.config.get<string>('CASHFREE_API_KEY')
    const cashfreeSecretKey = this.config.get<string>('CASHFREE_SECRET_KEY')
    const cashfreeEnv = this.config.get<string>('CASHFREE_ENV', 'sandbox')
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001')

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
        notify_url: `${appUrl.replace('3001', '3002')}/api/v1/payments/webhook/cashfree`,
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

      return {
        paymentUrl: res.data.payment_link,
        orderId,
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
   * Verify Cashfree payment and activate subscription
   * Called from webhook or return URL verification
   */
  async verifyAndActivate(orderId: string, cashfreeTxnId: string) {
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: orderId },
    })
    if (!payment) throw new BadRequestException('Payment record not found')

    const plan = (payment.metadata as any)?.plan as PlanId
    const planConfig = PLAN_CONFIG[plan]

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + planConfig.durationDays)

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
