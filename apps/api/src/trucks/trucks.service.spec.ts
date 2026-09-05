import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TrucksService } from './trucks.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { VahanService } from '../common/services/vahan.service'
import { S3Service } from '../common/services/s3.service'
import { prisma, VerificationStatus } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const actual = jest.requireActual('@lorrycarry/database')
  return {
    ...actual,
    prisma: {
      $executeRaw: jest.fn(),
      truck: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      document: {
        create: jest.fn(),
      },
    },
  }
})

describe('TrucksService', () => {
  let service: TrucksService
  let mapmyIndiaService: MapmyIndiaService
  let s3Service: S3Service

  const mockMapmyIndiaService = {
    geocodeAddress: jest.fn(),
  }

  const mockVahanService = {
    isValidRegistrationFormat: jest.fn().mockReturnValue(true),
    validateRC: jest.fn().mockResolvedValue({ valid: false, found: false, source: 'unavailable' }),
    toPersistableSnapshot: jest.fn().mockReturnValue(null),
  }

  const mockS3Service = {
    validateFile: jest.fn(),
    uploadFile: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrucksService,
        { provide: MapmyIndiaService, useValue: mockMapmyIndiaService },
        { provide: VahanService, useValue: mockVahanService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile()

    service = module.get<TrucksService>(TrucksService)
    mapmyIndiaService = module.get<MapmyIndiaService>(MapmyIndiaService)
    s3Service = module.get<S3Service>(S3Service)
  })

  describe('create', () => {
    const userId = 'user-123'
    const dto = {
      registrationNumber: 'MH12AB1234',
      bodyType: 'Open' as any,
      lengthFt: 20,
      heightFt: 8,
      tonnageCapacity: 15,
      currentLocationAddress: 'Pune, Maharashtra',
      serviceableRadiusKm: 50,
      preferredDestinations: ['Mumbai'],
    }

    it('should throw ConflictException if registration number already exists', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'truck-123' })

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException)
      expect(prisma.truck.findUnique).toHaveBeenCalledWith({
        where: { registrationNumber: 'MH12AB1234' },
      })
    })

    it('should throw NotFoundException if geocoding fails', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce(null)

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException)
      expect(mockMapmyIndiaService.geocodeAddress).toHaveBeenCalledWith('Pune, Maharashtra')
    })

    it('should successfully create truck with default/missing optional fields', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 })

      const dtoWithoutOptionals = {
        ...dto,
      }
      delete dtoWithoutOptionals.serviceableRadiusKm
      delete dtoWithoutOptionals.preferredDestinations

      const mockTruck = { id: 'truck-new-uuid' }
      ;(prisma.truck.create as jest.Mock).mockResolvedValueOnce(mockTruck)
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      const result = await service.create(userId, dtoWithoutOptionals)
      expect(result).toEqual(mockTruck)
      expect(prisma.truck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceableRadiusKm: 50,
            preferredDestinations: [],
          })
        })
      )
    })

    it('should successfully create truck and update PostGIS geography using safe $executeRaw', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 })

      const mockTruck = {
        id: 'truck-new-uuid',
        userId,
        registrationNumber: 'MH12AB1234',
        bodyType: 'Open',
        lengthFt: 20,
        heightFt: 8,
        tonnageCapacity: 15,
        currentLat: 18.5204,
        currentLng: 73.8567,
        serviceableRadiusKm: 50,
        preferredDestinations: ['Mumbai'],
        verificationStatus: VerificationStatus.Pending,
      }
      ;(prisma.truck.create as jest.Mock).mockResolvedValueOnce(mockTruck)
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      const result = await service.create(userId, dto)

      expect(result).toEqual(mockTruck)
      expect(prisma.truck.create).toHaveBeenCalledWith({
        data: {
          userId,
          registrationNumber: 'MH12AB1234',
          bodyType: 'Open',
          lengthFt: 20,
          heightFt: 8,
          tonnageCapacity: 15,
          currentLat: 18.5204,
          currentLng: 73.8567,
          serviceableRadiusKm: 50,
          preferredDestinations: ['Mumbai'],
          verificationStatus: VerificationStatus.Pending,
        },
      })

      // Verify safe executeRaw was called
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
      const calledArgs = (prisma.$executeRaw as jest.Mock).mock.calls[0]
      expect(calledArgs).toBeDefined()

      const queryParts = calledArgs[0]
      expect(queryParts[0]).toContain('UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint')

      expect(calledArgs[1]).toBe(73.8567) // lng first for ST_MakePoint
      expect(calledArgs[2]).toBe(18.5204) // lat second
      expect(calledArgs[3]).toBe('truck-new-uuid')
    })

    it('should handle $executeRaw errors gracefully', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 })

      const mockTruck = { id: 'truck-new-uuid' }
      ;(prisma.truck.create as jest.Mock).mockResolvedValueOnce(mockTruck)
      ;(prisma.$executeRaw as jest.Mock).mockRejectedValueOnce(new Error('PostGIS Error'))

      // Should not throw, should succeed
      const result = await service.create(userId, dto)
      expect(result).toEqual(mockTruck)
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    })

    it('should reject malformed registration numbers before any DB/API work', async () => {
      mockVahanService.isValidRegistrationFormat.mockReturnValueOnce(false)
      await expect(
        service.create(userId, { ...dto, registrationNumber: 'NOT A PLATE' })
      ).rejects.toThrow(BadRequestException)
      expect(prisma.truck.findUnique).not.toHaveBeenCalled()
      expect(mockMapmyIndiaService.geocodeAddress).not.toHaveBeenCalled()
    })

    it('should persist the Vahan RC snapshot when validation succeeds', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 })
      mockVahanService.validateRC.mockResolvedValueOnce({
        valid: true,
        found: true,
        registrationNumber: 'MH12AB1234',
        source: 'vahan_api',
      })
      const snapshot = { registrationNumber: 'MH12AB1234', registrationStatus: 'ACTIVE', source: 'vahan_api' }
      mockVahanService.toPersistableSnapshot.mockReturnValueOnce(snapshot)
      ;(prisma.truck.create as jest.Mock).mockResolvedValueOnce({ id: 'truck-vahan' })

      await service.create(userId, dto)

      expect(mockVahanService.validateRC).toHaveBeenCalledWith('MH12AB1234')
      expect(prisma.truck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vahanDetails: snapshot,
            vahanValidatedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('should still register the truck when Vahan validation throws', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 18.5204, lng: 73.8567 })
      mockVahanService.validateRC.mockRejectedValueOnce(new Error('registry unreachable'))
      ;(prisma.truck.create as jest.Mock).mockResolvedValueOnce({ id: 'truck-offline' })
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      const result = await service.create(userId, dto)
      expect(result).toEqual({ id: 'truck-offline' })
      expect(prisma.truck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ vahanValidatedAt: expect.anything() }),
        }),
      )
    })
  })

  describe('uploadDocument', () => {
    const truckId = 'truck-123'
    const userId = 'user-123'
    const file = {
      buffer: Buffer.from('test-doc'),
      mimetype: 'application/pdf',
      originalname: 'rc.pdf',
      size: 1024,
    } as any

    it('should throw NotFoundException if truck does not exist', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        service.uploadDocument(truckId, userId, file, 'RC', 'MH12RC123')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if a non-admin uploads to another user\'s truck', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId: 'owner-999' })

      await expect(
        service.uploadDocument(truckId, userId, file, 'RC', 'MH12RC123')
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw ConflictException if file validation fails', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId })
      mockS3Service.validateFile.mockReturnValueOnce({ valid: false, error: 'File too large' })

      await expect(
        service.uploadDocument(truckId, userId, file, 'RC', 'MH12RC123')
      ).rejects.toThrow(ConflictException)
    })

    it('should upload to S3 and save document record without docNumber', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId })
      mockS3Service.validateFile.mockReturnValueOnce({ valid: true })
      mockS3Service.uploadFile.mockResolvedValueOnce({
        url: 'https://s3/ins.pdf',
        key: 'kyc/ins.pdf',
        signedUrl: 'https://s3/ins.pdf?signed=true',
      })

      const mockDocument = { id: 'doc-123' }
      ;(prisma.document.create as jest.Mock).mockResolvedValueOnce(mockDocument)

      const result = await service.uploadDocument(truckId, userId, file, 'Insurance')
      expect(result).toEqual({
        document: mockDocument,
        signedUrl: 'https://s3/ins.pdf?signed=true',
      })
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            docNumber: undefined,
          })
        })
      )
    })

    it('should upload to S3 and save RC document record', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId })
      mockS3Service.validateFile.mockReturnValueOnce({ valid: true })
      mockS3Service.uploadFile.mockResolvedValueOnce({
        url: 'https://s3/rc.pdf',
        key: 'kyc/rc.pdf',
        signedUrl: 'https://s3/rc.pdf?signed=true',
      })

      const mockDocument = {
        id: 'doc-123',
        truckId,
        type: 'RC',
        docNumber: 'MH12RC123',
        s3Url: 'https://s3/rc.pdf',
        s3Key: 'kyc/rc.pdf',
        originalFilename: 'rc.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        verificationStatus: VerificationStatus.Pending,
      }
      ;(prisma.document.create as jest.Mock).mockResolvedValueOnce(mockDocument)

      const result = await service.uploadDocument(truckId, userId, file, 'RC', 'MH12RC123')

      expect(result).toEqual({
        document: mockDocument,
        signedUrl: 'https://s3/rc.pdf?signed=true',
      })
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          truckId,
          type: 'RC',
          docNumber: 'MH12RC123',
          s3Url: 'https://s3/rc.pdf',
          s3Key: 'kyc/rc.pdf',
          originalFilename: 'rc.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          verificationStatus: VerificationStatus.Pending,
        },
      })
    })
  })

  describe('findByUser', () => {
    it('should return list of trucks for a user', async () => {
      const mockTrucks = [{ id: 'truck-1' }]
      ;(prisma.truck.findMany as jest.Mock).mockResolvedValueOnce(mockTrucks)

      const result = await service.findByUser('user-123')
      expect(result).toEqual(mockTrucks)
      expect(prisma.truck.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          documents: {
            select: {
              id: true,
              type: true,
              verificationStatus: true,
              verifiedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findOne', () => {
    it('should throw NotFoundException if truck is not found', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.findOne('truck-123')).rejects.toThrow(NotFoundException)
    })

    it('should mask user details if no requestingUserId is provided', async () => {
      const mockTruck = {
        id: 'truck-123',
        userId: 'owner-id',
        user: { id: 'owner-id', name: 'John', phone: '123' },
      }
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(mockTruck)

      const result = await service.findOne('truck-123')
      expect(result.user.name).toBeNull()
      expect(result.user.phone).toBeNull()
    })

    it('should return truck details with masked user details if requester is not owner', async () => {
      const mockTruck = {
        id: 'truck-123',
        userId: 'owner-id',
        user: { id: 'owner-id', name: 'John', phone: '123' },
      }
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(mockTruck)

      const result = await service.findOne('truck-123', 'other-user')
      expect(result.user.name).toBeNull()
      expect(result.user.phone).toBeNull()
    })

    it('should return truck details with unmasked user details if requester is owner', async () => {
      const mockTruck = {
        id: 'truck-123',
        userId: 'owner-id',
        user: { id: 'owner-id', name: 'John', phone: '123' },
      }
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(mockTruck)

      const result = await service.findOne('truck-123', 'owner-id')
      expect(result.user.name).toBe('John')
      expect(result.user.phone).toBe('123')
    })
  })

  describe('updateLocation', () => {
    const truckId = 'truck-123'
    const userId = 'user-123'

    it('should throw NotFoundException if truck does not exist', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        service.updateLocation(truckId, userId, 'Mumbai')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if a non-admin updates another user\'s truck', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId: 'owner-999' })

      await expect(
        service.updateLocation(truckId, userId, 'Mumbai')
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.truck.update).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException if address geocoding fails', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId })
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce(null)

      await expect(
        service.updateLocation(truckId, userId, 'Mumbai')
      ).rejects.toThrow(NotFoundException)
    })

    it('should handle $executeRaw errors gracefully in updateLocation', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId })
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 19.0760, lng: 72.8777 })

      const mockUpdatedTruck = { id: truckId, currentLat: 19.0760, currentLng: 72.8777 }
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce(mockUpdatedTruck)
      ;(prisma.$executeRaw as jest.Mock).mockRejectedValueOnce(new Error('PostGIS error'))

      const result = await service.updateLocation(truckId, userId, 'Mumbai')
      expect(result).toEqual(mockUpdatedTruck)
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    })

    it('should update location and PostGIS coordinates using safe $executeRaw', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: truckId, userId })
      mockMapmyIndiaService.geocodeAddress.mockResolvedValueOnce({ lat: 19.0760, lng: 72.8777 })

      const mockUpdatedTruck = { id: truckId, currentLat: 19.0760, currentLng: 72.8777 }
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce(mockUpdatedTruck)
      ;(prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(1)

      const result = await service.updateLocation(truckId, userId, 'Mumbai')

      expect(result).toEqual(mockUpdatedTruck)
      expect(prisma.truck.update).toHaveBeenCalledWith({
        where: { id: truckId },
        data: {
          currentLat: 19.0760,
          currentLng: 72.8777,
        },
      })

      // Verify safe executeRaw was called
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
      const calledArgs = (prisma.$executeRaw as jest.Mock).mock.calls[0]
      expect(calledArgs).toBeDefined()

      const queryParts = calledArgs[0]
      expect(queryParts[0]).toContain('UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint')

      expect(calledArgs[1]).toBe(72.8777) // lng first
      expect(calledArgs[2]).toBe(19.0760) // lat second
      expect(calledArgs[3]).toBe(truckId)
    })
  })
})
