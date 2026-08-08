import Redis from 'ioredis';
/**
 * Rate limiting for OTP requests
 * - 1 request per minute per phone
 * - 5 requests per hour per phone
 * - 20 requests per hour per IP
 */
export declare class RateLimitService {
    private redis;
    constructor(redis: Redis);
    checkOtpRateLimit(phone: string, ip: string): Promise<{
        allowed: boolean;
        message?: string;
    }>;
    clearRateLimit(phone: string): Promise<void>;
}
//# sourceMappingURL=rate-limit.service.d.ts.map