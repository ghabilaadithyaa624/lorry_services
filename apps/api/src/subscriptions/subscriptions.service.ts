import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { prisma } from '@lorrycarry/database'
import axios from 'axios'

const PLAN_CONFIG = {
  monthly:   { price: 999,  durationDays: 30,  label: 'Monthly Unlimited' },
  quarterly: { price: 2499, durationDays: 90,  label: 'Quarterly Unlimited' },
  annual:    { price: 7999, durationDays: 365, label: 'Annual Unlimited' },
} as const

/** The no-cost entitlement created atomically during first-time registration. */
export const FREE_TRIAL_PLAN = 'free_trial'
export const FREE_TRIAL_DURATION_DAYS = 90

type PlanId = keyof typeof PLAN_CONFIG

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly cashfree: CashfreeGateway,
    private readonly razorpay: RazorpayGateway,
    private readonly stripe: StripeGateway,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Trial lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Idempotently ensure the user holds a one-time 90-day free trial.
   * - New accounts are granted a trial at registration (AuthService) AND here,
   *   lazily, so pre-existing accounts also receive it on first lookup.
   * - Accounts that already made a subscription payment are never given a trial.
   */
  async ensureTrial(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, trialStartedAt: true, trialEndsAt: true },
    })
    if (!user) throw new BadRequestException('User not found')
    if (user.trialStartedAt) return user

    const hasEverSubscribed = await prisma.subscription.findFirst({
      where: { userId },
      select: { id: true },
    })
    if (hasEverSubscribed) return user

    const now = new Date()
    const trialEndsAt = new Date(now)
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { trialStartedAt: now, trialEndsAt },
      select: { id: true, trialStartedAt: true, trialEndsAt: true },
    })
    this.logger.log(`Trial activated for user=${userId} until=${trialEndsAt.toISOString()}`)
    return updated
  }

  /**
   * Full entitlement snapshot for the dashboard paywall + countdown timer.
   * Auto-grants the 3-month trial on first call.
   */
  async getStatus(userId: string): Promise<SubscriptionEntitlement> {
    const now = new Date()

    const trial = await this.ensureTrial(userId)

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'active', expiresAt: { gt: now } },
      orderBy: { expiresAt: 'desc' },
    })

    const hasSubscription = !!subscription
    const trialActive =
      !!trial.trialStartedAt &&
      !!trial.trialEndsAt &&
      trial.trialEndsAt.getTime() > now.getTime() &&
      !hasSubscription

    const hasPremiumAccess = hasSubscription || trialActive
    const trialDaysRemaining = trial.trialEndsAt
      ? Math.max(0, Math.ceil((trial.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : 0

    const status: SubscriptionEntitlement['status'] = hasSubscription
      ? 'active'
      : trialActive
        ? 'trial'
        : 'expired'

    return {
      status,
      hasSubscription,
      hasPremiumAccess,
      isTrialActive: trialActive,
      plan: hasSubscription ? (subscription.plan as SubscriptionPlanId) : null,
      expiresAt: subscription?.expiresAt?.toISOString() ?? null,
      trialStartedAt: trial.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: trial.trialEndsAt?.toISOString() ?? null,
      trialDaysRemaining,
      trialDurationDays: TRIAL_DURATION_DAYS,
      upgradeRequired: !hasPremiumAccess,
      upgradeReason: hasSubscription ? null : trialActive ? null : 'trial_expired',
    }
  }

  /** True when the user may use premium features (paid subscription OR trial). */
  async hasPremiumAccess(userId: string): Promise<boolean> {
    const entitlement = await this.getStatus(userId)
    return entitlement.hasPremiumAccess
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-provider checkout initiation
  // ─────────────────────────────────────────────────────────────────────────

  private gatewayFor(provider?: string): PaymentGateway {
    const requested = provider || this.config.get<string>('PAYMENT_PROVIDER') || 'cashfree'
    switch (requested) {
      case 'cashfree':
        return this.cashfree
      case 'razorpay':
        return this.razorpay
      case 'stripe':
        return this.stripe
      default:
        throw new BadRequestException(`Unsupported payment provider: ${requested}`)
    }
  }

  /**
   * Create a payment record + gateway checkout session and return the
   * provider-specific payload the frontend needs to open checkout.
   */
  async initiate(userId: string, plan: SubscriptionPlanId, provider?: ProviderId) {
    const planConfig = SUBSCRIPTION_PLANS[plan]
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException('User not found')

    const gateway = this.gatewayFor(provider)
    const clientOrderId = `sub_${userId.slice(0, 8)}_${Date.now()}`

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: planConfig.price,
        currency: 'INR',
        purpose: 'subscription',
        status: 'Pending',
        provider: gateway.provider,
        providerOrderId: clientOrderId,
        metadata: {
          plan,
          planLabel: planConfig.label,
          provider: gateway.provider,
          clientOrderId,
        },
      },
    })

    const session = await gateway.createCheckoutSession({
      paymentId: payment.id,
      orderId: clientOrderId,
      userId,
      customerPhone: user.phone,
      customerName: user.name,
      plan,
      amount: planConfig.price,
      currency: 'INR',
      planLabel: planConfig.label,
    })

    // Persist the gateway-specific order/session id for webhooks + verify.
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: session.gatewayOrderId,
        metadata: {
          plan,
          planLabel: planConfig.label,
          provider: gateway.provider,
          clientOrderId,
          gatewayOrderId: session.gatewayOrderId,
        },
      },
    })

    return {
      provider: gateway.provider,
      paymentId: payment.id,
      orderId: session.gatewayOrderId,
      amount: planConfig.price,
      plan,
      checkout: session.payload,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Verification & activation (shared by return-URL polling + webhooks)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verify a gateway order (server-side) and activate the subscription.
   * Returns SUCCESS / PENDING / FAILED for the callback polling page.
   */
  async verifyOrder(gatewayOrderId: string) {
    this.logger.log(`Subscription verification started: orderId=${gatewayOrderId}`)

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: gatewayOrderId },
    })
    if (!payment) {
      this.logger.warn(`Payment verification failed (record not found): ${gatewayOrderId}`)
      return { status: 'FAILED', orderId: gatewayOrderId, message: 'Payment record not found' }
    }

    // Idempotent short-circuit
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
      this.logger.log(`Payment already verified and subscription active: ${gatewayOrderId}`)
      return {
        status: 'SUCCESS',
        orderId: gatewayOrderId,
        paymentId: payment.id,
        hasSubscription: true,
        plan: existingSubscription.plan,
        expiresAt: existingSubscription.expiresAt,
      }
    }

    const gateway = this.gatewayFor(payment.provider)
    const result = await gateway.verifyPayment(gatewayOrderId)

    if (result.paid) {
      const activationResult = await this.verifyAndActivate(gatewayOrderId, result.txnId)
      return {
        status: 'SUCCESS',
        orderId: gatewayOrderId,
        paymentId: payment.id,
        hasSubscription: true,
        plan: (payment.metadata as any)?.plan,
        expiresAt: activationResult.expiresAt,
      }
    }

    const failed = ['expired', 'expired_at', 'failed', 'failure', 'cancelled', 'canceled', 'terminated']
    if (failed.includes((result.status || '').toLowerCase())) {
      await this.markFailed(gatewayOrderId, `Gateway order status: ${result.status}`)
      return { status: 'FAILED', orderId: gatewayOrderId, message: `Payment failed (${result.status})` }
    }

    return {
      status: 'PENDING',
      orderId: gatewayOrderId,
      message: result.message || 'Payment status pending',
    }
  }

  /**
   * Activate a subscription atomically after the gateway independently
   * confirms payment success (webhook OR server-side verification).
   */
  async verifyAndActivate(gatewayOrderId: string, txnId?: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { providerOrderId: gatewayOrderId },
      })
      if (!payment) throw new BadRequestException('Payment record not found')

      const existingSubscription = await tx.subscription.findFirst({
        where: { paymentId: payment.id },
      })
      if (existingSubscription) {
        this.logger.log(`Subscription already exists for paymentId=${payment.id}; skipping`)
        return { activated: true, expiresAt: existingSubscription.expiresAt }
      }

      const metadata = (payment.metadata as any) || {}
      const plan = (metadata.plan as SubscriptionPlanId) || 'monthly'
      const planConfig = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.monthly
      const provider = (payment.provider || 'cashfree') as ProviderId

      const now = new Date()
      const expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + planConfig.durationDays)

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'Success', providerTxnId: txnId || null, paidAt: now },
      })

      // A paid pass supersedes the onboarding trial. Keeping this explicit
      // prevents the longer trial expiry from masking a paid plan in account UI.
      await tx.subscription.updateMany({
        where: {
          userId: payment.userId,
          plan: FREE_TRIAL_PLAN,
          status: 'active',
        },
        data: { status: 'cancelled' },
      })

      // Create active subscription within transaction
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          plan,
          status: 'active',
          startedAt: now,
          expiresAt,
          paymentId: payment.id,
          provider,
          providerOrderId: gatewayOrderId,
        },
      })

      // Mark the one-time trial as converted so it can never be re-issued.
      await tx.user.updateMany({
        where: { id: payment.userId, trialConvertedAt: null },
        data: { trialConvertedAt: now },
      })

      this.logger.log(
        `Subscription activated: user=${payment.userId} plan=${plan} provider=${provider} expires=${expiresAt.toISOString()}`,
      )
      return { activated: true, expiresAt }
    })
  }

  async markFailed(gatewayOrderId: string, reason?: string) {
    await prisma.payment.updateMany({
      where: { providerOrderId: gatewayOrderId, status: 'Pending' },
      data: { status: 'Failed', failureReason: reason },
    })
  }

  /**
   * Get the current entitlement, including an actionable free-trial countdown.
   *
   * A paid pass is deliberately preferred if it overlaps a trial (for example,
   * when a new operator upgrades early). `hasSubscription` remains the single
   * boolean used by the marketplace's existing access checks.
   */
  async getStatus(userId: string) {
    const now = new Date()
    const activeWhere = { userId, status: 'active' as const, expiresAt: { gt: now } }

    const paidSubscription = await prisma.subscription.findFirst({
      where: { ...activeWhere, plan: { not: FREE_TRIAL_PLAN } },
      orderBy: { expiresAt: 'desc' },
    })
    const subscription = paidSubscription ?? await prisma.subscription.findFirst({
      where: activeWhere,
      orderBy: { expiresAt: 'desc' },
    })

    const isTrial = subscription?.plan === FREE_TRIAL_PLAN
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const trialDaysLeft = isTrial && subscription
      ? Math.max(0, Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / millisecondsPerDay))
      : null
    const trialDaysUsed = isTrial && subscription
      ? Math.min(
          FREE_TRIAL_DURATION_DAYS,
          Math.max(0, Math.floor((now.getTime() - subscription.startedAt.getTime()) / millisecondsPerDay)),
        )
      : null
    const trialProgressPercent = isTrial && trialDaysLeft !== null
      ? Math.max(0, Math.min(100, Math.round((trialDaysLeft / FREE_TRIAL_DURATION_DAYS) * 100)))
      : null

    return {
      hasSubscription: !!subscription,
      plan: subscription?.plan ?? null,
      startedAt: subscription?.startedAt ?? null,
      expiresAt: subscription?.expiresAt ?? null,
      isTrial,
      trialDaysTotal: isTrial ? FREE_TRIAL_DURATION_DAYS : null,
      trialDaysLeft,
      trialDaysUsed,
      trialProgressPercent,
      canUpgrade: isTrial,
    }
  }
}
