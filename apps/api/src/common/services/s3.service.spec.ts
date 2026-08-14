import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { S3Service } from './s3.service'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}))

describe('S3Service', () => {
  let service: S3Service
  let configService: ConfigService
  let s3SendSpy: jest.SpyInstance

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'AWS_S3_BUCKET') return 'test-bucket'
              if (key === 'AWS_REGION') return 'us-east-1'
              if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key'
              if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key'
              if (key === 'AWS_S3_ENDPOINT') return 'https://s3.amazonaws.com'
              return defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<S3Service>(S3Service)
    configService = module.get<ConfigService>(ConfigService)

    // Spy on the s3Client's send method
    s3SendSpy = jest.spyOn(service['s3Client'], 'send')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('constructor', () => {
    it('should initialize with default config when options are not provided', async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          return defaultValue
        }),
      } as unknown as ConfigService

      const testService = new S3Service(mockConfigService)
      expect(testService).toBeDefined()
      expect(testService['bucket']).toBe('lorrycarry-kyc')

      const s3Config = await testService['s3Client'].config
      expect(s3Config.region()).resolves.toBe('ap-south-1')
      expect(s3Config.endpoint).toBeUndefined()
    })

    it('should configure S3Client endpoint and forcePathStyle when specified', async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'AWS_S3_BUCKET') return 'custom-bucket'
          if (key === 'AWS_REGION') return 'us-west-2'
          if (key === 'AWS_S3_ENDPOINT') return 'http://localhost:9000'
          if (key === 'AWS_S3_FORCE_PATH_STYLE') return 'true'
          if (key === 'AWS_ACCESS_KEY_ID') return 'key'
          if (key === 'AWS_SECRET_ACCESS_KEY') return 'secret'
          return defaultValue
        }),
      } as unknown as ConfigService

      const testService = new S3Service(mockConfigService)
      expect(testService['bucket']).toBe('custom-bucket')

      const s3Config = await testService['s3Client'].config
      expect(s3Config.region()).resolves.toBe('us-west-2')
      expect(s3Config.endpoint).toBeDefined()
      // Evaluate endpoint function if dynamic
      const endpointObj = typeof s3Config.endpoint === 'function' ? await (s3Config.endpoint as any)() : s3Config.endpoint
      expect(endpointObj.hostname).toBe('localhost')
      expect(s3Config.forcePathStyle).toBe(true)
    })
  })

  describe('validateFile', () => {
    const mockFile = (size: number, mimetype: string): Express.Multer.File => {
      return {
        fieldname: 'file',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype,
        size,
        buffer: Buffer.from([]),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      }
    }

    it('should validate successfully when file size and type are within allowed values', () => {
      const file = mockFile(2 * 1024 * 1024, 'image/png') // 2MB
      const allowedTypes = ['image/png', 'image/jpeg']

      const result = service.validateFile(file, allowedTypes, 5)

      expect(result).toEqual({ valid: true })
    })

    it('should return error when file size exceeds the custom max size limit', () => {
      const file = mockFile(6 * 1024 * 1024, 'image/png') // 6MB
      const allowedTypes = ['image/png', 'image/jpeg']

      const result = service.validateFile(file, allowedTypes, 5)

      expect(result).toEqual({
        valid: false,
        error: 'File too large. Max size: 5MB',
      })
    })

    it('should return error when file size exceeds the default max size limit (5MB)', () => {
      const file = mockFile(5.1 * 1024 * 1024, 'image/png') // 5.1MB
      const allowedTypes = ['image/png', 'image/jpeg']

      const result = service.validateFile(file, allowedTypes)

      expect(result).toEqual({
        valid: false,
        error: 'File too large. Max size: 5MB',
      })
    })

    it('should return error when file mimetype is not allowed', () => {
      const file = mockFile(2 * 1024 * 1024, 'application/pdf') // PDF
      const allowedTypes = ['image/png', 'image/jpeg']

      const result = service.validateFile(file, allowedTypes, 5)

      expect(result).toEqual({
        valid: false,
        error: 'Invalid file type. Allowed: image/png, image/jpeg',
      })
    })
  })

  describe('getSignedUrl', () => {
    it('should call getSignedUrl with correct parameters and return signed URL', async () => {
      const mockSignedUrl = 'https://mocked-signed-url'
      const key = 'test-folder/test-user/test-file.png'
      const expiresIn = 3600

      const mockGetSignedUrl = getSignedUrl as jest.Mock
      mockGetSignedUrl.mockResolvedValueOnce(mockSignedUrl)

      const result = await service.getSignedUrl(key, expiresIn)

      expect(result).toBe(mockSignedUrl)
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        service['s3Client'],
        expect.any(GetObjectCommand),
        { expiresIn }
      )
    })

    it('should cache consecutive requests for the same key and expiration', async () => {
      const mockSignedUrl = 'https://mocked-signed-url'
      const key = 'test-folder/test-user/test-file.png'
      const expiresIn = 3600

      const mockGetSignedUrl = getSignedUrl as jest.Mock
      mockGetSignedUrl.mockResolvedValueOnce(mockSignedUrl)

      // First call (cache miss)
      const result1 = await service.getSignedUrl(key, expiresIn)
      // Second call (cache hit)
      const result2 = await service.getSignedUrl(key, expiresIn)

      expect(result1).toBe(mockSignedUrl)
      expect(result2).toBe(mockSignedUrl)
      // getSignedUrl should only be called once
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1)
    })

    it('should bypass cache if cached URL is close to expiration (within buffer)', async () => {
      const mockSignedUrl1 = 'https://mocked-signed-url-1'
      const mockSignedUrl2 = 'https://mocked-signed-url-2'
      const key = 'test-folder/test-user/test-file.png'
      const expiresIn = 3600

      const mockGetSignedUrl = getSignedUrl as jest.Mock
      mockGetSignedUrl
        .mockResolvedValueOnce(mockSignedUrl1)
        .mockResolvedValueOnce(mockSignedUrl2)

      // First call to generate and cache
      await service.getSignedUrl(key, expiresIn)

      // Manually manipulate the cache entry to simulate a nearly expired URL (expires within the 5 minute safety buffer)
      const cacheKey = `${key}:${expiresIn}`
      const cachedEntry = service['signedUrlCache'].get(cacheKey)
      if (cachedEntry) {
        cachedEntry.expiresAt = Date.now() + 120 * 1000 // 2 minutes remaining, which is less than 5 min buffer
      }

      // Second call (should bypass cache due to buffer)
      const result2 = await service.getSignedUrl(key, expiresIn)

      expect(result2).toBe(mockSignedUrl2)
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(2)
    })

    it('should handle capacity limit and evict expired/all entries when limit is reached', async () => {
      const mockGetSignedUrl = getSignedUrl as jest.Mock
      mockGetSignedUrl.mockResolvedValue('https://mocked-signed-url')

      // Populate cache up to the 1000 limit
      for (let i = 0; i < 1000; i++) {
        service['signedUrlCache'].set(`key-${i}:3600`, {
          url: `https://mocked-signed-url`,
          expiresAt: Date.now() + 3600 * 1000,
        })
      }

      expect(service['signedUrlCache'].size).toBe(1000)

      // Next call should trigger eviction logic
      await service.getSignedUrl('key-new', 3600)

      // Since all 1000 entries were active (unexpired), the cache should have been cleared entirely before inserting the new entry
      expect(service['signedUrlCache'].size).toBe(1)
      expect(service['signedUrlCache'].has('key-new:3600')).toBe(true)
    })
  })

  describe('uploadFile', () => {
    const mockFileBuffer = Buffer.from('test file content')
    const mimeType = 'image/png'
    const folder = 'documents'
    const userId = 'user-123'

    it('should upload a file successfully and return keys, url, and signedUrl', async () => {
      const mockSignedUrl = 'https://mocked-signed-url/file'
      const mockGetSignedUrl = getSignedUrl as jest.Mock
      mockGetSignedUrl.mockResolvedValueOnce(mockSignedUrl)

      s3SendSpy.mockResolvedValueOnce({})

      const result = await service.uploadFile(mockFileBuffer, mimeType, folder, userId)

      // Verify returned upload results
      expect(result.key).toContain(`${folder}/${userId}/`)
      expect(result.url).toContain(`https://s3.amazonaws.com/test-bucket/${result.key}`)
      expect(result.signedUrl).toBe(mockSignedUrl)

      // Verify S3 Client send was called with PutObjectCommand and correct parameters
      expect(s3SendSpy).toHaveBeenCalledTimes(1)
      const sentCommand = s3SendSpy.mock.calls[0][0]
      expect(sentCommand).toBeInstanceOf(PutObjectCommand)
      expect(sentCommand.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: result.key,
        Body: mockFileBuffer,
        ContentType: mimeType,
        Metadata: {
          'x-amz-meta-userid': userId,
          'x-amz-meta-uploadedat': expect.any(String),
        },
      })
    })

    it('should throw Error and log error message when s3Client.send throws an error', async () => {
      const mockError = new Error('AWS connection timeout')
      s3SendSpy.mockRejectedValueOnce(mockError)

      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {})

      await expect(
        service.uploadFile(mockFileBuffer, mimeType, folder, userId)
      ).rejects.toThrow('File upload failed')

      expect(loggerSpy).toHaveBeenCalledWith(`Upload failed: ${mockError.message}`)
      loggerSpy.mockRestore()
    })

    it('should fallback to default Amazon S3 domain when AWS_S3_ENDPOINT is not configured', async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'AWS_S3_BUCKET') return 'test-fallback-bucket'
          if (key === 'AWS_REGION') return 'us-east-1'
          if (key === 'AWS_S3_ENDPOINT') return undefined
          return defaultValue
        }),
      } as unknown as ConfigService

      const testService = new S3Service(mockConfigService)
      const mockGetSignedUrl = getSignedUrl as jest.Mock
      mockGetSignedUrl.mockResolvedValueOnce('https://mocked-signed-url')

      const testSendSpy = jest.spyOn(testService['s3Client'], 'send') as jest.SpyInstance
      testSendSpy.mockResolvedValueOnce({} as any)

      const result = await testService.uploadFile(mockFileBuffer, mimeType, folder, userId)
      expect(result.url).toContain('https://s3.amazonaws.com/test-fallback-bucket/')
    })
  })
})
