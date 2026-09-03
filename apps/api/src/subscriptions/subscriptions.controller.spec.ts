import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { RawBodyRequest } from '@nestjs/common'
import { Request } from 'express'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { InitiateSubscriptionDto } from './dto/initiate-subscription.dto'

jest.mock('@lorrycarry/database', () => ({
  prisma: {},
}))

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController
  let subscriptionsService: jest.Mocked<SubscriptionsService>
  let configService: jest.Mocked<ConfigService>

  const razorpayGateway = {
    verifyWebhookSignature: jest.fn(),
  }
  const stripeGateway = {
    constructEvent: jest.fn(),
  }

  const mockSubscriptionsService = {
    initiate: jest.fn(),
    getStatus: jest.fn(),
    verifyAndActivate: jest.fn(),
    markFailed: jest.fn(),
    verifyOrder: jest.fn(),
    getRazorpayGateway: jest.fn(() => razorpayGateway),
    getStripeGateway: jest.fn(() => stripeGateway),
  }

  const mockConfigService = {
    get: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    controller = module.get<SubscriptionsController>(SubscriptionsController)
    subscriptionsService = module.get(SubscriptionsService)
    configService = module.get(ConfigService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('initiate', () => {
    it('should call subscriptionsService.initiate and return its result', async () => {
      const dto: InitiateSubscriptionDto = { plan: 'monthly' }
      const userId = 'user-1'
      const mockResult = { paymentSessionId: 'session_1', orderId: 'order_1', paymentId: 'payment_1', amount: 500, plan: 'monthly' }

      subscriptionsService.initiate.mockResolvedValue(mockResult as any)

      const result = await controller.initiate(dto, userId)

      expect(subscriptionsService.initiate).toHaveBeenCalledWith(userId, dto.plan, undefined)
      expect(result).toEqual(mockResult)
    })
  })

  describe('getStatus', () => {
    it('should call subscriptionsService.getStatus and return its result', async () => {
      const userId = 'user-1'
      const mockResult = { hasSubscription: true, plan: 'monthly', expiresAt: new Date() }

      subscriptionsService.getStatus.mockResolvedValue(mockResult as any)

      const result = await controller.getStatus(userId)

      expect(subscriptionsService.getStatus).toHaveBeenCalledWith(userId)
      expect(result).toEqual(mockResult)
    })
  })

  describe('cashfreeWebhook', () => {
    const timestamp = '1234567890'
    const secretKey = 'test-secret'

    const createValidSignature = (rawBody: string) => {
      return crypto
        .createHmac('sha256', secretKey)
        .update(`${timestamp}${rawBody}`)
        .digest('base64')
    }

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'CASHFREE_SECRET_KEY') return secretKey
        return null
      })
    })

    it('should handle PAYMENT_SUCCESS_WEBHOOK with valid signature', async () => {
      const rawBody = JSON.stringify({
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: 'order_1' },
          payment: { cf_payment_id: 123 },
        },
      })
      const signature = createValidSignature(rawBody)
      const req = { rawBody: Buffer.from(rawBody) } as RawBodyRequest<Request>

      const result = await controller.cashfreeWebhook(signature, timestamp, req)

      expect(subscriptionsService.verifyAndActivate).toHaveBeenCalledWith('order_1', '123')
      expect(result).toEqual({ received: true })
    })

    it('should handle PAYMENT_FAILED_WEBHOOK with valid signature', async () => {
      const rawBody = JSON.stringify({
        type: 'PAYMENT_FAILED_WEBHOOK',
        data: {
          order: { order_id: 'order_2' },
          payment: { payment_message: 'Insufficient funds' },
        },
      })
      const signature = createValidSignature(rawBody)
      const req = { rawBody: Buffer.from(rawBody) } as RawBodyRequest<Request>

      const result = await controller.cashfreeWebhook(signature, timestamp, req)

      expect(subscriptionsService.markFailed).toHaveBeenCalledWith('order_2', 'Insufficient funds')
      expect(result).toEqual({ received: true })
    })

    it('should handle unhandled webhook type gracefully', async () => {
      const rawBody = JSON.stringify({
        type: 'SOME_OTHER_WEBHOOK',
        data: {},
      })
      const signature = createValidSignature(rawBody)
      const req = { rawBody: Buffer.from(rawBody) } as RawBodyRequest<Request>

      const result = await controller.cashfreeWebhook(signature, timestamp, req)

      expect(subscriptionsService.verifyAndActivate).not.toHaveBeenCalled()
      expect(subscriptionsService.markFailed).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })

    it('should return error for invalid signature', async () => {
      const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {} })
      const signature = 'invalid-signature'
      const req = { rawBody: Buffer.from(rawBody) } as RawBodyRequest<Request>

      const result = await controller.cashfreeWebhook(signature, timestamp, req)

      expect(subscriptionsService.verifyAndActivate).not.toHaveBeenCalled()
      expect(result).toEqual({ received: false, error: 'Invalid signature' })
    })
  })

  describe('razorpayWebhook', () => {
    it('should verify signature and activate on payment.captured', async () => {
      razorpayGateway.verifyWebhookSignature.mockReturnValue(true)
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', order_id: 'order_rzp_1' } } },
      })
      const req = { rawBody: Buffer.from(rawBody) } as RawBodyRequest<Request>

      const result = await controller.razorpayWebhook('sig', req)

      expect(razorpayGateway.verifyWebhookSignature).toHaveBeenCalledWith(rawBody, 'sig')
      expect(subscriptionsService.verifyAndActivate).toHaveBeenCalledWith('order_rzp_1', 'pay_123')
      expect(result).toEqual({ received: true })
    })

    it('should reject invalid signature', async () => {
      razorpayGateway.verifyWebhookSignature.mockReturnValue(false)
      const req = { rawBody: Buffer.from('{}') } as RawBodyRequest<Request>

      const result = await controller.razorpayWebhook('bad', req)

      expect(subscriptionsService.verifyAndActivate).not.toHaveBeenCalled()
      expect(result).toEqual({ received: false, error: 'Invalid signature' })
    })
  })

  describe('stripeWebhook', () => {
    it('should activate on checkout.session.completed (paid)', async () => {
      stripeGateway.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1' } },
      })
      const req = { rawBody: Buffer.from('{}') } as RawBodyRequest<Request>

      const result = await controller.stripeWebhook('sig', req)

      expect(subscriptionsService.verifyAndActivate).toHaveBeenCalledWith('cs_test_1', 'pi_1')
      expect(result).toEqual({ received: true })
    })

    it('should reject invalid signature', async () => {
      stripeGateway.constructEvent.mockImplementation(() => {
        throw new Error('bad signature')
      })
      const req = { rawBody: Buffer.from('{}') } as RawBodyRequest<Request>

      const result = await controller.stripeWebhook('bad', req)

      expect(subscriptionsService.verifyAndActivate).not.toHaveBeenCalled()
      expect(result).toEqual({ received: false, error: 'Invalid signature', message: 'bad signature' })
    })
  })

  describe('callback', () => {
    it('should call subscriptionsService.verifyOrder and return its result', async () => {
      const orderId = 'order_1'
      const mockResult = { status: 'SUCCESS', orderId, paymentId: 'pay_1', hasSubscription: true, plan: 'monthly', expiresAt: new Date() }

      subscriptionsService.verifyOrder.mockResolvedValue(mockResult as any)

      const result = await controller.callback(orderId)

      expect(subscriptionsService.verifyOrder).toHaveBeenCalledWith(orderId)
      expect(result).toEqual(mockResult)
    })
  })

  describe('verify', () => {
    it('should call subscriptionsService.verifyOrder and return its result', async () => {
      const orderId = 'order_1'
      const mockResult = { status: 'PENDING', orderId, message: 'Pending' }

      subscriptionsService.verifyOrder.mockResolvedValue(mockResult as any)

      const result = await controller.verify(orderId)

      expect(subscriptionsService.verifyOrder).toHaveBeenCalledWith(orderId)
      expect(result).toEqual(mockResult)
    })
  })
})
