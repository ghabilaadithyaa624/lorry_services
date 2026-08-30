import { Test, TestingModule } from '@nestjs/testing'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { BadRequestException } from '@nestjs/common'

describe('SearchController', () => {
  let controller: SearchController
  let searchService: jest.Mocked<SearchService>
  let mapmyIndiaService: jest.Mocked<MapmyIndiaService>

  beforeEach(async () => {
    const mockSearchService = {
      searchTrucks: jest.fn(),
      searchLoads: jest.fn(),
      revealContact: jest.fn(),
      checkSubscription: jest.fn(),
    }

    const mockMapmyIndiaService = {
      reverseGeocode: jest.fn(),
      geocodeAddress: jest.fn(),
      getSuggestions: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: mockSearchService },
        { provide: MapmyIndiaService, useValue: mockMapmyIndiaService },
      ],
    }).compile()

    controller = module.get<SearchController>(SearchController)
    searchService = module.get(SearchService)
    mapmyIndiaService = module.get(MapmyIndiaService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('reverseGeocode', () => {
    it('should throw BadRequestException if lat or lng is missing', async () => {
      await expect(controller.reverseGeocode('invalid', '77.5946')).rejects.toThrow(BadRequestException)
      await expect(controller.reverseGeocode('12.9716', 'invalid')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if coordinates are out of bounds', async () => {
      await expect(controller.reverseGeocode('5.9', '77.5946')).rejects.toThrow(BadRequestException)
      await expect(controller.reverseGeocode('38.1', '77.5946')).rejects.toThrow(BadRequestException)
      await expect(controller.reverseGeocode('12.9716', '67.9')).rejects.toThrow(BadRequestException)
      await expect(controller.reverseGeocode('12.9716', '98.1')).rejects.toThrow(BadRequestException)
    })

    it('should return error response if mapmyIndiaService.reverseGeocode fails', async () => {
      mapmyIndiaService.reverseGeocode.mockResolvedValueOnce(null)
      const result = await controller.reverseGeocode('12.9716', '77.5946')
      expect(result).toEqual({
        formattedAddress: null,
        city: null,
        state: null,
        pincode: null,
        lat: 12.9716,
        lng: 77.5946,
        error: 'Could not resolve address for the provided coordinates',
      })
    })

    it('should return address details if mapmyIndiaService.reverseGeocode succeeds', async () => {
      mapmyIndiaService.reverseGeocode.mockResolvedValueOnce({
        formattedAddress: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        lat: 12.9716,
        lng: 77.5946,
      })
      const result = await controller.reverseGeocode('12.9716', '77.5946')
      expect(result).toEqual({
        formattedAddress: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        lat: 12.9716,
        lng: 77.5946,
      })
    })
  })

  describe('geocode', () => {
    it('should throw BadRequestException if address is missing or too short', async () => {
      await expect(controller.geocode('')).rejects.toThrow(BadRequestException)
      await expect(controller.geocode(' ')).rejects.toThrow(BadRequestException)
      await expect(controller.geocode('a')).rejects.toThrow(BadRequestException)
    })

    it('should return error response if mapmyIndiaService.geocodeAddress fails', async () => {
      mapmyIndiaService.geocodeAddress.mockResolvedValueOnce(null)
      const result = await controller.geocode('Unknown Place')
      expect(result).toEqual({
        formattedAddress: null,
        city: null,
        state: null,
        pincode: null,
        lat: null,
        lng: null,
        error: 'Location could not be geocoded',
      })
    })

    it('should return location details if mapmyIndiaService.geocodeAddress succeeds', async () => {
      mapmyIndiaService.geocodeAddress.mockResolvedValueOnce({
        formattedAddress: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        lat: 12.9716,
        lng: 77.5946,
      })
      const result = await controller.geocode('MG Road, Bangalore')
      expect(result).toEqual({
        formattedAddress: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        lat: 12.9716,
        lng: 77.5946,
      })
    })
  })

  describe('suggestions', () => {
    it('should return empty array if query is missing or too short', async () => {
      expect(await controller.suggestions('')).toEqual([])
      expect(await controller.suggestions(' ')).toEqual([])
      expect(await controller.suggestions('a')).toEqual([])
      expect(mapmyIndiaService.getSuggestions).not.toHaveBeenCalled()
    })

    it('should call getSuggestions without location if coordinates are missing or invalid', async () => {
      const mockResult = [{ placeName: 'Delhi' }]
      mapmyIndiaService.getSuggestions.mockResolvedValueOnce(mockResult as any)

      const result = await controller.suggestions('Delhi')

      expect(mapmyIndiaService.getSuggestions).toHaveBeenCalledWith('Delhi', undefined)
      expect(result).toEqual(mockResult)
    })

    it('should call getSuggestions with location if valid coordinates are provided', async () => {
      const mockResult = [{ placeName: 'Bangalore' }]
      mapmyIndiaService.getSuggestions.mockResolvedValueOnce(mockResult as any)

      const result = await controller.suggestions('Bangalore', '12.9716', '77.5946')

      expect(mapmyIndiaService.getSuggestions).toHaveBeenCalledWith('Bangalore', { lat: 12.9716, lng: 77.5946 })
      expect(result).toEqual(mockResult)
    })
  })

  describe('searchTrucks', () => {
    it('should map parameters correctly and call searchService.searchTrucks', async () => {
      const mockTrucks = [{ id: 'truck1' }]
      searchService.searchTrucks.mockResolvedValueOnce(mockTrucks as any)

      const result = await controller.searchTrucks('12.9', '77.6', '100', 'Open', '10', 'user1')

      expect(searchService.searchTrucks).toHaveBeenCalledWith({
        lat: 12.9,
        lng: 77.6,
        radiusKm: 100,
        truckType: 'Open',
        minTonnage: 10,
        userId: 'user1',
      })
      expect(result).toEqual(mockTrucks)
    })

    it('should use default values for missing optional parameters', async () => {
      searchService.searchTrucks.mockResolvedValueOnce([] as any)

      await controller.searchTrucks('12.9', '77.6', '')

      expect(searchService.searchTrucks).toHaveBeenCalledWith({
        lat: 12.9,
        lng: 77.6,
        radiusKm: 50,
        truckType: undefined,
        minTonnage: undefined,
        userId: '',
      })
    })
  })

  describe('searchLoads', () => {
    it('should map parameters correctly and call searchService.searchLoads', async () => {
      const mockLoads = [{ id: 'load1' }]
      searchService.searchLoads.mockResolvedValueOnce(mockLoads as any)

      const result = await controller.searchLoads('12.9', '77.6', '100', 'Open', '10', 'user1')

      expect(searchService.searchLoads).toHaveBeenCalledWith({
        lat: 12.9,
        lng: 77.6,
        radiusKm: 100,
        truckType: 'Open',
        maxTonnage: 10,
        userId: 'user1',
      })
      expect(result).toEqual(mockLoads)
    })

    it('should use default values for missing optional parameters', async () => {
      searchService.searchLoads.mockResolvedValueOnce([] as any)

      await controller.searchLoads('12.9', '77.6', '')

      expect(searchService.searchLoads).toHaveBeenCalledWith({
        lat: 12.9,
        lng: 77.6,
        radiusKm: 50,
        truckType: undefined,
        maxTonnage: undefined,
        userId: '',
      })
    })
  })

  describe('revealContact', () => {
    it('should call searchService.revealContact with correct arguments', async () => {
      const mockDetails = { phone: '1234567890' }
      searchService.revealContact.mockResolvedValueOnce(mockDetails as any)

      const result = await controller.revealContact('truck', 'truck1', 'user1')

      expect(searchService.revealContact).toHaveBeenCalledWith('user1', 'truck1', 'truck')
      expect(result).toEqual(mockDetails)
    })
  })

  describe('checkSubscription', () => {
    it('should call searchService.checkSubscription and return hasSubscription: true', async () => {
      searchService.checkSubscription.mockResolvedValueOnce(true)

      const result = await controller.checkSubscription('user1')

      expect(searchService.checkSubscription).toHaveBeenCalledWith('user1')
      expect(result).toEqual({ hasSubscription: true })
    })

    it('should return hasSubscription: false when checkSubscription returns false', async () => {
      searchService.checkSubscription.mockResolvedValueOnce(false)

      const result = await controller.checkSubscription('user1')

      expect(result).toEqual({ hasSubscription: false })
    })
  })
})
