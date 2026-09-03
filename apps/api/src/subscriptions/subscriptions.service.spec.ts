import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { SubscriptionsService } from './subscriptions.service'
import { CashfreeGateway } from './providers/cashfree.gateway'
import { RazorpayGateway } from './providers/razorpay.gateway'
import { StripeGateway } from './providers/stripe.gateway'
import { prisma } from '@lorrycarry/database'
import axios from 'axios'

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    payment: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    subscription: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}))
jest.mock('axios')

describe('SubscriptionsService (Entitlement + Trial)', () => {
  let service: SubscriptionsService
  const mockGateway = {
    provider: 'cashfree',
    createCheckoutSession: jest.fn(),
    verifyPayment: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CashfreeGateway, useValue: mockGateway },
        { provide: RazorpayGateway, useValue: { provider: 'razorpay' } },
        { provide: StripeGateway, useValue: { provider: 'stripe' } },
      ],
    }).compile()

    service = module.get<SubscriptionsService>(SubscriptionsService)
  })

  describe('getStatus (3-month trial)', () => {
    it('should lazily grant a 90-day trial to accounts without a trial or payment', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: null,
        trialEndsAt: null,
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 90 * 86400000),
      })

      const res = await service.getStatus('user-1')

      expect(res.status).toBe('trial')
      expect(res.isTrialActive).toBe(true)
      expect(res.hasPremiumAccess).toBe(true)
      expect(res.hasSubscription).toBe(false)
      expect(res.trialDaysRemaining).toBe(90)
      expect(res.upgradeRequired).toBe(false)
    })

    it('should not re-issue the trial once granted', async () => {
      const started = new Date()
      const ends = new Date(Date.now() + 5 * 86400000)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: started,
        trialEndsAt: ends,
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const res = await service.getStatus('user-1')

      expect(res.status).toBe('trial')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should report expired after the trial ends (upgrade CTA)', async () => {
      const started = new Date(Date.now() - 100 * 86400000)
      const ends = new Date(Date.now() - 10 * 86400000)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: started,
        trialEndsAt: ends,
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const res = await service.getStatus('user-1')

      expect(res.status).toBe('expired')
      expect(res.isTrialActive).toBe(false)
      expect(res.hasPremiumAccess).toBe(false)
      expect(res.upgradeRequired).toBe(true)
      expect(res.upgradeReason).toBe('trial_expired')
    })

    it('should prioritize an active paid subscription over the trial', async () => {
      const expiresAt = new Date(Date.now() + 20 * 86400000)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 10 * 86400000),
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: 'quarterly',
        expiresAt,
      })

      const res = await service.getStatus('user-1')

      expect(res.status).toBe('active')
      expect(res.hasSubscription).toBe(true)
      expect(res.hasPremiumAccess).toBe(true)
      expect(res.plan).toBe('quarterly')
    })

    it('should return inactive subscription if expired or missing', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-2',
        trialStartedAt: null,
        trialEndsAt: null,
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-2',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 90 * 86400000),
      })

      const res = await service.getStatus('user-2')
      expect(res.status).toBe('trial')
    })
  })

  describe('verifyAndActivate (multi-provider activation)', () => {
    it('should activate the subscription and mark the trial as converted', async () => {
      ;(prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: 'Pending',
        provider: 'razorpay',
        metadata: { plan: 'quarterly', planLabel: 'Quarterly Unlimited' },
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.payment.update as jest.Mock).mockResolvedValue({})
      ;(prisma.subscription.create as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        expiresAt: new Date(),
      })

      const result = await service.verifyAndActivate('ord_razorpay_1', 'pay_xyz')

      expect(result.activated).toBe(true)
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            plan: 'quarterly',
            provider: 'razorpay',
            providerOrderId: 'ord_razorpay_1',
            paymentId: 'pay-1',
          }),
        }),
      )
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { trialConvertedAt: expect.any(Date) },
        }),
      )
    })

    it('should return the free-trial countdown for a new operator', async () => {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 89 * 24 * 60 * 60 * 1000)
      // First query has no paid pass; the second finds the onboarding trial.
      ;(prisma.subscription.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          plan: 'free_trial',
          startedAt: now,
          expiresAt,
        })

      const res = await service.getStatus('user-1')
      expect(res.hasSubscription).toBe(true)
      expect(res.isTrial).toBe(true)
      expect(res.trialDaysTotal).toBe(90)
      expect(res.trialDaysLeft).toBeGreaterThan(0)
      expect(res.canUpgrade).toBe(true)
    })
  })

  describe('Contact Reveal Protection', () => {
    it('should allow contact reveal for active subscriptions', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: null,
        trialEndsAt: null,
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: 'monthly',
        expiresAt: new Date(Date.now() + 86400000),
      })

      const status = await service.getStatus('user-1')
      expect(status.hasPremiumAccess).toBe(true)
    })

    it('should block contact reveal after trial + subscription expiry', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        trialStartedAt: new Date(Date.now() - 200 * 86400000),
        trialEndsAt: new Date(Date.now() - 100 * 86400000),
      })
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const status = await service.getStatus('user-1')
      expect(status.hasPremiumAccess).toBe(false)
    })
  })
})
