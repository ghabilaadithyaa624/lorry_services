import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CashfreeService } from './cashfree.service'
import axios from 'axios'
import * as crypto from 'crypto'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('CashfreeService', () => {
  let service: CashfreeService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashfreeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'NODE_ENV') return 'development'
              if (key === 'CASHFREE_APP_ID') return 'test-app-id'
              if (key === 'CASHFREE_SECRET_KEY') return 'test-secret-key'
              if (key === 'CASHFREE_WEBHOOK_SECRET') return 'test-webhook-secret'
              if (key === 'CLIENT_URL') return 'http://localhost:3000'
              if (key === 'API_URL') return 'http://localhost:3002/api/v1'
              return defaultValue
            }),
          },
        },
      ],
    }).compile()

    // Disable logger to avoid noisy tests
    module.useLogger(false)

    service = module.get<CashfreeService>(CashfreeService)
    configService = module.get<ConfigService>(ConfigService)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('constructor', () => {
    it('should use sandbox url for development', async () => {
      expect((service as any).baseUrl).toBe('https://sandbox.cashfree.com/pg')
    })

    it('should use production url for production', async () => {
      const prodModule: TestingModule = await Test.createTestingModule({
        providers: [
          CashfreeService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'NODE_ENV') return 'production'
                return 'test-value'
              }),
            },
          },
        ],
      }).compile()

      const prodService = prodModule.get<CashfreeService>(CashfreeService)
      expect((prodService as any).baseUrl).toBe('https://api.cashfree.com/pg')
    })
  })

  describe('createOrder', () => {
    it('should successfully create an order', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          payment_session_id: 'session-id',
          order_id: 'order-123',
          cf_order_id: 'cf-order-123',
        },
      })

      const request = {
        orderId: 'order-123',
        amount: 100,
        customerId: 'cust-123',
        customerPhone: '9999999999',
        description: 'Test order',
      }

      const result = await service.createOrder(request)

      expect(result).toEqual({
        paymentSessionId: 'session-id',
        orderId: 'order-123',
        cfOrderId: 'cf-order-123',
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://sandbox.cashfree.com/pg/orders',
        expect.objectContaining({
          order_id: 'order-123',
          order_amount: 100,
          customer_details: expect.objectContaining({
            customer_id: 'cust-123',
            customer_phone: '9999999999',
            customer_name: 'Customer',
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-client-id': 'test-app-id',
            'x-client-secret': 'test-secret-key',
          }),
        })
      )
    })

    it('should throw error on API failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'))

      const request = {
        orderId: 'order-123',
        amount: 100,
        customerId: 'cust-123',
        customerPhone: '9999999999',
        description: 'Test order',
      }

      await expect(service.createOrder(request)).rejects.toThrow('Failed to create payment order: API Error')
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should return false if signature is missing', () => {
      const result = service.verifyWebhookSignature({ data: 'test' })
      expect(result).toBe(false)
    })

    it('should return true for valid signature', () => {
      const payload = { data: 'test' }
      const secret = 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('base64')

      const result = service.verifyWebhookSignature(payload, signature)
      expect(result).toBe(true)
    })

    it('should return true for valid signature with string payload', () => {
      const payload = JSON.stringify({ data: 'test' })
      const secret = 'test-webhook-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64')

      const result = service.verifyWebhookSignature(payload, signature)
      expect(result).toBe(true)
    })

    it('should return false for invalid signature', () => {
      const payload = { data: 'test' }
      const result = service.verifyWebhookSignature(payload, 'invalid-signature')
      expect(result).toBe(false)
    })

    it('should return true in development if secret is missing', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development'
        if (key === 'CASHFREE_WEBHOOK_SECRET') return ''
        return 'test'
      })

      const result = service.verifyWebhookSignature({ data: 'test' }, 'any-signature')
      expect(result).toBe(true)
    })

    it('should return false in production if secret is missing', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production'
        if (key === 'CASHFREE_WEBHOOK_SECRET') return ''
        return 'test'
      })

      const result = service.verifyWebhookSignature({ data: 'test' }, 'any-signature')
      expect(result).toBe(false)
    })

    it('should return false on crypto error', () => {
      jest.spyOn(crypto, 'createHmac').mockImplementationOnce(() => {
        throw new Error('Crypto error')
      })

      const result = service.verifyWebhookSignature({ data: 'test' }, 'any-signature')
      expect(result).toBe(false)
    })
  })

  describe('getOrderStatus', () => {
    it('should successfully get order status', async () => {
      const mockResponse = { order_status: 'PAID' }
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await service.getOrderStatus('order-123')
      expect(result).toEqual(mockResponse)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://sandbox.cashfree.com/pg/orders/order-123',
        expect.any(Object)
      )
    })

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'))
      await expect(service.getOrderStatus('order-123')).rejects.toThrow('API Error')
    })
  })

  describe('initiateKyc', () => {
    it('should successfully initiate KYC', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          reference_id: 'ref-123',
          redirect_url: 'https://example.com/redirect',
        },
      })

      const result = await service.initiateKyc('rc-123', 'chassis-123', 'https://callback.url')

      expect(result).toEqual({
        referenceId: 'ref-123',
        redirectUrl: 'https://example.com/redirect',
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://sandbox.cashfree.com/pg/verification/rc',
        {
          rc_number: 'rc-123',
          chassis_number: 'chassis-123',
          callback_url: 'https://callback.url',
        },
        expect.any(Object)
      )
    })

    it('should throw error on API failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'))
      await expect(
        service.initiateKyc('rc-123', 'chassis-123', 'https://callback.url')
      ).rejects.toThrow('Failed to initiate KYC verification: API Error')
    })
  })

  describe('getKycStatus', () => {
    it('should successfully get KYC status', async () => {
      const mockResponse = { status: 'VERIFIED' }
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await service.getKycStatus('ref-123')
      expect(result).toEqual(mockResponse)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://sandbox.cashfree.com/pg/verification/rc/ref-123',
        expect.any(Object)
      )
    })

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'))
      await expect(service.getKycStatus('ref-123')).rejects.toThrow('API Error')
    })
  })
})
