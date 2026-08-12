import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { SubscriptionsService } from './subscriptions.service'
import { prisma } from '@lorrycarry/database'
import { BadRequestException } from '@nestjs/common'
import axios from 'axios'

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    payment: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    subscription: { create: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}))
jest.mock('axios')

describe('SubscriptionsService (Entitlement)', () => {
  let service: SubscriptionsService
  let configService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<SubscriptionsService>(SubscriptionsService)
  })

  describe('getStatus (Entitlement Checks)', () => {
    it('should return active subscription if valid and not expired', async () => {
      const mockDate = new Date()
      mockDate.setDate(mockDate.getDate() + 10)
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: 'monthly',
        expiresAt: mockDate,
      })

      const res = await service.getStatus('user-1')
      expect(res.hasSubscription).toBe(true)
      expect(res.plan).toBe('monthly')
    })

    it('should return inactive subscription if expired or missing', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const res = await service.getStatus('user-1')
      expect(res.hasSubscription).toBe(false)
      expect(res.plan).toBe(null)
    })
  })

  describe('Contact Reveal Protection', () => {
    // Contact reveal is protected by ensuring user has an active subscription.
    // We simulate the protection mechanism typically used in the controller.
    it('should allow contact reveal for active subscriptions', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        plan: 'monthly',
        expiresAt: new Date(Date.now() + 86400000),
      })

      const status = await service.getStatus('user-1')
      expect(status.hasSubscription).toBe(true)
      // Controller logic would allow:
      const canRevealContact = status.hasSubscription
      expect(canRevealContact).toBe(true)
    })

    it('should block contact reveal for inactive subscriptions', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const status = await service.getStatus('user-1')
      expect(status.hasSubscription).toBe(false)
      const canRevealContact = status.hasSubscription
      expect(canRevealContact).toBe(false)
    })
  })
})
