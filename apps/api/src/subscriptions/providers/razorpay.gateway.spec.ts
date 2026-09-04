import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { RazorpayGateway } from './razorpay.gateway'

const mockOrders = {
  create: jest.fn(),
  fetch: jest.fn(),
  fetchPayments: jest.fn(),
}
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: mockOrders,
  }))
})

describe('RazorpayGateway', () => {
  let gateway: RazorpayGateway

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayGateway,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key'
              if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_secret'
              if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'whsec_test'
              if (key === 'CLIENT_URL') return 'http://localhost:3010'
              if (key === 'API_URL') return 'http://localhost:3002/api/v1'
              return undefined
            }),
          },
        },
      ],
    }).compile()

    gateway = module.get<RazorpayGateway>(RazorpayGateway)
  })

  it('should boot without configured credentials (dev placeholders)', () => {
    const g = new RazorpayGateway({ get: () => undefined } as any)
    expect(g).toBeDefined()
  })

  it('should create an order in paise with plan metadata', async () => {
    mockOrders.create.mockResolvedValue({
      id: 'order_rzp_1',
      receipt: 'sub_user1_123',
      amount: 249900,
      currency: 'INR',
    })

    const session = await gateway.createCheckoutSession({
      paymentId: 'pay-1',
      orderId: 'sub_user1_123',
      userId: 'user-1',
      customerPhone: '+919876543210',
      plan: 'quarterly',
      amount: 2499,
      currency: 'INR',
      planLabel: 'Quarterly Unlimited',
    })

    expect(mockOrders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 249900,
        currency: 'INR',
        receipt: 'sub_user1_123',
        notes: expect.objectContaining({ plan: 'quarterly', userId: 'user-1' }),
      }),
    )
    expect(session.gatewayOrderId).toBe('order_rzp_1')
    expect(session.payload).toEqual(
      expect.objectContaining({
        razorpayOrderId: 'order_rzp_1',
        keyId: 'rzp_test_key',
        amount: 249900,
      }),
    )
  })

  it('should verify a paid order', async () => {
    mockOrders.fetch.mockResolvedValue({ id: 'order_rzp_1', status: 'paid' })
    mockOrders.fetchPayments.mockResolvedValue({ items: [{ id: 'pay_xyz' }] })

    const result = await gateway.verifyPayment('order_rzp_1')
    expect(result.paid).toBe(true)
    expect(result.txnId).toBe('pay_xyz')
  })

  it('should report unpaid orders', async () => {
    mockOrders.fetch.mockResolvedValue({ id: 'order_rzp_1', status: 'created' })

    const result = await gateway.verifyPayment('order_rzp_1')
    expect(result.paid).toBe(false)
  })

  it('should accept valid webhook HMAC signatures', () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} })
    const sig = crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex')

    expect(gateway.verifyWebhookSignature(body, sig)).toBe(true)
    expect(gateway.verifyWebhookSignature(body, 'bad')).toBe(false)
  })
})
