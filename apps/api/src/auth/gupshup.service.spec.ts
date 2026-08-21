import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { GupshupService } from './gupshup.service'
import axios from 'axios'

jest.mock('axios')

describe('GupshupService', () => {
  let service: GupshupService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GupshupService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GUPSHUP_APP_ID') return 'mock_app_id'
              if (key === 'GUPSHUP_APP_TOKEN') return 'mock_app_token'
              return null
            }),
          },
        },
      ],
    }).compile()

    service = module.get<GupshupService>(GupshupService)
    configService = module.get<ConfigService>(ConfigService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('sendOtp', () => {
    it('should handle API failure with standard error message', async () => {
      const mockError = {
        message: 'Request failed',
        response: {
          data: {
            message: 'Invalid parameters provided'
          }
        }
      }
      ;(axios.post as jest.Mock).mockRejectedValue(mockError)

      const result = await service.sendOtp('1234567890', '123456')

      expect(result).toEqual({
        success: false,
        message: 'Invalid parameters provided'
      })
      expect(axios.post).toHaveBeenCalledTimes(1)
    })

    it('should handle API failure with fallback error message', async () => {
      const mockError = {
        message: 'Network Error',
        response: {
          // data or data.message is undefined
        }
      }
      ;(axios.post as jest.Mock).mockRejectedValue(mockError)

      const result = await service.sendOtp('1234567890', '123456')

      expect(result).toEqual({
        success: false,
        message: 'Failed to send WhatsApp'
      })
      expect(axios.post).toHaveBeenCalledTimes(1)
    })
  })
})
