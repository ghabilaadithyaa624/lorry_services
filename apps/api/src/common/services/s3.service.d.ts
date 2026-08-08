import { ConfigService } from '@nestjs/config';
export interface UploadResult {
    key: string;
    url: string;
    signedUrl: string;
}
/**
 * S3/Minio Service for document storage
 * Supports AWS S3 in production, Minio for local dev
 */
export declare class S3Service {
    private config;
    private readonly logger;
    private readonly s3Client;
    private readonly bucket;
    constructor(config: ConfigService);
    /**
     * Upload file to S3
     */
    uploadFile(file: Buffer, mimeType: string, folder: string, userId: string): Promise<UploadResult>;
    /**
     * Generate signed URL for file access (valid for 1 hour)
     */
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
    /**
     * Validate file before upload
     */
    validateFile(file: Express.Multer.File, allowedTypes: string[], maxSizeMB?: number): {
        valid: boolean;
        error?: string;
    };
}
//# sourceMappingURL=s3.service.d.ts.map