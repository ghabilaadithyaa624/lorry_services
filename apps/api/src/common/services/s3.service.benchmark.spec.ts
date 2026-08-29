import { S3Service } from './s3.service'
import { ConfigService } from '@nestjs/config'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { performance } from 'perf_hooks'

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.com'),
}))

describe('S3Service Benchmark', () => {
  let service: S3Service

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'AWS_S3_BUCKET') return 'test-bucket'
        if (key === 'AWS_REGION') return 'us-east-1'
        return defaultValue
      }),
    } as unknown as ConfigService

    service = new S3Service(mockConfigService)
  })

  it('should benchmark caching performance at capacity limit for many iterations', async () => {
    // Fill the cache to its limit
    for (let i = 0; i < 1000; i++) {
      service['signedUrlCache'].set(`existing-key-${i}:3600`, {
        url: 'https://mock-signed-url.com',
        expiresAt: i < 500 ? Date.now() - 1000 : Date.now() + 3600 * 1000,
      })
    }

    // Now simulate concurrent requests for new keys to trigger eviction logic repeatedly
    const ITERATIONS = 10000
    const start = performance.now()

    // Make promises to resolve in parallel, typical load pattern
    const promises = []
    for (let i = 0; i < ITERATIONS; i++) {
      promises.push(service.getSignedUrl(`new-key-${i}`, 3600))
    }

    await Promise.all(promises)

    const end = performance.now()
    console.log(`Benchmark completed in ${(end - start).toFixed(2)}ms for ${ITERATIONS} operations at cache capacity.`)
    expect(true).toBe(true)
  })
})
