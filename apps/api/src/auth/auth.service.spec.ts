import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService, OtpChannel } from './auth.service'
import { Msg91Service } from './msg91.service'
import { GupshupService } from './gupshup.service'
import { RateLimitService } from './rate-limit.service'
import { OtpStorageService } from './otp-storage.service'
import { REDIS_CLIENT } from '../common/redis/redis.module'
import { prisma, UserRole } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  }
  return {
    prisma: mockPrisma,
    UserRole: {
      load_owner: 'load_owner',
      truck_owner: 'truck_owner',
      driver: 'driver',
      admin: 'admin',
    },
  }
})

interface RedisPipelineMock {
  get: jest.Mock
  set: jest.Mock
  del: jest.Mock
  exec: jest.Mock
}

interface RedisClientMock {
  get: jest.Mock
  set: jest.Mock
  del: jest.Mock
  mget: jest.Mock
  sadd: jest.Mock
  srem: jest.Mock
  smembers: jest.Mock
  mget: jest.Mock
  pipeline: jest.Mock
  mget?: jest.Mock
}

describe('AuthService', () => {
  let service: AuthService
  let jwtService: jest.Mocked<JwtService>
  let configService: jest.Mocked<ConfigService>
  let msg91Service: jest.Mocked<Msg91Service>
  let gupshupService: jest.Mocked<GupshupService>
  let rateLimitService: jest.Mocked<RateLimitService>
  let otpStorageService: jest.Mocked<OtpStorageService>
  let redisClient: RedisClientMock

  let mockPipeline: RedisPipelineMock

  beforeEach(async () => {
    jest.clearAllMocks()

    mockPipeline = {
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }

    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      mget: jest.fn(),
      pipeline: jest.fn().mockReturnValue(mockPipeline),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              if (key === 'NODE_ENV') return 'test'
              if (key === 'JWT_SECRET') return 'test-jwt-secret'
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret'
              return defaultVal
            }),
          },
        },
        {
          provide: Msg91Service,
          useValue: {
            sendOtp: jest.fn().mockResolvedValue({ success: true, message: 'SMS sent' }),
          },
        },
        {
          provide: GupshupService,
          useValue: {
            sendOtp: jest.fn().mockResolvedValue({ success: true, message: 'WhatsApp sent' }),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkOtpRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
            clearRateLimit: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: OtpStorageService,
          useValue: {
            storeOtp: jest.fn().mockResolvedValue(true),
            verifyOtp: jest.fn().mockResolvedValue({ valid: true }),
            deleteOtp: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: redisClient,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jwtService = module.get(JwtService)
    configService = module.get(ConfigService)
    msg91Service = module.get(Msg91Service)
    gupshupService = module.get(GupshupService)
    rateLimitService = module.get(RateLimitService)
    otpStorageService = module.get(OtpStorageService)
  })

  describe('OTP Flow Validation', () => {
    it('should reject invalid Indian phone format', async () => {
      await expect(service.requestOtp('12345')).rejects.toThrow(UnauthorizedException)
    })

    it('should enforce rate limiting', async () => {
      rateLimitService.checkOtpRateLimit.mockResolvedValueOnce({
        allowed: false,
        message: 'Too many OTP requests. Please wait 15 minutes.',
      })
      await expect(service.requestOtp('+919876543210')).rejects.toThrow(UnauthorizedException)
    })

    it('should request OTP successfully via WhatsApp and store it', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      const res = await service.requestOtp('+919876543210', OtpChannel.WHATSAPP)
      expect(res.success).toBe(true)
      expect(res.channel).toBe(OtpChannel.WHATSAPP)
      expect(gupshupService.sendOtp).toHaveBeenCalled()
      expect(otpStorageService.storeOtp).toHaveBeenCalled()
    })

    it('should return devOtp as static "123456" in non-production environments', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      configService.get.mockImplementation((key: string, defaultVal?: any) => {
        if (key === 'NODE_ENV') return 'development'
        return defaultVal
      })
      const res = await service.requestOtp('+919876543210', OtpChannel.WHATSAPP)
      expect(res.devOtp).toBe('123456')
    })

    it('should not return any devOtp in production environment', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      configService.get.mockImplementation((key: string, defaultVal?: any) => {
        if (key === 'NODE_ENV') return 'production'
        return defaultVal
      })
      const res = await service.requestOtp('+919876543210', OtpChannel.WHATSAPP)
      expect(res.devOtp).toBeUndefined()
    })

    it('should verify static OTP 123456 in non-production environments', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValueOnce({
        id: 'usr-1',
        phone: '+919876543210',
        role: UserRole.load_owner,
        name: null,
      })
      configService.get.mockImplementation((key: string, defaultVal?: any) => {
        if (key === 'NODE_ENV') return 'development'
        return defaultVal
      })

      const res = await service.verifyOtp('+919876543210', '123456', UserRole.load_owner)
      expect(res.user.id).toBe('usr-1')
      expect(otpStorageService.deleteOtp).toHaveBeenCalledWith('+919876543210')
    })

    it('should not allow static OTP 123456 in production environment', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      configService.get.mockImplementation((key: string, defaultVal?: any) => {
        if (key === 'NODE_ENV') return 'production'
        return defaultVal
      })
      otpStorageService.verifyOtp.mockResolvedValueOnce({ valid: false, message: 'Invalid OTP' })

      await expect(service.verifyOtp('+919876543210', '123456', UserRole.load_owner)).rejects.toThrow(UnauthorizedException)
      expect(otpStorageService.verifyOtp).toHaveBeenCalledWith('+919876543210', '123456')
    })

    it('should fall back to SMS if WhatsApp fails', async () => {
      gupshupService.sendOtp.mockResolvedValueOnce({ success: false, message: 'WhatsApp failed' })
      const res = await service.requestOtp('+919876543210', OtpChannel.WHATSAPP)
      expect(res.success).toBe(true)
      expect(res.channel).toBe(OtpChannel.SMS)
      expect(msg91Service.sendOtp).toHaveBeenCalled()
    })

    it('should reject OTP verification with invalid OTP', async () => {
      otpStorageService.verifyOtp.mockResolvedValueOnce({ valid: false, message: 'Invalid OTP' })
      await expect(service.verifyOtp('+919876543210', '000000', UserRole.load_owner)).rejects.toThrow(UnauthorizedException)
    })

    it('should register new user with role and return tokens', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValueOnce({
        id: 'usr-1',
        phone: '+919876543210',
        role: UserRole.load_owner,
        name: null,
      })

      const res = await service.verifyOtp('+919876543210', '123456', UserRole.load_owner)
      expect(res.user.id).toBe('usr-1')
      expect(res.user.isNewUser).toBe(true)
      expect(res.user.trial?.durationDays).toBe(90)
      expect(res.user.trial?.expiresAt.getTime()).toBeGreaterThan(res.user.trial?.startedAt.getTime() || 0)
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptions: expect.objectContaining({
              create: expect.objectContaining({
                plan: 'free_trial',
                status: 'active',
              }),
            }),
          }),
        }),
      )
      expect(redisClient.set).toHaveBeenCalled()
    })
  })

  describe('Refresh Token Rotation', () => {
    it('should rotate tokens and return new access and refresh token pair', async () => {
      const mockPayload = { sub: 'usr-1', jti: 'token-123', fam: 'fam-456' }
      jwtService.verify.mockReturnValueOnce(mockPayload)
      redisClient.get.mockImplementation((key: string) => {
        if (key === 'auth:rt:revoked:token-123') return Promise.resolve(null)
        if (key === 'auth:rt:active:token-123') return Promise.resolve(JSON.stringify({ userId: 'usr-1', familyId: 'fam-456' }))
        return Promise.resolve(null)
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'usr-1',
        phone: '+919876543210',
        role: UserRole.load_owner,
      })

      const res = await service.refreshToken('valid-refresh-token')
      expect(res.accessToken).toBe('mock-jwt-token')
      expect(res.refreshToken).toBe('mock-jwt-token')
      expect(redisClient.del).toHaveBeenCalledWith('auth:rt:active:token-123')
      expect(redisClient.set).toHaveBeenCalledWith(
        'auth:rt:revoked:token-123',
        expect.any(String),
        'EX',
        expect.any(Number)
      )
    })

    it('should throw UnauthorizedException if refreshToken is missing or empty', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(
        new UnauthorizedException('Refresh token is required')
      )
    })

    it('should throw UnauthorizedException if jwt verify fails', async () => {
      jwtService.verify.mockImplementationOnce(() => {
        throw new Error('JWT verify failed')
      })
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token')
      )
    })

    it('should throw UnauthorizedException if essential claims are missing', async () => {
      const mockPayload = { sub: 'usr-1' } // missing jti or fam
      jwtService.verify.mockReturnValueOnce(mockPayload)
      await expect(service.refreshToken('incomplete-token')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token')
      )
    })

    it('should throw UnauthorizedException if token is not active in redis', async () => {
      const mockPayload = { sub: 'usr-1', jti: 'inactive-token-123', fam: 'fam-456' }
      jwtService.verify.mockReturnValueOnce(mockPayload)
      redisClient.get.mockImplementation((key: string) => {
        if (key === 'auth:rt:revoked:inactive-token-123') return Promise.resolve(null)
        if (key === 'auth:rt:active:inactive-token-123') return Promise.resolve(null)
        return Promise.resolve(null)
      })

      await expect(service.refreshToken('inactive-token')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token')
      )
    })

    it('should throw UnauthorizedException if user does not exist in database', async () => {
      const mockPayload = { sub: 'non-existent-user', jti: 'token-123', fam: 'fam-456' }
      jwtService.verify.mockReturnValueOnce(mockPayload)
      redisClient.get.mockImplementation((key: string) => {
        if (key === 'auth:rt:revoked:token-123') return Promise.resolve(null)
        if (key === 'auth:rt:active:token-123') return Promise.resolve(JSON.stringify({ userId: 'non-existent-user', familyId: 'fam-456' }))
        return Promise.resolve(null)
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.refreshToken('valid-token-but-no-user')).rejects.toThrow(
        new UnauthorizedException('User no longer exists')
      )
      expect(redisClient.del).toHaveBeenCalledWith('auth:rt:active:token-123')
      expect(redisClient.del).toHaveBeenCalledWith('auth:family:fam-456')
    })
  })

  describe('Refresh Token Replay / Reuse Rejection', () => {
    it('should detect revoked token reuse and revoke the entire session family', async () => {
      const mockPayload = { sub: 'usr-1', jti: 'revoked-token-123', fam: 'fam-456' }
      jwtService.verify.mockReturnValueOnce(mockPayload)
      redisClient.get.mockImplementation((key: string) => {
        if (key === 'auth:rt:revoked:revoked-token-123') return Promise.resolve(JSON.stringify({ userId: 'usr-1' }))
        if (key === 'auth:family:fam-456') return Promise.resolve(JSON.stringify({ activeTokenId: 'active-token-999' }))
        return Promise.resolve(null)
      })

      await expect(service.refreshToken('revoked-refresh-token')).rejects.toThrow(UnauthorizedException)
      expect(redisClient.del).toHaveBeenCalledWith('auth:rt:active:active-token-999')
      expect(redisClient.del).toHaveBeenCalledWith('auth:family:fam-456')
      expect(redisClient.srem).toHaveBeenCalledWith('auth:user:families:usr-1', 'fam-456')
    })

    it('should handle invalid JSON in family data when revoking family due to token reuse', async () => {
      const mockPayload = { sub: 'usr-1', jti: 'revoked-token-123', fam: 'fam-456' }
      jwtService.verify.mockReturnValueOnce(mockPayload)
      redisClient.get.mockImplementation((key: string) => {
        if (key === 'auth:rt:revoked:revoked-token-123') return Promise.resolve(JSON.stringify({ userId: 'usr-1' }))
        if (key === 'auth:family:fam-456') return Promise.resolve('{invalid-json}')
        return Promise.resolve(null)
      })

      await expect(service.refreshToken('revoked-refresh-token')).rejects.toThrow(UnauthorizedException)
      expect(redisClient.del).not.toHaveBeenCalledWith(expect.stringContaining('auth:rt:active:'))
      expect(redisClient.del).toHaveBeenCalledWith('auth:family:fam-456')
      expect(redisClient.srem).toHaveBeenCalledWith('auth:user:families:usr-1', 'fam-456')
    })
  })

  describe('Logout & Session Revocation', () => {
    it('should revoke active refresh token and session family on logout', async () => {
      jwtService.decode.mockReturnValueOnce({ sub: 'usr-1', jti: 'token-123', fam: 'fam-456' })
      redisClient.get.mockResolvedValueOnce(JSON.stringify({ activeTokenId: 'token-123', userId: 'usr-1' }))

      await service.logout('valid-refresh-token')
      expect(redisClient.del).toHaveBeenCalledWith('auth:rt:active:token-123')
      expect(redisClient.set).toHaveBeenCalledWith(
        'auth:rt:revoked:token-123',
        expect.any(String),
        'EX',
        expect.any(Number)
      )
      expect(redisClient.srem).toHaveBeenCalledWith('auth:user:families:usr-1', 'fam-456')
    })

    it('should revoke all session families on logoutAll', async () => {
      redisClient.smembers.mockResolvedValueOnce(['fam-1', 'fam-2'])

      redisClient.mget = jest.fn().mockResolvedValueOnce([
        JSON.stringify({ activeTokenId: 'token-abc' }),
        JSON.stringify({ activeTokenId: 'token-xyz' }),
      ])

      const writePipeline = {
        del: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }

      redisClient.pipeline = jest
        .fn()
        .mockReturnValueOnce(writePipeline)

      await service.logoutAll('usr-1')

      expect(redisClient.mget).toHaveBeenCalledWith(['auth:family:fam-1', 'auth:family:fam-2'])

      expect(writePipeline.del).toHaveBeenCalledWith('auth:rt:active:token-abc')
      expect(writePipeline.del).toHaveBeenCalledWith('auth:rt:active:token-xyz')
      expect(writePipeline.set).toHaveBeenCalledWith(
        'auth:rt:revoked:token-abc',
        expect.any(String),
        'EX',
        expect.any(Number)
      )
      expect(writePipeline.set).toHaveBeenCalledWith(
        'auth:rt:revoked:token-xyz',
        expect.any(String),
        'EX',
        expect.any(Number)
      )
      expect(writePipeline.del).toHaveBeenCalledWith('auth:family:fam-1')
      expect(writePipeline.del).toHaveBeenCalledWith('auth:family:fam-2')
      expect(writePipeline.del).toHaveBeenCalledWith('auth:user:families:usr-1')
      expect(writePipeline.exec).toHaveBeenCalled()
    })

    describe('logoutAll Performance Benchmark', () => {
      it('should measure the performance of logoutAll with many session families', async () => {
        const numFamilies = 50
        const familyIds = Array.from({ length: numFamilies }, (_, i) => `fam-${i}`)

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        const benchRedis = {
          smembers: jest.fn().mockImplementation(async () => {
            await delay(2)
            return familyIds
          }),
          mget: jest.fn().mockImplementation(async (keys: string[]) => {
            await delay(2)
            return keys.map((key: string) => {
              const familyId = key.split(':').pop()
              return JSON.stringify({ activeTokenId: `token-${familyId}` })
            })
          }),
          del: jest.fn().mockImplementation(async () => {
            await delay(2)
            return 1
          }),
          set: jest.fn().mockImplementation(async () => {
            await delay(2)
            return 'OK'
          }),
          pipeline: jest.fn().mockImplementation(() => {
            const commands: any[] = []
            const pipelineInstance = {
              del(key: string) {
                commands.push({ name: 'del', args: [key] })
                return pipelineInstance
              },
              set(key: string, value: string, mode?: string, duration?: number) {
                commands.push({ name: 'set', args: [key, value, mode, duration] })
                return pipelineInstance
              },
              async exec() {
                await delay(2)
                return commands.map(cmd => {
                  return [null, 'OK']
                })
              }
            }
            return pipelineInstance
          })
        }

        const benchService = new AuthService(
          jwtService,
          configService,
          msg91Service,
          gupshupService,
          rateLimitService,
          otpStorageService,
          benchRedis as any
        )

        const start = performance.now()
        await benchService.logoutAll('usr-1')
        const end = performance.now()
        const duration = end - start

        console.log(`[Benchmark] logoutAll with ${numFamilies} families completed in ${duration.toFixed(2)} ms`)
      })
    })
  })

  describe('JWT Security Fallback Restrictions', () => {
    it('should throw an error in the constructor if JWT_REFRESH_SECRET is missing', () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return 'test-jwt-secret'
          return undefined
        }),
      } as any

      expect(() => {
        new AuthService(
          jwtService,
          mockConfigService,
          msg91Service,
          gupshupService,
          rateLimitService,
          otpStorageService,
          redisClient as any
        )
      }).toThrow('JWT_REFRESH_SECRET must be configured')
    })
  })
})
