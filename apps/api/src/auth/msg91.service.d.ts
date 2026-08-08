import { ConfigService } from '@nestjs/config';
/**
 * MSG91 Service for SMS OTP
 * DLT-compliant for India (required for commercial SMS)
 * Docs: https://docs.msg91.com/
 */
export declare class Msg91Service {
    private config;
    private readonly logger;
    private readonly baseUrl;
    constructor(config: ConfigService);
    sendOtp(phone: string, otp: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resendOtp(phone: string, retryType?: 'text' | 'voice'): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyOtp(phone: string, otp: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=msg91.service.d.ts.map