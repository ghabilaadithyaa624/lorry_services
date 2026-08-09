import { Injectable, Inject } from '@nestjs/common'
import { REDIS_CLIENT } from '../common/redis/redis.module'
import Redis from 'ioredis'
import * as crypto from 'crypto'

export interface OtpData {
  otpHash: string
  attempts: number
  createdAt: number
}

/**
 * Secure OTP storage in Redis
 * - OTP is hashed with SHA-256 before storage
 * - OTP expires in 10 minutes
 * - Max 3 verification attempts
 * - Auto-cleanup on success/failure
 */
@Injectable()
export class OtpStorageService {
  private readonly OTP_TTL = 600 // 10 minutes
  private readonly MAX_ATTEMPTS = 3

  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex')
  }

  async storeOtp(phone: string, otp: string): Promise<void> {
    const data: OtpData = {
      otpHash: this.hashOtp(otp),
      attempts: 0,
      createdAt: Date.now(),
    }
    await this.redis.set(
      `otp:data:${phone}`,
      JSON.stringify(data),
      'EX',
      this.OTP_TTL
    )
  }

  async getOtp(phone: string): Promise<OtpData | null> {
    const data = await this.redis.get(`otp:data:${phone}`)
    return data ? JSON.parse(data) : null
  }

  async incrementAttempts(phone: string): Promise<number> {
    const data = await this.getOtp(phone)
    if (!data) return 0
    
    data.attempts += 1
    await this.redis.set(
      `otp:data:${phone}`,
      JSON.stringify(data),
      'EX',
      this.OTP_TTL
    )
    return data.attempts
  }

  async verifyOtp(phone: string, inputOtp: string): Promise<{ valid: boolean; message: string }> {
    const data = await this.getOtp(phone)
    
    if (!data) {
      return { valid: false, message: 'OTP expired. Please request a new one.' }
    }

    if (data.attempts >= this.MAX_ATTEMPTS) {
      await this.deleteOtp(phone)
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' }
    }

    const inputHash = this.hashOtp(inputOtp)
    const expectedHash = data.otpHash || ((data as any).otp ? this.hashOtp((data as any).otp) : '')

    // Constant-time comparison to prevent timing attacks
    const isMatch = expectedHash.length === inputHash.length &&
      crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(inputHash))

    if (!isMatch) {
      const attempts = await this.incrementAttempts(phone)
      const remaining = this.MAX_ATTEMPTS - attempts
      return { 
        valid: false, 
        message: `Invalid OTP. ${remaining} attempts remaining.` 
      }
    }

    // Success - delete OTP
    await this.deleteOtp(phone)
    return { valid: true, message: 'OTP verified successfully' }
  }

  async deleteOtp(phone: string): Promise<void> {
    await this.redis.del(`otp:data:${phone}`)
  }
}
