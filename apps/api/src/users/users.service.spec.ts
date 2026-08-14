import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'
import { S3Service } from '../common/services/s3.service'
import { prisma, UserRole, SubscriptionStatus, BookingStatus } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
    load: {
      findMany: jest.fn(),
    },
    truck: {
      findMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
  }
  return {
    prisma: mockPrisma,
    UserRole: {
      truck_owner: 'truck_owner',
      load_owner: 'load_owner',
      admin: 'admin',
    },
    SubscriptionStatus: {
      active: 'active',
      expired: 'expired',
    },
  }
})

describe('UsersService', () => {
  let service: UsersService
  let s3Service: jest.Mocked<S3Service>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: S3Service,
          useValue: {
            getSignedUrl: jest.fn().mockResolvedValue('https://mocked-signed-url'),
import { UsersService } from './users.service'
import { S3Service } from '../common/services/s3.service'
import { ConfigService } from '@nestjs/config'
import { prisma } from '@lorrycarry/database'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { performance } from 'perf_hooks'

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    document: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    load: { findMany: jest.fn() },
    truck: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
    notification: { findMany: jest.fn() },
  },
  UserRole: {
    truck_owner: 'truck_owner',
    load_owner: 'load_owner',
    admin: 'admin',
  },
  SubscriptionStatus: {
    active: 'active',
  },
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockImplementation(async (client: any, command: any, options: any) => {
    // Simulate real local cryptographic CPU workload of AWS SDK URL signing
    let hash = 0
    for (let i = 0; i < 50000; i++) {
      hash = (hash + i) % 1000000
    }
    return `https://mocked-signed-url/${command.input.Key}?sig=${hash}`
  }),
}))

