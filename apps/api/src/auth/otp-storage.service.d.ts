import Redis from 'ioredis';
export interface OtpData {
    otp: string;
    attempts: number;
    createdAt: number;
}
/**
 * Secure OTP storage in Redis
 * - OTP expires in 10 minutes
 * - Max 3 verification attempts
 * - Auto-cleanup on success/failure
 */
export declare class OtpStorageService {
    private redis;
    private readonly OTP_TTL;
    private readonly MAX_ATTEMPTS;
    constructor(redis: Redis);
    storeOtp(phone: string, otp: string): Promise<void>;
    getOtp(phone: string): Promise<OtpData | null>;
    incrementAttempts(phone: string): Promise<number>;
    verifyOtp(phone: string, inputOtp: string): Promise<{
        valid: boolean;
        message: string;
    }>;
    deleteOtp(phone: string): Promise<void>;
}
//# sourceMappingURL=otp-storage.service.d.ts.map