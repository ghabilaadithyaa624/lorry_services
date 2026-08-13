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
  })
})
