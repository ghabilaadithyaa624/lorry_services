import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import { LRUCache } from 'lru-cache'

export interface UploadResult {
  key: string
  url: string
  signedUrl: string
}

/**
 * S3/Minio Service for document storage
 * Supports AWS S3 in production, Minio for local dev
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name)
  private readonly s3Client: S3Client
  private readonly bucket: string
  private readonly signedUrlCache = new LRUCache<string, { url: string; expiresAt: number }>({
    max: 1000,
  })

  constructor(private config: ConfigService) {
    this.bucket = config.get('AWS_S3_BUCKET', 'lorrycarry-kyc')
    
    const endpoint = config.get<string>('AWS_S3_ENDPOINT')
    this.s3Client = new S3Client({
      region: config.get('AWS_REGION', 'ap-south-1'),
      endpoint: endpoint && endpoint.trim() !== '' ? endpoint : undefined, // For Minio
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', ''),
      },
      forcePathStyle: config.get('AWS_S3_FORCE_PATH_STYLE') === 'true', // For Minio
    })
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    file: Buffer,
    mimeType: string,
    folder: string,
    userId: string
  ): Promise<UploadResult> {
    const key = `${folder}/${userId}/${uuidv4()}`
    
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: mimeType,
          Metadata: {
            'x-amz-meta-userid': userId,
            'x-amz-meta-uploadedat': new Date().toISOString(),
          },
        })
      )

      const signedUrl = await this.getSignedUrl(key)
      
      return {
        key,
        url: `${this.config.get('AWS_S3_ENDPOINT') || 'https://s3.amazonaws.com'}/${this.bucket}/${key}`,
        signedUrl,
      }
    } catch (error: any) {
      this.logger.error(`Upload failed: ${error.message}`)
      throw new Error('File upload failed')
    }
  }

  /**
   * Generate signed URL for file access (valid for 1 hour)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const cacheKey = `${key}:${expiresIn}`
    const cached = this.signedUrlCache.get(cacheKey)
    const now = Date.now()
    const buffer = 300 * 1000 // 5-minute safety buffer

    if (cached && cached.expiresAt - buffer > now) {
      return cached.url
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const url = await getSignedUrl(this.s3Client, command, { expiresIn })

    this.signedUrlCache.set(cacheKey, {
      url,
      expiresAt: now + expiresIn * 1000,
    })

    return url
  }

  /**
   * Generate pre-signed PUT URL so the browser can upload straight to object
   * storage (never through the API). Valid for a short window by default.
   */
  async generatePresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn: number = 300
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })

    return getSignedUrl(this.s3Client, command, { expiresIn })
  }

  /**
   * Verify that an object really exists in storage. Used when a client claims
   * an upload completed, so the chain never records phantom documents.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch (error: any) {
      // 404 / NotFound / NoSuchKey surface when the object does not exist
      // (AWS S3 uses NoSuchKey, MinIO uses NotFound — both send HTTP 404).
      if (
        error?.name === 'NotFound' ||
        error?.name === 'NoSuchKey' ||
        error?.$metadata?.httpStatusCode === 404
      ) {
        return false
      }
      throw error
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File, allowedTypes: string[], maxSizeMB: number = 5): { valid: boolean; error?: string } {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `File too large. Max size: ${maxSizeMB}MB` }
    }

    // Check mime type
    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }
    }

    return { valid: true }
  }
}
