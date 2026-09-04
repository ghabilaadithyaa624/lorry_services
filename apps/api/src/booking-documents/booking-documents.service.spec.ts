import { Test, TestingModule } from '@nestjs/testing'
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { BookingDocumentsService } from './booking-documents.service'
import { prisma } from '@lorrycarry/database'
import { S3Service } from '../common/services/s3.service'

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    bookingDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('BookingDocumentsService', () => {
  let service: BookingDocumentsService
  let s3: { generatePresignedPutUrl: jest.Mock; objectExists: jest.Mock; getSignedUrl: jest.Mock }

  const bookingRow = { id: 'b1', loadOwnerId: 'load-owner-1', truckOwnerId: 'truck-owner-1' }
  const factoryOwner = { id: 'load-owner-1', role: 'factory_owner' }
  const truckDriver = { id: 'truck-owner-1', role: 'truck_driver' }
  const admin = { id: 'admin-1', role: 'admin' }
  const outsider = { id: 'stranger', role: 'factory_owner' }

  const docRow = {
    id: 'doc-1',
    bookingId: 'b1',
    stage: 'POD',
    docNumber: 'POD-8492',
    s3Key: 'booking-documents/b1/POD/uuid.jpg',
    originalFilename: 'pod.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1234,
    signedBy: 'Ramesh Kumar',
    uploadedById: 'truck-owner-1',
    uploadedAt: new Date('2026-09-01T10:00:00Z'),
    verificationStatus: 'Pending',
    verifiedById: null,
    verificationNotes: null,
    verifiedAt: null,
    uploadedBy: { id: 'truck-owner-1', name: 'Driver' },
    verifiedBy: null,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingDocumentsService,
        {
          provide: S3Service,
          useValue: {
            generatePresignedPutUrl: jest.fn().mockResolvedValue('https://signed-upload-url'),
            objectExists: jest.fn().mockResolvedValue(true),
            getSignedUrl: jest.fn().mockResolvedValue('https://signed-download-url'),
          },
        },
      ],
    }).compile()

    service = module.get<BookingDocumentsService>(BookingDocumentsService)
    s3 = module.get(S3Service) as any
    // Default: the booking exists and is owned by the two counterparties.
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('should list chain documents for a booking counterparty without exposing the s3 key', async () => {
      ;(prisma.bookingDocument.findMany as jest.Mock).mockResolvedValue([docRow])

      const result = await service.list('b1', factoryOwner)

      expect(prisma.booking.findUnique).toHaveBeenCalledWith({ where: { id: 'b1' }, select: expect.any(Object) })
      expect(prisma.bookingDocument.findMany).toHaveBeenCalledWith({
        where: { bookingId: 'b1' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      })
      expect(result.bookingId).toBe('b1')
      expect(result.documents).toHaveLength(1)
      expect(result.documents[0]).toMatchObject({
        id: 'doc-1',
        stage: 'POD',
        docNumber: 'POD-8492',
        originalFilename: 'pod.jpg',
      })
      expect(JSON.stringify(result)).not.toContain('s3Key')
      expect(JSON.stringify(result)).not.toContain('booking-documents/b1')
    })

    it('should allow an admin to read any booking chain', async () => {
      ;(prisma.bookingDocument.findMany as jest.Mock).mockResolvedValue([])
      await expect(service.list('b1', admin)).resolves.toEqual({ bookingId: 'b1', documents: [] })
    })

    it('should forbid a non-party user from listing', async () => {
      await expect(service.list('b1', outsider)).rejects.toThrow(ForbiddenException)
      expect(prisma.bookingDocument.findMany).not.toHaveBeenCalled()
    })

    it('should throw NotFound when the booking does not exist', async () => {
      ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(service.list('missing', factoryOwner)).rejects.toThrow(NotFoundException)
    })
  })

  describe('requestUploadUrl', () => {
    const dto = { stage: 'POD', fileName: 'pod.jpg', contentType: 'image/jpeg', docNumber: 'POD-1' }

    it('should issue a pre-signed upload url scoped to the booking and stage', async () => {
      const result = await service.requestUploadUrl('b1', truckDriver, dto as any)

      expect(s3.generatePresignedPutUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^booking-documents\/b1\/POD\/[a-f0-9-]+\.jpg$/),
        'image/jpeg',
        300,
      )
      expect(result).toMatchObject({
        bookingId: 'b1',
        stage: 'POD',
        contentType: 'image/jpeg',
        expiresIn: 300,
      })
      expect(result.uploadUrl).toBe('https://signed-upload-url')
      expect(result.key).toBe((s3.generatePresignedPutUrl.mock.calls[0][0]))
    })

    it('should allow uploads by either counterparty (truck driver)', async () => {
      const result = await service.requestUploadUrl('b1', truckDriver, dto as any)
      expect(result.uploadUrl).toBe('https://signed-upload-url')
    })

    it('should forbid uploads by users who are not a booking party (incl. admins)', async () => {
      await expect(service.requestUploadUrl('b1', outsider, dto as any)).rejects.toThrow(ForbiddenException)
      await expect(service.requestUploadUrl('b1', admin, dto as any)).rejects.toThrow(ForbiddenException)
      expect(s3.generatePresignedPutUrl).not.toHaveBeenCalled()
    })

    it('should surface storage failures as 500', async () => {
      s3.generatePresignedPutUrl.mockRejectedValueOnce(new Error('storage down'))
      await expect(service.requestUploadUrl('b1', truckDriver, dto as any)).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  describe('register', () => {
    const dto = {
      stage: 'POD',
      key: 'booking-documents/b1/POD/abc.jpg',
      contentType: 'image/jpeg',
      fileName: 'pod.jpg',
      docNumber: ' POD-8492 ',
      signedBy: 'Ramesh Kumar',
      fileSize: 2048,
    }

    it('should register a completed upload for a booking party', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.bookingDocument.create as jest.Mock).mockResolvedValue(docRow)

      const result = await service.register('b1', truckDriver, dto as any)

      expect(s3.objectExists).toHaveBeenCalledWith(dto.key)
      expect(prisma.bookingDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'b1',
          stage: 'POD',
          s3Key: dto.key,
          docNumber: 'POD-8492',
          originalFilename: 'pod.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2048,
          signedBy: 'Ramesh Kumar',
          uploadedById: 'truck-owner-1',
          verificationStatus: 'Pending',
        }),
        include: expect.any(Object),
      })
      expect(result.id).toBe('doc-1')
    })

    it('should reject a key that does not belong to this booking/stage', async () => {
      await expect(
        service.register('b1', truckDriver, { ...dto, key: 'booking-documents/OTHER/POD/abc.jpg' } as any),
      ).rejects.toThrow(BadRequestException)
      expect(prisma.bookingDocument.create).not.toHaveBeenCalled()
    })

    it('should reject a key whose extension does not match the content type', async () => {
      await expect(
        service.register('b1', truckDriver, { ...dto, key: 'booking-documents/b1/POD/abc.pdf' } as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject phantom registrations when the object is missing from storage', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(null)
      s3.objectExists.mockResolvedValueOnce(false)

      await expect(service.register('b1', truckDriver, dto as any)).rejects.toThrow(BadRequestException)
      expect(prisma.bookingDocument.create).not.toHaveBeenCalled()
    })

    it('should be idempotent when the same object is registered twice', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(docRow)

      const result = await service.register('b1', truckDriver, dto as any)

      expect(result.id).toBe('doc-1')
      expect(prisma.bookingDocument.create).not.toHaveBeenCalled()
    })

    it('should forbid registration by non-parties', async () => {
      await expect(service.register('b1', outsider, dto as any)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getDownloadUrl', () => {
    it('should return a time-limited pre-signed download url for a party', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(docRow)

      const result = await service.getDownloadUrl('b1', 'doc-1', factoryOwner)

      expect(prisma.bookingDocument.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc-1', bookingId: 'b1' },
      })
      expect(s3.getSignedUrl).toHaveBeenCalledWith(docRow.s3Key, 3600)
      expect(result).toMatchObject({
        bookingId: 'b1',
        documentId: 'doc-1',
        stage: 'POD',
        fileName: 'pod.jpg',
        downloadUrl: 'https://signed-download-url',
        expiresIn: 3600,
      })
    })

    it('should allow admins to download any booking document (read/verify access)', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(docRow)
      const result = await service.getDownloadUrl('b1', 'doc-1', admin)
      expect(result.downloadUrl).toBe('https://signed-download-url')
    })

    it('should forbid non-parties', async () => {
      await expect(service.getDownloadUrl('b1', 'doc-1', outsider)).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFound for an unknown document', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(service.getDownloadUrl('b1', 'missing', factoryOwner)).rejects.toThrow(NotFoundException)
    })

    it('should surface storage failures as 500', async () => {
      ;(prisma.bookingDocument.findFirst as jest.Mock).mockResolvedValue(docRow)
      s3.getSignedUrl.mockRejectedValueOnce(new Error('storage down'))
      await expect(service.getDownloadUrl('b1', 'doc-1', factoryOwner)).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  describe('admin queue', () => {
    it('should list booking documents with filters and pagination', async () => {
      ;(prisma.bookingDocument.findMany as jest.Mock).mockResolvedValue([{ ...docRow, booking: { id: 'b1' } }])
      ;(prisma.bookingDocument.count as jest.Mock).mockResolvedValue(41)

      const result = await service.listForAdmin({ status: 'Pending', bookingId: 'b1', page: 3, limit: 20 })

      expect(prisma.bookingDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { verificationStatus: 'Pending', bookingId: 'b1' },
          skip: 40,
          take: 20,
        }),
      )
      expect(result).toMatchObject({ total: 41, page: 3, limit: 20 })
      expect(result.data).toHaveLength(1)
    })

    it('should clamp pagination defaults', async () => {
      ;(prisma.bookingDocument.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.bookingDocument.count as jest.Mock).mockResolvedValue(0)

      await service.listForAdmin({})

      expect(prisma.bookingDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      )
    })

    it('should verify a pending document', async () => {
      ;(prisma.bookingDocument.findUnique as jest.Mock).mockResolvedValue(docRow)
      ;(prisma.bookingDocument.update as jest.Mock).mockResolvedValue({
        ...docRow,
        verificationStatus: 'Verified',
        verifiedById: 'admin-1',
        verifiedAt: new Date(),
      })

      const result = await service.verify('admin-1', 'doc-1', 'Verified', 'Looks good')

      expect(prisma.bookingDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: expect.objectContaining({
          verificationStatus: 'Verified',
          verifiedById: 'admin-1',
          verificationNotes: 'Looks good',
          verifiedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      })
      expect(result.verificationStatus).toBe('Verified')
    })

    it('should throw NotFound when verifying an unknown document', async () => {
      ;(prisma.bookingDocument.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(service.verify('admin-1', 'missing', 'Rejected')).rejects.toThrow(NotFoundException)
    })
  })
})
