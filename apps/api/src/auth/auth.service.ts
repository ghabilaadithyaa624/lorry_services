import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { prisma, UserRole } from '@lorrycarry/database'
import { Msg91Service } from './msg91.service'
import { GupshupService } from './gupshup.service'
import { RateLimitService } from './rate-limit.service'
import { OtpStorageService } from './otp-storage.service'

export enum OtpChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

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
  ) {}

  /**
   * Request OTP with smart fallback
   * 1. Try WhatsApp first (higher engagement)
   * 2. Fall back to SMS if WhatsApp fails
   */
  async requestOtp(
    phone: string, 
    channel: OtpChannel = OtpChannel.WHATSAPP,
    ip: string = 'unknown'
  ): Promise<{ success: boolean; message: string; channel: string; devOtp?: string }> {
    // Validate phone format
    if (!this.isValidIndianPhone(phone)) {
      throw new UnauthorizedException('Invalid phone number. Use format: +919876543210')
    }

    // Check rate limits
    const rateLimit = await this.rateLimit.checkOtpRateLimit(phone, ip)
    if (!rateLimit.allowed) {
      throw new UnauthorizedException(rateLimit.message)
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
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
      // Dev mode: return OTP for testing (remove in production)
      ...(this.config.get('NODE_ENV') !== 'production' && { devOtp: otp }),
    }
  }

  /**
   * Verify OTP and issue JWT tokens
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

    // Verify OTP
    const verification = await this.otpStorage.verifyOtp(phone, inputOtp)
    if (!verification.valid) {
      throw new UnauthorizedException(verification.message)
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } })
    let isNewUser = false

    if (!user) {
      // New user - role required
      if (!role) {
        throw new UnauthorizedException('Role selection required for new user')
      }
      if (!Object.values(UserRole).includes(role)) {
        throw new UnauthorizedException('Invalid role')
      }

      user = await prisma.user.create({
        data: { 
          phone, 
          role,
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

    // Generate tokens
    const payload = { 
      sub: user.id, 
      phone: user.phone, 
      role: user.role 
    }
    
    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.jwtService.sign(payload, { 
      expiresIn: '30d',
      secret: this.config.get('JWT_REFRESH_SECRET', this.config.get('JWT_SECRET'))
    })

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
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', this.config.get('JWT_SECRET'))
      })
      
      // Verify user still exists
      const user = await prisma.user.findUnique({ 
        where: { id: payload.sub } 
      })
      
      if (!user) {
        throw new UnauthorizedException('User no longer exists')
      }

      const newAccessToken = this.jwtService.sign({
        sub: user.id,
        phone: user.phone,
        role: user.role,
      })

      return { accessToken: newAccessToken }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  /**
   * Logout - revoke refresh token (optional implementation with token blacklist)
   */
  async logout(refreshToken: string): Promise<void> {
    // Add to blacklist in Redis if implementing token revocation
    // await this.redis.set(`blacklist:${refreshToken}`, '1', 'EX', 2592000) // 30 days
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