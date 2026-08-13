import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { S3Service } from './s3.service'

describe('S3Service', () => {
  let service: S3Service
  let configService: ConfigService

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
              return defaultValue
            }),
          },
        },
      ],
    }).compile()

    service = module.get<S3Service>(S3Service)
    configService = module.get<ConfigService>(ConfigService)
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
})
