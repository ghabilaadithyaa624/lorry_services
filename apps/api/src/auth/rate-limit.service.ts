import { Injectable, Inject } from '@nestjs/common'
import { REDIS_CLIENT } from '../common/redis/redis.module'
import Redis from 'ioredis'

/**
 * Rate limiting for OTP requests
 * - 1 request per minute per phone
 * - 5 requests per hour per phone
 * - 20 requests per hour per IP
 */
@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async checkOtpRateLimit(phone: string, ip: string): Promise<{ allowed: boolean; message?: string }> {
    const phoneKey = `otp:phone:${phone}`
    const ipKey = `otp:ip:${ip}`
    const now = Date.now()

    // Check phone rate limit (1 per minute)
    const lastRequest = await this.redis.get(phoneKey)
    if (lastRequest) {
      const timeSinceLast = now - parseInt(lastRequest)
      if (timeSinceLast < 60000) { // 1 minute
        const waitSeconds = Math.ceil((60000 - timeSinceLast) / 1000)
        return { 
          allowed: false, 
          message: `Please wait ${waitSeconds} seconds before requesting another OTP` 
        }
      }
    }

    // Check phone hourly limit (5 per hour)
    const phoneHourKey = `otp:phone:hour:${phone}`
    const phoneHourCount = await this.redis.incr(phoneHourKey)
    if (phoneHourCount === 1) {
      await this.redis.pexpire(phoneHourKey, 3600000) // 1 hour
    }
    if (phoneHourCount > 5) {
      return { 
        allowed: false, 
        message: 'Too many OTP requests. Please try again after 1 hour.' 
      }
    }

    // Check IP hourly limit (20 per hour)
    const ipHourCount = await this.redis.incr(ipKey)
    if (ipHourCount === 1) {
      await this.redis.pexpire(ipKey, 3600000)
    }
    if (ipHourCount > 20) {
      return { 
        allowed: false, 
        message: 'Too many requests from this device. Please try again later.' 
      }
    }

    // Set last request time
    await this.redis.set(phoneKey, now.toString(), 'PX', 60000)

    return { allowed: true }
  }

  async clearRateLimit(phone: string): Promise<void> {
    await this.redis.del(`otp:phone:${phone}`)
    await this.redis.del(`otp:phone:hour:${phone}`)
  }
}