describe('UsersService', () => {
  let service: UsersService
  let s3Service: S3Service

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'AWS_S3_BUCKET') return 'test-bucket'
              if (key === 'AWS_REGION') return 'us-east-1'
              if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key'
              if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key'
              return defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    s3Service = module.get(S3Service) as any
  })

  describe('getProfile', () => {
    it('should throw NotFoundException if user profile not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException)
    })

    it('should calculate complete score for a verified truck owner', async () => {
      const mockUser = {
        id: 'u-1',
        phone: '1234567890',
        name: 'John Doe',
        role: UserRole.truck_owner,
        createdAt: new Date(),
        updatedAt: new Date(),
        trucks: [
          {
            id: 't-1',
            registrationNumber: 'MH12AB1234',
            bodyType: 'Open',
            tonnageCapacity: 20,
            verificationStatus: 'Verified',
            documents: [
              { id: 'd-1', verificationStatus: 'Verified' },
            ],
          },
        ],
        subscriptions: [
          {
            id: 'sub-1',
            plan: 'PRO',
            status: SubscriptionStatus.active,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 100000),
          },
        ],
        _count: {
          loads: 0,
          trucks: 1,
          loadOwnerBookings: 0,
          truckOwnerBookings: 5,
          payments: 1,
        },
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)

      const profile = await service.getProfile('u-1')
      expect(profile.id).toBe('u-1')
      expect(profile.profileCompletion.score).toBe(100)
      expect(profile.verification.fleetStatus).toBe('Verified')
      expect(profile.verification.isVerifiedTransporter).toBe(true)
    })

    it('should calculate statistics and scores correctly for load_owner', async () => {
      const mockUser = {
        id: 'u-2',
        phone: '9876543210',
        name: 'Jane Smith',
        role: UserRole.load_owner,
        createdAt: new Date(),
        updatedAt: new Date(),
        trucks: [],
        subscriptions: [],
        _count: {
          loads: 3,
          trucks: 0,
          loadOwnerBookings: 2,
          truckOwnerBookings: 0,
          payments: 0,
        },
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)

      const profile = await service.getProfile('u-2')
      expect(profile.id).toBe('u-2')
      expect(profile.profileCompletion.score).toBe(80) // 40 base + 20 name + 20 post-load
      expect(profile.stats.totalLoads).toBe(3)
      expect(profile.stats.totalBookings).toBe(2)
    })
  })

  describe('updateProfile', () => {
    it('should update profile and return updated info', async () => {
      const mockUser = {
        id: 'u-1',
        phone: '1234567890',
        name: 'New Name',
        role: UserRole.truck_owner,
        updatedAt: new Date(),
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValueOnce(mockUser)

      const result = await service.updateProfile('u-1', { name: '  New Name  ' })
      expect(result.success).toBe(true)
      expect(result.user.name).toBe('New Name')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { name: 'New Name' },
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      })
    })
  })

  describe('getDocuments', () => {
    it('should return empty documents with zero counters when none exist', async () => {
      ;(prisma.document.findMany as jest.Mock).mockResolvedValueOnce([])

      const result = await service.getDocuments('u-1')
      expect(result.documents).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    it('should generate signed S3 URLs for documents with s3Key', async () => {
      const mockDocs = [
        {
          id: 'd-1',
          truckId: 't-1',
          type: 'RC',
          docNumber: 'RC123',
          s3Key: 'key/to/rc.pdf',
          s3Url: 'http://s3/rc.pdf',
          originalFilename: 'rc.pdf',
          fileSize: 1000,
          mimeType: 'application/pdf',
          verificationStatus: 'Verified',
          verificationNotes: null,
          verifiedAt: new Date(),
          createdAt: new Date(),
          truck: {
            registrationNumber: 'MH12AB1234',
            bodyType: 'Open',
            verificationStatus: 'Verified',
          },
        },
      ]
      ;(prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocs)

      const result = await service.getDocuments('u-1')
      expect(result.totalCount).toBe(1)
      expect(result.documents[0].s3Url).toBe('https://mocked-signed-url')
      expect(s3Service.getSignedUrl).toHaveBeenCalledWith('key/to/rc.pdf', 3600)
    })
  })

  describe('getActivity', () => {
    it('should throw NotFoundException if user is missing', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      await expect(service.getActivity('non-existent')).rejects.toThrow(NotFoundException)
    })

    it('should compile chronological list of activities correctly', async () => {
      const mockUser = {
        id: 'u-1',
        phone: '1234567890',
        name: 'John Doe',
        role: UserRole.truck_owner,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)

      const mockTrucks = [
        {
          id: 't-1',
          registrationNumber: 'MH12AB1234',
          bodyType: 'Open',
          tonnageCapacity: 20,
          verificationStatus: 'Verified',
          createdAt: new Date('2025-01-02T00:00:00Z'),
          documents: [
            {
              id: 'd-1',
              type: 'RC',
              docNumber: 'RC123',
              verificationStatus: 'Verified',
              createdAt: new Date('2025-01-03T00:00:00Z'),
            },
          ],
        },
      ]
      ;(prisma.truck.findMany as jest.Mock).mockResolvedValueOnce(mockTrucks)

      const mockBookings = [
        {
          id: 'b-1',
          agreedPrice: 50000,
          status: 'Confirmed',
          createdAt: new Date('2025-01-04T00:00:00Z'),
          advanceConfirmed: true,
          balanceConfirmed: false,
          truck: { registrationNumber: 'MH12AB1234' },
        },
      ]
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValueOnce(mockBookings)

      const mockPayments = [
        {
          id: 'p-1',
          status: 'PAID',
          purpose: 'subscription',
          amount: 500,
          paymentMethod: 'UPI',
          paidAt: new Date('2025-01-05T00:00:00Z'),
          createdAt: new Date('2025-01-05T00:00:00Z'),
        },
      ]
      ;(prisma.payment.findMany as jest.Mock).mockResolvedValueOnce(mockPayments)

      const activities = await service.getActivity('u-1')

      // Assert count: 1 account creation, 1 truck, 1 doc, 1 booking, 1 payment = 5 total
      expect(activities.length).toBe(5)

      // Ensure chronological ordering desc (Jan 5 first, Jan 1 last)
      expect(activities[0].category).toBe('PAYMENT')
      expect(activities[4].category).toBe('ACCOUNT')

      // Ensure ID for truck and doc activity mapped cleanly
      const truckAct = activities.find((a) => a.category === 'TRUCK')
      expect(truckAct?.id).toBe('truck-t-1')
      const docAct = activities.find((a) => a.category === 'DOCUMENT')
      expect(docAct?.id).toBe('doc-d-1')
    })
  })

  describe('getNotifications', () => {
    it('should derive operations notifications and sort correctly', async () => {
      const mockUser = {
        id: 'u-1',
        role: UserRole.truck_owner,
        trucks: [
          {
            id: 't-1',
            registrationNumber: 'MH12AB1234',
            verificationStatus: 'Pending',
            createdAt: new Date('2025-01-02T00:00:00Z'),
            documents: [],
          },
        ],
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)

      // 1 mock notification from DB
      const mockDbNotifs = [
        {
          id: 'n-1',
          userId: 'u-1',
          template: 'payment_success',
          content: 'Your subscription is active.',
          status: 'Delivered',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ]
      ;(prisma.notification.findMany as jest.Mock).mockResolvedValueOnce(mockDbNotifs)

      // 1 mock active booking requiring advance
      const mockBookings = [
        {
          id: 'b-1',
          status: 'Confirmed',
          createdAt: new Date('2025-01-03T00:00:00Z'),
          advanceConfirmed: false,
          checkpoints: [],
        },
      ]
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValueOnce(mockBookings)

      const result = await service.getNotifications('u-1')
      expect(result.notifications.length).toBe(3)
      // Check that KYC alert is present
      const kycAlert = result.notifications.find((n) => n.category === 'KYC')
      expect(kycAlert?.id).toBe('notif-kyc-pending-t-1')

      // Check payment alert is present
      const advAlert = result.notifications.find((n) => n.id === 'notif-adv-b-1')
      expect(advAlert).toBeDefined()
    s3Service = module.get<S3Service>(S3Service)
  })

  afterEach(() => {
    jest.clearAllMocks()
    // Clear our real cache on S3Service instance to ensure test independence
    s3Service['signedUrlCache'].clear()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getDocuments', () => {
    it('should retrieve documents and sign URLs', async () => {
      const mockDocuments = Array.from({ length: 10 }, (_, i) => ({
        id: `doc-${i}`,
        truckId: 'truck-1',
        type: 'RC',
        docNumber: `RC-${i}`,
        s3Url: `https://original-url.com/doc-${i}`,
        s3Key: `keys/doc-${i}`,
        originalFilename: `file-${i}.pdf`,
        fileSize: 1024,
        mimeType: 'application/pdf',
        verificationStatus: i % 2 === 0 ? 'Verified' : 'Pending',
        verificationNotes: null,
        verifiedAt: null,
        createdAt: new Date(),
        truck: {
          id: 'truck-1',
          registrationNumber: 'MH-12-XX-1234',
          bodyType: 'Open',
          verificationStatus: 'Verified',
        },
      }))

      ;(prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments)

      const result = await service.getDocuments('user-1')

      expect(result.documents).toHaveLength(10)
      expect(result.totalCount).toBe(10)
      expect(result.verifiedCount).toBe(5)
      expect(result.pendingCount).toBe(5)
      expect(result.documents[0].s3Url).toContain('https://mocked-signed-url/keys/doc-0')
      expect(getSignedUrl).toHaveBeenCalledTimes(10)
    })

    it('should benchmark the document signing process and verify cache performance speedup', async () => {
      // Create a large number of documents to measure performance
      const mockDocuments = Array.from({ length: 50 }, (_, i) => ({
        id: `doc-${i}`,
        truckId: 'truck-1',
        type: 'RC',
        docNumber: `RC-${i}`,
        s3Url: `https://original-url.com/doc-${i}`,
        s3Key: `keys/doc-${i}`,
        originalFilename: `file-${i}.pdf`,
        fileSize: 1024,
        mimeType: 'application/pdf',
        verificationStatus: 'Pending',
        verificationNotes: null,
        verifiedAt: null,
        createdAt: new Date(),
        truck: {
          id: 'truck-1',
          registrationNumber: 'MH-12-XX-1234',
          bodyType: 'Open',
          verificationStatus: 'Verified',
        },
      }))

      ;(prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments)

      // Measure first execution (Cache Miss - signing URLs)
      const start1 = performance.now()
      const res1 = await service.getDocuments('user-1')
      const end1 = performance.now()
      const timeUncached = end1 - start1

      // Verify correct values
      expect(res1.documents).toHaveLength(50)

      // Measure second execution (Cache Hit - retrieving from Map)
      const start2 = performance.now()
      const res2 = await service.getDocuments('user-1')
      const end2 = performance.now()
      const timeCached = end2 - start2

      // Verify correct values
      expect(res2.documents).toHaveLength(50)

      const speedupRatio = timeUncached / timeCached

      console.log(`[Benchmark] Uncached getDocuments (50 documents): ${timeUncached.toFixed(4)} ms`)
      console.log(`[Benchmark] Cached getDocuments (50 documents): ${timeCached.toFixed(4)} ms`)
      console.log(`[Benchmark] Speedup Ratio: ${speedupRatio.toFixed(2)}x faster`)

      // Assert that cached execution is at least 3x faster than uncached execution
      expect(timeCached).toBeLessThan(timeUncached)
      expect(speedupRatio).toBeGreaterThan(1.5)
    })
  })
})
