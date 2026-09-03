import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { StripeGateway } from './stripe.gateway'

const mockCheckoutSessions = {
  create: jest.fn(),
  retrieve: jest.fn(),
}
const mockWebhooks = {
  constructEvent: jest.fn(),
}
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: mockCheckoutSessions },
    webhooks: mockWebhooks,
  }))
})

const configMock = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123'
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_stripe'
    if (key === 'CLIENT_URL') return 'http://localhost:3010'
    if (key === 'API_URL') return 'http://localhost:3002/api/v1'
    return undefined
  }),
}

describe('StripeGateway', () => {
  let gateway: StripeGateway

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeGateway, { provide: ConfigService, useValue: configMock }],
    }).compile()

    gateway = module.get<StripeGateway>(StripeGateway)
  })

  it('should boot without configured credentials (dev placeholders)', () => {
    const g = new StripeGateway({ get: () => undefined } as any)
    expect(g).toBeDefined()
  })

  it('should create a one-time Checkout Session with INR amount', async () => {
    mockCheckoutSessions.create.mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    })

    const session = await gateway.createCheckoutSession({
      paymentId: 'pay-1',
      orderId: 'sub_user1_123',
      userId: 'user-1',
      customerPhone: '+919876543210',
      plan: 'annual',
      amount: 7999,
      currency: 'INR',
      planLabel: 'Annual Unlimited',
    })

    expect(mockCheckoutSessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        metadata: expect.objectContaining({
          userId: 'user-1',
          plan: 'annual',
          paymentId: 'pay-1',
          orderId: 'sub_user1_123',
        }),
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'inr',
              unit_amount: 799900,
            }),
          }),
        ],
        success_url: expect.stringContaining('provider=stripe'),
      }),
    )
    expect(session.gatewayOrderId).toBe('cs_test_1')
    expect(session.payload).toEqual(
      expect.objectContaining({ sessionId: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
    )
  })

  it('should verify a paid session', async () => {
    mockCheckoutSessions.retrieve.mockResolvedValue({
      id: 'cs_test_1',
      payment_status: 'paid',
      payment_intent: 'pi_1',
    })

    const result = await gateway.verifyPayment('cs_test_1')
    expect(result.paid).toBe(true)
    expect(result.txnId).toBe('pi_1')
  })

  it('should verify webhooks via the Stripe SDK with the raw body + signature', () => {
    const event = { type: 'checkout.session.completed' }
    mockWebhooks.constructEvent.mockReturnValue(event)

    const parsed = gateway.constructEvent('raw-body', 'stripe-sig')
    expect(parsed).toBe(event)
    expect(mockWebhooks.constructEvent).toHaveBeenCalledWith('raw-body', 'stripe-sig', 'whsec_stripe')
  })
})
