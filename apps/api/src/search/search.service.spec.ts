import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, HttpStatus } from '@nestjs/common'
import { SearchService } from './search.service'
import { prisma, Prisma } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const actual = jest.requireActual('@lorrycarry/database')
  return {
    ...actual,
    prisma: {
      $queryRaw: jest.fn(),
      subscription: {
        findFirst: jest.fn(),
      },
      truck: {
        findUnique: jest.fn(),
      },
      load: {
        findUnique: jest.fn(),
      },
    },
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
    it('should search trucks with default coordinates and radius', async () => {
      const mockTrucks = [{ id: 'truck-1', bodyType: 'Open' }]
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockTrucks)

      const result = await service.searchTrucks({
        lat: 18.5204,
        lng: 73.8567,
      })

      expect(result).toEqual(mockTrucks)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)

      const [query] = (prisma.$queryRaw as jest.Mock).mock.calls[0]
      expect(query.text).toContain('ST_DWithin')
      expect(query.text).toContain('verification_status = \'Verified\'')
      expect(query.values).toContain(73.8567) // lng
      expect(query.values).toContain(18.5204) // lat
      expect(query.values).toContain(50 * 1000) // default radius (50km in meters)
    })

    it('should append truckType and minTonnage filters correctly', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([])

      await service.searchTrucks({
        lat: 18.5204,
        lng: 73.8567,
        radiusKm: 100,
        truckType: 'Container',
        minTonnage: 12,
      })

      const [query] = (prisma.$queryRaw as jest.Mock).mock.calls[0]
      expect(query.text).toContain('body_type::text = ')
      expect(query.text).toContain('tonnage_capacity >= ')
      expect(query.values).toContain('Container')
      expect(query.values).toContain(12)
      expect(query.values).toContain(100 * 1000) // custom radius in meters
    })
  })

  describe('searchLoads', () => {
    it('should search loads with default coordinates and radius', async () => {
      const mockLoads = [{ id: 'load-1', tonnageRequired: 10 }]
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockLoads)

      const result = await service.searchLoads({
        lat: 12.9716,
        lng: 77.5946,
      })

      expect(result).toEqual(mockLoads)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)

      const [query] = (prisma.$queryRaw as jest.Mock).mock.calls[0]
      expect(query.text).toContain('ST_DWithin')
      expect(query.text).toContain('status = \'Open\'')
      expect(query.values).toContain(77.5946) // lng
      expect(query.values).toContain(12.9716) // lat
      expect(query.values).toContain(50 * 1000) // default radius
    })

    it('should append truckType and maxTonnage filters correctly', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([])

      await service.searchLoads({
        lat: 12.9716,
        lng: 77.5946,
        radiusKm: 30,
        truckType: 'Trailer',
        maxTonnage: 25,
      })

      const [query] = (prisma.$queryRaw as jest.Mock).mock.calls[0]
      expect(query.text).toContain('truck_type::text = ')
      expect(query.text).toContain('tonnage_required <= ')
      expect(query.values).toContain('Trailer')
      expect(query.values).toContain(25)
      expect(query.values).toContain(30 * 1000)
    })
  })

  describe('revealContact', () => {
    const userId = 'user-1'
    const listingId = 'list-1'

    it('should reveal truck contact details if subscription is active', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'sub-1',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000),
      })

      const mockTruck = { id: listingId, user: { name: 'John Doe', phone: '1234567890' } }
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(mockTruck)

      const result = await service.revealContact(userId, listingId, 'truck')
      expect(result).toEqual(mockTruck)
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'active',
          expiresAt: { gt: expect.any(Date) },
        },
      })
      expect(prisma.truck.findUnique).toHaveBeenCalledWith({
        where: { id: listingId },
        include: {
          user: { select: { phone: true, name: true } },
          documents: {
            where: { verificationStatus: 'Verified' },
            select: { type: true, docNumber: true },
          },
        },
      })
    })

    it('should reveal load contact details if subscription is active', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'sub-1',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000),
      })

      const mockLoad = { id: listingId, user: { name: 'Jane Doe', phone: '0987654321' } }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.revealContact(userId, listingId, 'load')
      expect(result).toEqual(mockLoad)
      expect(prisma.load.findUnique).toHaveBeenCalledWith({
        where: { id: listingId },
        include: {
          user: { select: { phone: true, name: true } },
        },
      })
    })

    it('should throw Payment Required exception if no active subscription', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.revealContact(userId, listingId, 'truck')).rejects.toThrow(
        new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            error: 'Payment Required',
            message: 'An active subscription is required to view contact details.',
          },
          HttpStatus.PAYMENT_REQUIRED,
        )
      )
    })
  })

  describe('checkSubscription', () => {
    const userId = 'user-1'

    it('should return true if active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'sub-1' })
      const result = await service.checkSubscription(userId)
      expect(result).toBe(true)
    })

    it('should return false if no active subscription exists', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce(null)
      const result = await service.checkSubscription(userId)
      expect(result).toBe(false)
    })
  })
})
