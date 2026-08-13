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

    it('should fall back to dev fallback if returned latitude is below Indian bounds (< 6.0)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 5.9,
              lng: 77.5946,
              formatted_address: 'Below Bounds, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).not.toBeNull()
      expect(result?.city).toBe('Bengaluru') // Fell back to Bangalore fallback
    })

    it('should fall back to dev fallback if returned latitude is above Indian bounds (> 38.0)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 38.1,
              lng: 77.5946,
              formatted_address: 'Above Bounds, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).not.toBeNull()
      expect(result?.city).toBe('Bengaluru')
    })

    it('should fall back to dev fallback if returned longitude is below Indian bounds (< 68.0)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 12.9716,
              lng: 67.9,
              formatted_address: 'Left Out of Bounds, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).not.toBeNull()
      expect(result?.city).toBe('Bengaluru')
    })

    it('should fall back to dev fallback if returned longitude is above Indian bounds (> 98.0)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 12.9716,
              lng: 98.1,
              formatted_address: 'Right Out of Bounds, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).not.toBeNull()
      expect(result?.city).toBe('Bengaluru')
    })

    it('should fall back to dev fallback if returned coordinates are NaN', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 'invalid_lat',
              lng: 'invalid_lng',
              formatted_address: 'NaN Coordinates, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).not.toBeNull()
      expect(result?.city).toBe('Bengaluru')
    })

    it('should return null if returned coordinates are out-of-bounds in production environment', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'MAPMYINDIA_API_KEY') return 'test-api-key'
        if (key === 'NODE_ENV') return 'production'
        if (key === 'ENABLE_GEOCODE_DEV_FALLBACK') return 'true'
        return defaultValue
      })

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 5.0,
              lng: 77.5946,
              formatted_address: 'Production Out of Bounds, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).toBeNull()
    })

    it('should return null if returned coordinates are out-of-bounds and dev fallback is disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'MAPMYINDIA_API_KEY') return 'test-api-key'
        if (key === 'NODE_ENV') return 'development'
        if (key === 'ENABLE_GEOCODE_DEV_FALLBACK') return 'false'
        return defaultValue
      })

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              lat: 5.0,
              lng: 77.5946,
              formatted_address: 'Fallback Disabled Out of Bounds, India',
              city: 'Somewhere',
            },
          ],
        },
      })

      const result = await service.geocodeAddress('Bangalore')
      expect(result).toBeNull()
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

    it('should return null immediately if reverse geocoding input coordinates are outside Indian bounding box', async () => {
      const result1 = await service.reverseGeocode(5.0, 77.5946)
      const result2 = await service.reverseGeocode(39.0, 77.5946)
      const result3 = await service.reverseGeocode(12.9716, 67.0)
      const result4 = await service.reverseGeocode(12.9716, 99.0)

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(result3).toBeNull()
      expect(result4).toBeNull()
    })
  })
})
