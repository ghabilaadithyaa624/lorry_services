import { Injectable, Logger, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@lorrycarry/database';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME', 'lorrycarry-staging');
    
    this.s3Client = new S3Client({
      region,
      endpoint, // Used for local Minio
      forcePathStyle: !!endpoint, // Required for Minio
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async generateUploadUrl(userId: string, entityId: string, entityType: 'TRUCK' | 'BOOKING', documentType: string, contentType: string) {
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(contentType)) {
      throw new BadRequestException('Invalid content type. Only JPEG, PNG, and PDF are allowed.');
    }

    if (entityType === 'TRUCK') {
      const truck = await prisma.truck.findUnique({ where: { id: entityId } });
      if (!truck || truck.userId !== userId) {
        throw new UnauthorizedException('Truck not found or does not belong to user.');
      }
    } else if (entityType === 'BOOKING') {
      const booking = await prisma.booking.findUnique({ where: { id: entityId }, include: { load: true } });
      if (!booking || (booking.load.userId !== userId && booking.truckOwnerId !== userId)) {
        throw new UnauthorizedException('Booking not found or does not belong to user.');
      }
    } else {
      throw new BadRequestException('Invalid entity type.');
    }

    const uniqueId = uuidv4();
    const extension = contentType === 'application/pdf' ? 'pdf' : contentType === 'image/png' ? 'png' : 'jpg';
    const key = `documents/${entityId}/${documentType}-${uniqueId}.${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // 5 minutes

      return {
        uploadUrl: signedUrl,
        key,
        expiresIn: 300,
      };
    } catch (error) {
      this.logger.error(`Error generating pre-signed URL: ${error}`);
      throw new InternalServerErrorException('Failed to generate secure upload URL.');
    }
  }
}
