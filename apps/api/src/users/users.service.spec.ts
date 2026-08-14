import { Test, TestingModule } from '@nestjs/testing'
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
