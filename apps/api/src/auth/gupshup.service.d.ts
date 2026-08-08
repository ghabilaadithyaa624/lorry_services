import { ConfigService } from '@nestjs/config';
/**
 * Gupshup Service for WhatsApp OTP
 * Uses Meta's Cloud API via Gupshup BSP (Business Service Provider)
 * More reliable than SMS in India, higher open rates
 * Docs: https://www.gupshup.io/developer/docs
 */
export declare class GupshupService {
    private config;
    private readonly logger;
    private readonly baseUrl;
    constructor(config: ConfigService);
    sendOtp(phone: string, otp: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Send rich notification (for booking updates, checkpoint alerts)
     */
    sendNotification(phone: string, templateName: string, params: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Handle incoming webhooks from Gupshup
     */
    handleWebhook(payload: any): Promise<void>;
}
//# sourceMappingURL=gupshup.service.d.ts.map