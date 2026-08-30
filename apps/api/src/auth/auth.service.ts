import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { prisma, UserRole } from '@lorrycarry/database'
import { REDIS_CLIENT } from '../common/redis/redis.module'
import Redis from 'ioredis'
import * as crypto from 'crypto'
import { Msg91Service } from './msg91.service'
import { GupshupService } from './gupshup.service'
import { RateLimitService } from './rate-limit.service'
import { OtpStorageService } from './otp-storage.service'

export enum OtpChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 // 30 days in seconds (2,592,000)

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private msg91: Msg91Service,
    private gupshup: GupshupService,
    private rateLimit: RateLimitService,
    private otpStorage: OtpStorageService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    if (!this.config.get<string>('JWT_REFRESH_SECRET')) {
      throw new Error('JWT_REFRESH_SECRET must be configured')
    }
  }

  /**
   * Request OTP with smart fallback
   * 1. Try WhatsApp first (higher engagement)
   * 2. Fall back to SMS if WhatsApp fails
   */
  async requestOtp(
    phone: string, 
    channel: OtpChannel = OtpChannel.WHATSAPP,
    ip: string = 'unknown'
  ): Promise<{ success: boolean; message: string; channel: string; isExistingUser: boolean; devOtp?: string }> {
    // Validate phone format
    if (!this.isValidIndianPhone(phone)) {
      throw new UnauthorizedException('Invalid phone number. Use format: +919876543210')
    }

    // Check rate limits
    const rateLimit = await this.rateLimit.checkOtpRateLimit(phone, ip)
    if (!rateLimit.allowed) {
      throw new UnauthorizedException(rateLimit.message)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { phone } })
    const isExistingUser = !!existingUser

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString()
    
    // Store OTP
    await this.otpStorage.storeOtp(phone, otp)

    let result: { success: boolean; message: string }
    let usedChannel = channel

    if (channel === OtpChannel.WHATSAPP) {
      // Try WhatsApp first
      result = await this.gupshup.sendOtp(phone, otp)
      
      // Fallback to SMS if WhatsApp fails
      if (!result.success) {
        this.logger.log(`WhatsApp failed for ${phone}, falling back to SMS`)
        result = await this.msg91.sendOtp(phone, otp)
        usedChannel = OtpChannel.SMS
      }
    } else {
      // SMS only
      result = await this.msg91.sendOtp(phone, otp)
    }

    // Log for monitoring
    this.logger.log(`OTP ${result.success ? 'sent' : 'failed'} via ${usedChannel} to ${phone}`)

    return {
      success: result.success,
      message: result.message,
      channel: usedChannel,
      isExistingUser,
      // Dev mode: return static mock OTP '123456' for testing (never expose the actual dynamic OTP)
      ...(this.config.get('NODE_ENV') !== 'production' && { devOtp: '123456' }),
    }
  }

  /**
   * Verify OTP and issue JWT tokens with rotating refresh token
   * New users must provide role, existing users inherit their role
   */
  async verifyOtp(
    phone: string, 
    inputOtp: string, 
    role?: UserRole,
    ip: string = 'unknown'
  ): Promise<{
    accessToken: string
    refreshToken: string
    user: {
      id: string
      phone: string
      name: string | null
      role: UserRole
      isNewUser: boolean
    }
  }> {
    // Validate phone
    if (!this.isValidIndianPhone(phone)) {
      throw new UnauthorizedException('Invalid phone number')
    }

    // Find user by phone to determine if new registration
    let user = await prisma.user.findUnique({ where: { phone } })
    let isNewUser = false

    if (!user) {
      // New user - role required
      if (!role) {
        throw new UnauthorizedException('Role selection required for new user')
      }
      if (role === UserRole.admin) {
        throw new UnauthorizedException('Admin role cannot be selected during public registration')
      }
      if (!Object.values(UserRole).includes(role) || (role !== UserRole.load_owner && role !== UserRole.truck_owner)) {
        throw new UnauthorizedException('Invalid registration role')
      }
    }

    // Verify OTP
    let verification: { valid: boolean; message: string }
    const isDevMode = this.config.get('NODE_ENV') !== 'production'
    if (isDevMode && inputOtp === '123456') {
      verification = { valid: true, message: 'OTP verified successfully (Dev Mode)' }
      await this.otpStorage.deleteOtp(phone)
    } else {
      verification = await this.otpStorage.verifyOtp(phone, inputOtp)
    }

    if (!verification.valid) {
      throw new UnauthorizedException(verification.message)
    }

    if (!user) {
      user = await prisma.user.create({
        data: { 
          phone, 
          role: role!,
          name: null,
        },
      })
      isNewUser = true
      this.logger.log(`New user registered: ${phone} as ${role}`)
    } else {
      this.logger.log(`Existing user logged in: ${phone}`)
    }

    // Clear rate limits on success
    await this.rateLimit.clearRateLimit(phone)

    // Generate unique token ID and session family ID
    const tokenId = crypto.randomUUID()
    const familyId = crypto.randomUUID()

    // Generate tokens
    const accessPayload = { 
      sub: user.id, 
      phone: user.phone, 
      role: user.role 
    }

    const refreshPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      jti: tokenId,
      fam: familyId,
    }
    
    const accessToken = this.jwtService.sign(accessPayload)
    const refreshToken = this.jwtService.sign(refreshPayload, { 
      expiresIn: '30d',
      secret: this.config.get<string>('JWT_REFRESH_SECRET')
    })

    // Store active token in Redis
    await this.redis.set(
      `auth:rt:active:${tokenId}`,
      JSON.stringify({ userId: user.id, familyId, createdAt: Date.now() }),
      'EX',
      REFRESH_TOKEN_TTL
    )
    await this.redis.set(
      `auth:family:${familyId}`,
      JSON.stringify({ activeTokenId: tokenId, userId: user.id }),
      'EX',
      REFRESH_TOKEN_TTL
    )
    await this.redis.sadd(`auth:user:families:${user.id}`, familyId)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        isNewUser,
      },
    }
  }

  /**
   * Refresh access token using rotating refresh token
   * - Invalidate previous refresh token
   * - Detect reuse and revoke token family
   * - Issue new access and refresh token pair
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required')
    }

    let payload: any
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET')
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    const userId = payload.sub
    const tokenId = payload.jti
    const familyId = payload.fam

    if (!userId || !tokenId || !familyId) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Check if token was previously revoked or rotated (Token Reuse Detection)
    const isRevoked = await this.redis.get(`auth:rt:revoked:${tokenId}`)
    if (isRevoked) {
      this.logger.warn(`Security Alert: Revoked refresh token reuse detected for user ${userId}, family ${familyId}. Revoking entire token family.`)
      // Invalidate the entire family
      const familyDataStr = await this.redis.get(`auth:family:${familyId}`)
      if (familyDataStr) {
        try {
          const familyData = JSON.parse(familyDataStr)
          if (familyData.activeTokenId) {
            await this.redis.del(`auth:rt:active:${familyData.activeTokenId}`)
          }
        } catch (_) {}
        await this.redis.del(`auth:family:${familyId}`)
      }
      await this.redis.srem(`auth:user:families:${userId}`, familyId)
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Check if token is active in Redis
    const activeDataStr = await this.redis.get(`auth:rt:active:${tokenId}`)
    if (!activeDataStr) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    })
    
    if (!user) {
      await this.redis.del(`auth:rt:active:${tokenId}`)
      await this.redis.del(`auth:family:${familyId}`)
      throw new UnauthorizedException('User no longer exists')
    }

    // Invalidate old token (mark revoked and delete from active)
    await this.redis.del(`auth:rt:active:${tokenId}`)
    await this.redis.set(
      `auth:rt:revoked:${tokenId}`,
      JSON.stringify({ userId, familyId, rotatedAt: Date.now() }),
      'EX',
      REFRESH_TOKEN_TTL
    )

    // Issue new token pair
    const newTokenId = crypto.randomUUID()
    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    })

    const newRefreshToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      jti: newTokenId,
      fam: familyId,
    }, {
      expiresIn: '30d',
      secret: this.config.get<string>('JWT_REFRESH_SECRET')
    })

    // Store new active token in Redis
    await this.redis.set(
      `auth:rt:active:${newTokenId}`,
      JSON.stringify({ userId: user.id, familyId, createdAt: Date.now() }),
      'EX',
      REFRESH_TOKEN_TTL
    )
    await this.redis.set(
      `auth:family:${familyId}`,
      JSON.stringify({ activeTokenId: newTokenId, userId: user.id }),
      'EX',
      REFRESH_TOKEN_TTL
    )

    return { 
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }

  /**
   * Logout - revoke active refresh token and session family
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return

    try {
      const payload: any = this.jwtService.decode(refreshToken)
      if (payload && payload.jti) {
        const tokenId = payload.jti
        const familyId = payload.fam
        const userId = payload.sub

        // Invalidate active token
        await this.redis.del(`auth:rt:active:${tokenId}`)
        await this.redis.set(
          `auth:rt:revoked:${tokenId}`,
          JSON.stringify({ userId, familyId, revokedAt: Date.now(), reason: 'logout' }),
          'EX',
          REFRESH_TOKEN_TTL
        )

        if (familyId) {
          const familyDataStr = await this.redis.get(`auth:family:${familyId}`)
          if (familyDataStr) {
            try {
              const familyData = JSON.parse(familyDataStr)
              if (familyData.activeTokenId) {
                await this.redis.del(`auth:rt:active:${familyData.activeTokenId}`)
              }
            } catch (_) {}
            await this.redis.del(`auth:family:${familyId}`)
          }
          if (userId) {
            await this.redis.srem(`auth:user:families:${userId}`, familyId)
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Logout token invalidation error: ${err.message}`)
    }
  }

  /**
   * Logout from all devices - revoke all active refresh tokens and session families for the user
   */
  async logoutAll(userId: string): Promise<void> {
    if (!userId) return

    try {
      const familyIds = await this.redis.smembers(`auth:user:families:${userId}`)
      if (!familyIds || familyIds.length === 0) {
        await this.redis.del(`auth:user:families:${userId}`)
        return
      }

      // Phase 1: Fetch all family data strings in bulk using mget
      const familyKeys = familyIds.map(id => `auth:family:${id}`)
      const familyDataResults = await this.redis.mget(familyKeys)

      // Phase 2: Parse results and build write pipeline
      const writePipeline = this.redis.pipeline()
      const now = Date.now()

      if (familyDataResults) {
        for (let i = 0; i < familyIds.length; i++) {
          const familyId = familyIds[i]
          const familyDataStr = familyDataResults[i]

          if (familyDataStr) {
            try {
              const familyData = JSON.parse(familyDataStr)
              if (familyData.activeTokenId) {
                writePipeline.del(`auth:rt:active:${familyData.activeTokenId}`)
                writePipeline.set(
                  `auth:rt:revoked:${familyData.activeTokenId}`,
                  JSON.stringify({ userId, familyId, revokedAt: now, reason: 'logout_all' }),
                  'EX',
                  REFRESH_TOKEN_TTL
                )
              }
            } catch (_) {}
          }
          // Delete the family key
          writePipeline.del(`auth:family:${familyId}`)
        }
      }

      // Delete the families set for this user
      writePipeline.del(`auth:user:families:${userId}`)

      // Execute all write operations concurrently in a single pipeline
      await writePipeline.exec()

      this.logger.log(`All sessions revoked for user ${userId}`)
    } catch (err: any) {
      this.logger.warn(`Logout all sessions error: ${err.message}`)
    }
  }

  /**
   * Validate Indian phone number format
   */
  private isValidIndianPhone(phone: string): boolean {
    // Accepts +919876543210, 919876543210, or 9876543210
    const cleaned = phone.replace(/\s/g, '')
    const indianMobileRegex = /^(\+?91)?[6-9]\d{9}$/
    return indianMobileRegex.test(cleaned)
  }
}