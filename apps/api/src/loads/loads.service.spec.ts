import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { LoadsService } from './loads.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { prisma, LoadStatus } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const actual = jest.requireActual('@lorrycarry/database')
  return {
    ...actual,
    prisma: {
      $executeRaw: jest.fn(),
      load: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  }
})

describe('LoadsService', () => {
  let service: LoadsService
  let mapmyIndiaService: MapmyIndiaService

  const mockMapmyIndiaService = {
    geocodeAddress: jest.fn(),
    calculateDistance: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadsService,
        { provide: MapmyIndiaService, useValue: mockMapmyIndiaService },
      ],
    }).compile()

    service = module.get<LoadsService>(LoadsService)
    mapmyIndiaService = module.get<MapmyIndiaService>(MapmyIndiaService)
  })

  describe('create', () => {
    const userId = 'user-123'
    const dto = {
      tonnageRequired: 15,
      loadingAddress: 'Chakan MIDC',
      loadingPin: '410501',
      unloadingAddress: 'Peenya Industrial Area',
      unloadingPin: '560058',
      truckType: 'Container' as any,
      minLengthFt: 32,
      minHeightFt: 8,
      urgent: true,
      maxPrice: 65000,
      expectedDeliveryAt: new Date(),
      advancePayable: 20000,
    }

    it('should throw NotFoundException if geocoding loading address fails', async () => {
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce(null)

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException)
      expect(mockMapmyIndiaService.geocodeAddress).toHaveBeenCalledWith('Chakan MIDC, 410501')
    })

    it('should throw NotFoundException if geocoding unloading address fails', async () => {
      mockMapmyIndiaService.geocodeAddress
        .mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 }) // loading
        .mockResolvedValueOnce(null) // unloading

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException)
      expect(mockMapmyIndiaService.geocodeAddress).toHaveBeenNthCalledWith(2, 'Peenya Industrial Area, 560058')
    })

    it('should successfully create load and update PostGIS geography using safe $executeRaw', async () => {
      mockMapmyIndiaService.geocodeAddress
        .mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 }) // loading
        .mockResolvedValueOnce({ lat: 12.9716, lng: 77.5946 }) // unloading

      mockMapmyIndiaService.calculateDistance.mockReturnValueOnce(840)

      const mockLoad = {
        id: 'load-new-uuid',
        userId,
        tonnageRequired: 15,
        loadingAddress: 'Chakan MIDC',
        loadingPin: '410501',
        loadingLat: 18.5204,
        loadingLng: 73.8567,
        unloadingAddress: 'Peenya Industrial Area',
        unloadingPin: '560058',
        unloadingLat: 12.9716,
        unloadingLng: 77.5946,
        truckType: 'Container',
        minLengthFt: 32,
        minHeightFt: 8,
        urgent: true,
        maxPrice: 65000,
        expectedDeliveryAt: dto.expectedDeliveryAt,
        advancePayable: 20000,
        status: LoadStatus.Open,
      }
      ;(prisma.load.create as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      const result = await service.create(userId, dto)

      expect(result).toEqual({
        ...mockLoad,
        distanceKm: 840,
      })
      expect(prisma.load.create).toHaveBeenCalledWith({
        data: {
          userId,
          tonnageRequired: 15,
          loadingAddress: 'Chakan MIDC',
          loadingPin: '410501',
          loadingLat: 18.5204,
          loadingLng: 73.8567,
          unloadingAddress: 'Peenya Industrial Area',
          unloadingPin: '560058',
          unloadingLat: 12.9716,
          unloadingLng: 77.5946,
          truckType: 'Container',
          minLengthFt: 32,
          minHeightFt: 8,
          urgent: true,
          maxPrice: 65000,
          expectedDeliveryAt: dto.expectedDeliveryAt,
          advancePayable: 20000,
          status: LoadStatus.Open,
        },
      })

      // Verify safe executeRaw was called
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
      const calledArgs = (prisma.$executeRaw as jest.Mock).mock.calls[0]
      expect(calledArgs).toBeDefined()

      const queryParts = calledArgs[0]
      expect(queryParts[0]).toContain('UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint')

      expect(calledArgs[1]).toBe(73.8567) // loading lng first
      expect(calledArgs[2]).toBe(18.5204) // loading lat second
      expect(calledArgs[3]).toBe(77.5946) // unloading lng first
      expect(calledArgs[4]).toBe(12.9716) // unloading lat second
      expect(calledArgs[5]).toBe('load-new-uuid')
    })

    it('should handle $executeRaw errors gracefully', async () => {
      mockMapmyIndiaService.geocodeAddress
        .mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 }) // loading
        .mockResolvedValueOnce({ lat: 12.9716, lng: 77.5946 }) // unloading

      const mockLoad = { id: 'load-new-uuid' }
      ;(prisma.load.create as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.$executeRaw as jest.Mock).mockRejectedValueOnce(new Error('PostGIS Error'))

      const result = await service.create(userId, dto)
      expect(result).toBeDefined()
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    })
  })

  describe('findByUser', () => {
    it('should return paginated list of loads for a user', async () => {
      const mockLoads = [{ id: 'load-1' }]
      ;(prisma.load.findMany as jest.Mock).mockResolvedValueOnce(mockLoads)

      const result = await service.findByUser('user-123', LoadStatus.Open, 2, 10)
      expect(result).toEqual(mockLoads)
      expect(prisma.load.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: LoadStatus.Open },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      })
    })
  })

  describe('findOne', () => {
    it('should throw NotFoundException if load is not found', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.findOne('load-123')).rejects.toThrow(NotFoundException)
    })

    it('should mask contact info if requester is not the owner', async () => {
      const mockLoad = {
        id: 'load-123',
        userId: 'owner-id',
        user: { id: 'owner-id', name: 'John', phone: '123' },
      }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.findOne('load-123', 'other-user')
      expect(result.user.name).toBeNull()
      expect(result.user.phone).toBeNull()
    })

    it('should not mask contact info if requester is the owner', async () => {
      const mockLoad = {
        id: 'load-123',
        userId: 'owner-id',
        user: { id: 'owner-id', name: 'John', phone: '123' },
      }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.findOne('load-123', 'owner-id')
      expect(result.user.name).toBe('John')
      expect(result.user.phone).toBe('123')
    })
  })

  describe('updateStatus', () => {
    it('should throw NotFoundException if load not found or unauthorized', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        service.updateStatus('load-123', 'user-123', LoadStatus.Cancelled)
      ).rejects.toThrow(NotFoundException)
    })

    it('should successfully update load status', async () => {
      const mockLoad = { id: 'load-123', status: LoadStatus.Open }
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({
        ...mockLoad,
        status: LoadStatus.Cancelled,
      })

      const result = await service.updateStatus('load-123', 'user-123', LoadStatus.Cancelled)
      expect(result.status).toBe(LoadStatus.Cancelled)
      expect(prisma.load.update).toHaveBeenCalledWith({
        where: { id: 'load-123' },
        data: { status: LoadStatus.Cancelled },
      })
    })
  })

  describe('delete', () => {
    it('should throw NotFoundException if load is not Open or not owned', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.delete('load-123', 'user-123')).rejects.toThrow(NotFoundException)
    })

    it('should successfully delete open load', async () => {
      const mockLoad = { id: 'load-123', status: LoadStatus.Open }
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.delete('load-123', 'user-123')
      expect(result).toEqual({ success: true })
      expect(prisma.load.delete).toHaveBeenCalledWith({
        where: { id: 'load-123' },
      })
    })
  })
})
