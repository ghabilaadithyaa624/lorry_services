import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { MapmyIndiaService } from './mapmyindia.service'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('MapmyIndiaService', () => {
  let service: MapmyIndiaService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapmyIndiaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'MAPMYINDIA_API_KEY') return 'test-api-key'
              if (key === 'NODE_ENV') return 'development'
              if (key === 'ENABLE_GEOCODE_DEV_FALLBACK') return 'true'
              return defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<MapmyIndiaService>(MapmyIndiaService)
    configService = module.get<ConfigService>(ConfigService)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('geocodeAddress', () => {
    it('should return successfully if primary domain returns a valid coordinate', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 12.9716,
              lng: 77.5946,
              formatted_address: 'Bengaluru, Karnataka',
              pincode: '560001',
              city: 'Bengaluru',
              state: 'Karnataka',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bengaluru')
      expect(result).not.toBeNull()
      expect(result?.lat).toBe(12.9716)
      expect(result?.lng).toBe(77.5946)
      expect(result?.city).toBe('Bengaluru')
    })

    it('should fall back to development fallback coordinates if geocoding fails on all domains', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const result = await service.geocodeAddress('Bangalore')
      expect(result).not.toBeNull()
      expect(result?.city).toBe('Bengaluru') // fallback mapping for 'bangalore'
    })
  })

  describe('reverseGeocode', () => {
    it('should successfully reverse geocode valid lat/lng', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              formatted_address: 'Bengaluru, Karnataka',
              pincode: '560001',
              city: 'Bengaluru',
              state: 'Karnataka',
            },
          ],
        },
      })

      const result = await service.reverseGeocode(12.9716, 77.5946)
      expect(result).not.toBeNull()
      expect(result?.formattedAddress).toBe('Bengaluru, Karnataka')
    })

    it('should return null if reverse geocoding fails on all domains', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const result = await service.reverseGeocode(12.9716, 77.5946)
      expect(result).toBeNull()
    })
  })
})
