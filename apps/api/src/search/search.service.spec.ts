import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, HttpStatus } from '@nestjs/common'
import { SearchService } from './search.service'
import { prisma, Prisma } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const { Prisma } = jest.requireActual('@prisma/client')
  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    subscription: {
      findFirst: jest.fn(),
    },
    truck: {
      findUnique: jest.fn(),
    },
    load: {
      findUnique: jest.fn(),
    },
  }
  return {
    Prisma,
    prisma: mockPrisma,
  }
})

describe('SearchService', () => {
  let service: SearchService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService],
    }).compile()

    service = module.get<SearchService>(SearchService)
  })

  describe('searchTrucks', () => {
    it('should search trucks using parameterized $queryRaw', async () => {
      const mockTrucks = [{ id: 'truck-1', distanceKm: 12.5 }]
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockTrucks)

      const result = await service.searchTrucks({
        lat: 18.5204,
        lng: 73.8567,
        radiusKm: 20,
        truckType: 'Open',
        minTonnage: 15,
      })

      expect(result).toEqual(mockTrucks)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)

      const calledQuery = (prisma.$queryRaw as jest.Mock).mock.calls[0][0]
      expect(calledQuery).toBeDefined()
      expect(calledQuery.text).toBeDefined()
      expect(calledQuery.values).toBeDefined()

      // Verify parameters are bound securely
      expect(calledQuery.values).toContain(18.5204)
      expect(calledQuery.values).toContain(73.8567)
      expect(calledQuery.values).toContain(20000) // 20 km to meters
      expect(calledQuery.values).toContain('Open')
      expect(calledQuery.values).toContain(15)

      // Ensure no raw sql injection is possible and standard PostGIS ST_DWithin and ST_Distance are present
      expect(calledQuery.text).toContain('ST_DWithin')
      expect(calledQuery.text).toContain('ST_Distance')
      expect(calledQuery.text).toContain('body_type::text =')
      expect(calledQuery.text).toContain('tonnage_capacity >=')
    })
  })

  describe('searchLoads', () => {
    it('should search loads using parameterized $queryRaw', async () => {
      const mockLoads = [{ id: 'load-1', distanceKm: 5.4 }]
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockLoads)

      const result = await service.searchLoads({
        lat: 12.9716,
        lng: 77.5946,
        radiusKm: 30,
        truckType: 'Container',
        maxTonnage: 10,
      })

      expect(result).toEqual(mockLoads)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)

      const calledQuery = (prisma.$queryRaw as jest.Mock).mock.calls[0][0]
      expect(calledQuery).toBeDefined()
      expect(calledQuery.text).toBeDefined()
      expect(calledQuery.values).toBeDefined()

      // Verify parameters are bound securely
      expect(calledQuery.values).toContain(12.9716)
      expect(calledQuery.values).toContain(77.5946)
      expect(calledQuery.values).toContain(30000) // 30 km to meters
      expect(calledQuery.values).toContain('Container')
      expect(calledQuery.values).toContain(10)

      expect(calledQuery.text).toContain('ST_DWithin')
      expect(calledQuery.text).toContain('ST_Distance')
      expect(calledQuery.text).toContain('truck_type::text =')
      expect(calledQuery.text).toContain('tonnage_required <=')
    })
  })

  describe('revealContact', () => {
    it('should throw Payment Required if no active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        service.revealContact('user-1', 'truck-123', 'truck')
      ).rejects.toThrow(
        new HttpException(
          'An active subscription is required to view contact details.',
          HttpStatus.PAYMENT_REQUIRED
        )
      )
    })

    it('should reveal truck details if active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'sub-1' })
      const mockTruck = { id: 'truck-123', user: { name: 'Owner' } }
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(mockTruck)

      const result = await service.revealContact('user-1', 'truck-123', 'truck')
      expect(result).toEqual(mockTruck)
    })

    it('should reveal load details if active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'sub-1' })
      const mockLoad = { id: 'load-123', user: { name: 'Shipper' } }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.revealContact('user-1', 'load-123', 'load')
      expect(result).toEqual(mockLoad)
    })
  })

  describe('checkSubscription', () => {
    it('should return true if active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'sub-1' })
      const result = await service.checkSubscription('user-1')
      expect(result).toBe(true)
    })

    it('should return false if no active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce(null)
      const result = await service.checkSubscription('user-1')
      expect(result).toBe(false)
    })
  })
})
