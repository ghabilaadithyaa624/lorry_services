import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
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

    it('should default urgent to false if not provided', async () => {
      mockMapmyIndiaService.geocodeAddress
        .mockResolvedValue({ lat: 18.5204, lng: 73.8567 })

      const dtoWithoutUrgent = { ...dto }
      delete dtoWithoutUrgent.urgent

      const mockLoad = { id: 'load-new-uuid' }
      ;(prisma.load.create as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      await service.create(userId, dtoWithoutUrgent)

      expect(prisma.load.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            urgent: false,
          }),
        })
      )
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

    it('should use default page and limit and not filter by status if omitted', async () => {
      const mockLoads = [{ id: 'load-1' }]
      ;(prisma.load.findMany as jest.Mock).mockResolvedValueOnce(mockLoads)

      await service.findByUser('user-123')
      expect(prisma.load.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      })
    })

    it('should clamp safe limits when out of bound values are provided', async () => {
      const mockLoads = [{ id: 'load-1' }]
      ;(prisma.load.findMany as jest.Mock).mockResolvedValueOnce(mockLoads)

      await service.findByUser('user-123', undefined, 0, 150)
      expect(prisma.load.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0, // Math.max(1, 0) -> 1, skip = (1-1)*limit = 0
        take: 100, // Math.min(100, Math.max(1, 150)) -> 100
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
    it('should throw NotFoundException if load not found', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        service.updateStatus('load-123', 'user-123', LoadStatus.Cancelled)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if a non-admin edits another user\'s load', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'owner-999',
        status: LoadStatus.Open,
      })

      await expect(
        service.updateStatus('load-123', 'user-123', LoadStatus.Cancelled)
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.update).not.toHaveBeenCalled()
    })

    it('should successfully update load status for the owner', async () => {
      const mockLoad = { id: 'load-123', userId: 'user-123', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
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

    it('should allow an admin to update another user\'s load status', async () => {
      const mockLoad = { id: 'load-123', userId: 'owner-999', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({
        ...mockLoad,
        status: LoadStatus.Cancelled,
      })

      const result = await service.updateStatus('load-123', 'admin-1', LoadStatus.Cancelled, 'admin')
      expect(result.status).toBe(LoadStatus.Cancelled)
    })
  })

  describe('update', () => {
    it('should throw NotFoundException if load not found', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        service.update('load-123', 'user-123', { tonnageRequired: 20 })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if a non-admin edits another user\'s load', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'owner-999',
        status: LoadStatus.Open,
      })

      await expect(
        service.update('load-123', 'user-123', { tonnageRequired: 20 })
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.update).not.toHaveBeenCalled()
    })

    it('should refuse edits once the load has left Open status', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'user-123',
        status: LoadStatus.InTransit,
      })

      await expect(
        service.update('load-123', 'user-123', { tonnageRequired: 20 })
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.update).not.toHaveBeenCalled()
    })

    it('should persist only the provided fields for the owner', async () => {
      const mockLoad = { id: 'load-123', userId: 'user-123', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({
        ...mockLoad,
        tonnageRequired: 20,
        maxPrice: 52000,
      })

      const result = await service.update('load-123', 'user-123', {
        tonnageRequired: 20,
        maxPrice: 52000,
      })
      expect(result.tonnageRequired).toBe(20)
      expect(prisma.load.update).toHaveBeenCalledWith({
        where: { id: 'load-123' },
        data: { tonnageRequired: 20, maxPrice: 52000 },
        include: { _count: { select: { bookings: true } } },
      })
    })

    it('should allow an admin to edit another user\'s open load', async () => {
      const mockLoad = { id: 'load-123', userId: 'owner-999', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({ ...mockLoad, urgent: true })

      const result = await service.update('load-123', 'admin-1', { urgent: true }, 'admin')
      expect(result.urgent).toBe(true)
    })

    it('should let a transporter update their own load', async () => {
      const mockLoad = { id: 'load-123', userId: 'transporter-1', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({
        ...mockLoad,
        tonnageRequired: 22,
        maxPrice: 71000,
      })

      const result = await service.update(
        'load-123',
        'transporter-1',
        { tonnageRequired: 22, maxPrice: 71000 },
        'transporter'
      )
      expect(result.tonnageRequired).toBe(22)
      expect(prisma.load.update).toHaveBeenCalledWith({
        where: { id: 'load-123' },
        data: { tonnageRequired: 22, maxPrice: 71000 },
        include: { _count: { select: { bookings: true } } },
      })
    })

    it('should reject a transporter editing another user\'s load', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'owner-999',
        status: LoadStatus.Open,
      })

      await expect(
        service.update('load-123', 'transporter-1', { tonnageRequired: 22 }, 'transporter')
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.update).not.toHaveBeenCalled()
    })

    it('should persist an edited expected delivery date', async () => {
      const when = new Date('2026-04-01T09:30:00.000Z')
      const mockLoad = { id: 'load-123', userId: 'user-123', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({
        ...mockLoad,
        expectedDeliveryAt: when,
      })

      await service.update('load-123', 'user-123', {
        // Transport payloads carry ISO strings; the service normalizes to Date.
        expectedDeliveryAt: when.toISOString() as unknown as Date,
      })
      expect(prisma.load.update).toHaveBeenCalledWith({
        where: { id: 'load-123' },
        data: { expectedDeliveryAt: when },
        include: { _count: { select: { bookings: true } } },
      })
    })

    it('should re-geocode and persist an edited loading address (owner)', async () => {
      const mockLoad = {
        id: 'load-123',
        userId: 'user-123',
        status: LoadStatus.Open,
        loadingAddress: 'Chakan MIDC',
        loadingPin: '410501',
        loadingLat: 18.5204,
        loadingLng: 73.8567,
        unloadingAddress: 'Peenya Industrial Area',
        unloadingPin: '560058',
        unloadingLat: 12.9716,
        unloadingLng: 77.5946,
      }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce(mockLoad)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 19.076, lng: 72.8777 })
      mockMapmyIndiaService.calculateDistance.mockReturnValueOnce(850)
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      const result = await service.update('load-123', 'user-123', {
        loadingAddress: 'Andheri East',
        loadingPin: '400069',
      })

      expect(mockMapmyIndiaService.geocodeAddress).toHaveBeenCalledWith('Andheri East, 400069')
      expect(prisma.load.update).toHaveBeenCalledWith({
        where: { id: 'load-123' },
        data: {
          loadingAddress: 'Andheri East',
          loadingPin: '400069',
          loadingLat: 19.076,
          loadingLng: 72.8777,
        },
        include: { _count: { select: { bookings: true } } },
      })

      // Only the loading PostGIS point is refreshed
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
      const args = (prisma.$executeRaw as jest.Mock).mock.calls[0][0]
      expect(args.join('')).toContain('loading_point = ST_SetSRID')
      expect(args.join('')).not.toContain('unloading_point = ST_SetSRID')
      expect((prisma.$executeRaw as jest.Mock).mock.calls[0][1]).toBe(72.8777)
      expect((prisma.$executeRaw as jest.Mock).mock.calls[0][2]).toBe(19.076)

      // Corridor distance recomputed against the new coordinate
      expect((result as any).distanceKm).toBe(850)
    })

    it('should re-geocode both endpoints when both addresses are edited', async () => {
      const mockLoad = {
        id: 'load-123',
        userId: 'user-123',
        status: LoadStatus.Open,
        loadingAddress: 'Chakan MIDC',
        loadingPin: '410501',
        unloadingAddress: 'Peenya Industrial Area',
        unloadingPin: '560058',
      }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce(mockLoad)
      mockMapmyIndiaService.geocodeAddress
        .mockResolvedValueOnce({ lat: 18.6, lng: 73.7 }) // loading
        .mockResolvedValueOnce({ lat: 13.0, lng: 77.5 }) // unloading
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      await service.update('load-123', 'user-123', {
        loadingAddress: 'New Loading Point',
        unloadingAddress: 'New Unloading Point',
      })

      expect(mockMapmyIndiaService.geocodeAddress).toHaveBeenNthCalledWith(1, 'New Loading Point, 410501')
      expect(mockMapmyIndiaService.geocodeAddress).toHaveBeenNthCalledWith(2, 'New Unloading Point, 560058')

      const args = (prisma.$executeRaw as jest.Mock).mock.calls[0]
      expect(args[0].join('')).toContain('loading_point = ST_SetSRID')
      expect(args[0].join('')).toContain('unloading_point = ST_SetSRID')
      expect(args[1]).toBe(73.7)
      expect(args[3]).toBe(77.5)
      expect(args[5]).toBe('load-123')
    })

    it('should reject the whole edit when a new address cannot be geocoded', async () => {
      const mockLoad = {
        id: 'load-123',
        userId: 'user-123',
        status: LoadStatus.Open,
        loadingAddress: 'Chakan MIDC',
        loadingPin: '410501',
      }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce(null)

      await expect(
        service.update('load-123', 'user-123', { loadingAddress: 'Nowhere' })
      ).rejects.toThrow(NotFoundException)
      expect(prisma.load.update).not.toHaveBeenCalled()
      expect(prisma.$executeRaw).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should throw NotFoundException if load not found', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.delete('load-123', 'user-123')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if a non-admin deletes another user\'s load', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'owner-999',
        status: LoadStatus.Open,
      })

      await expect(service.delete('load-123', 'user-123')).rejects.toThrow(ForbiddenException)
      expect(prisma.load.delete).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException if the load is not Open', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'user-123',
        status: LoadStatus.Matched,
      })

      await expect(service.delete('load-123', 'user-123')).rejects.toThrow(NotFoundException)
      expect(prisma.load.delete).not.toHaveBeenCalled()
    })

    it('should successfully delete open load owned by the user', async () => {
      const mockLoad = { id: 'load-123', userId: 'user-123', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.delete('load-123', 'user-123')
      expect(result).toEqual({ success: true })
      expect(prisma.load.delete).toHaveBeenCalledWith({
        where: { id: 'load-123' },
      })
    })

    it('should let a transporter delete their own open load', async () => {
      const mockLoad = { id: 'load-123', userId: 'transporter-1', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.delete('load-123', 'transporter-1', 'transporter')
      expect(result).toEqual({ success: true })
      expect(prisma.load.delete).toHaveBeenCalledWith({ where: { id: 'load-123' } })
    })

    it('should reject a transporter deleting another user\'s load', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-123',
        userId: 'owner-999',
        status: LoadStatus.Open,
      })

      await expect(
        service.delete('load-123', 'transporter-1', 'transporter')
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.delete).not.toHaveBeenCalled()
    })

    it('should allow an admin to delete another user\'s open load', async () => {
      const mockLoad = { id: 'load-123', userId: 'owner-999', status: LoadStatus.Open }
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce(mockLoad)

      const result = await service.delete('load-123', 'admin-1', 'admin')
      expect(result).toEqual({ success: true })
      expect(prisma.load.delete).toHaveBeenCalledWith({ where: { id: 'load-123' } })
    })
  })
})
