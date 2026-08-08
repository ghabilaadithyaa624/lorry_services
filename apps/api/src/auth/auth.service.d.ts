import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { Msg91Service } from './msg91.service';
import { GupshupService } from './gupshup.service';
import { RateLimitService } from './rate-limit.service';
import { OtpStorageService } from './otp-storage.service';
export declare class AuthService {
    private jwtService;
    private configService;
    private msg91Service;
    private gupshupService;
    private rateLimitService;
    private otpStorageService;
    constructor(jwtService: JwtService, configService: ConfigService, msg91Service: Msg91Service, gupshupService: GupshupService, rateLimitService: RateLimitService, otpStorageService: OtpStorageService);
    requestOtp(phone: string, channel?: string, ip?: string): Promise<{
        success: boolean;
        message: string;
        devOtp: string;
    }>;
    verifyOtp(phone: string, otp: string, role?: UserRole): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string;
            name: string | null;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map