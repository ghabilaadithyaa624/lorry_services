import { Injectable, Logger } from '@nestjs/common'
import { prisma, PaymentPurpose, PaymentStatus, SubscriptionStatus } from '@lorrycarry/database'
import { CashfreeService } from './cashfree.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(private cashfree: CashfreeService) {}

  /**
   * Create subscription payment order
   */
  async createSubscriptionOrder(
    userId: string,
    plan: string,
    amount: number
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const orderId = `SUB_${uuidv4().slice(0, 8).toUpperCase()}`

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'INR',
        purpose: PaymentPurpose.subscription,
        status: PaymentStatus.Pending,
        provider: 'cashfree',
        providerOrderId: orderId,
      },
    })

    // Create Cashfree order
    const order = await this.cashfree.createOrder({
      orderId,
      amount,
      customerId: userId,
      customerPhone: user.phone,
      customerName: user.name || undefined,
      description: `LorryCarry ${plan} Subscription`,
    })

    // Update payment with Cashfree order ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerTxnId: order.cfOrderId },
    })

    return {
      paymentId: payment.id,
      paymentSessionId: order.paymentSessionId,
      orderId: order.orderId,
    }
  }

  /**
   * Handle Cashfree webhook
   */
  async handleWebhook(payload: any) {
    const data = payload?.data || payload
    const order_id = data?.order_id || data?.order?.order_id
    const order_status = data?.order_status || data?.order?.order_status
    const payment_details = data?.payment_details || []

    if (!order_id) {
      this.logger.warn('Webhook payload missing order_id')
      return { success: false, message: 'Invalid payload' }
    }

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: order_id },
      include: { user: true },
    })

    if (!payment) {
      this.logger.error(`Payment not found for order_id: ${order_id}`)
      throw new Error('Payment not found')
    }

    if (order_status === 'PAID') {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.Success,
          paidAt: new Date(),
          providerTxnId: payment_details[0]?.payment_message || payment.providerTxnId,
        },
      })

      // Activate subscription
      const subscriptionEnd = new Date()
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1) // 1 month subscription

      await prisma.subscription.create({
        data: {
          userId: payment.userId,
          plan: 'monthly_unlimited',
          status: SubscriptionStatus.active,
          startedAt: new Date(),
          expiresAt: subscriptionEnd,
          paymentId: payment.id,
        },
      })

      return { success: true, message: 'Subscription activated', userId: payment.userId }
    } else if (order_status === 'FAILED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.Failed,
          failureReason: payment_details[0]?.payment_message || 'Payment processing failed',
        },
      })

      return { success: false, message: 'Payment failed' }
    }

    return { success: false, message: `Status handled: ${order_status}` }
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
