export declare enum OtpChannel {
    SMS = "sms",
    WHATSAPP = "whatsapp"
}
export declare enum UserRole {
    LOAD_OWNER = "load_owner",
    TRUCK_OWNER = "truck_owner"
}
export declare class RequestOtpDto {
    phone: string;
    channel?: OtpChannel;
}
export declare class VerifyOtpDto {
    phone: string;
    otp: string;
    role?: UserRole;
}
//# sourceMappingURL=index.d.ts.map