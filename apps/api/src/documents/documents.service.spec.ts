import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { prisma } from '@lorrycarry/database';

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    truck: { findUnique: jest.fn() },
    booking: { findUnique: jest.fn() },
  },
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mocked-signed-url'),
}));

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate pre-signed URL for valid truck driver', async () => {
    (prisma.truck.findUnique as jest.Mock).mockResolvedValue({ id: 't1', userId: 'u1' });
    const result = await service.generateUploadUrl('u1', 't1', 'TRUCK', 'RC', 'application/pdf');
    expect(result).toHaveProperty('uploadUrl');
    expect(result.uploadUrl).toBe('https://mocked-signed-url');
    expect(result).toHaveProperty('key');
  });

  it('should reject invalid content type', async () => {
    await expect(service.generateUploadUrl('u1', 't1', 'TRUCK', 'RC', 'text/plain'))
      .rejects.toThrow(BadRequestException);
  });

  it('should reject unauthorized truck upload', async () => {
    (prisma.truck.findUnique as jest.Mock).mockResolvedValue({ id: 't1', userId: 'u2' });
    await expect(service.generateUploadUrl('u1', 't1', 'TRUCK', 'RC', 'image/jpeg'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should authorize booking factory owner', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1', load: { userId: 'u1' }, truckDriverId: 'u2',
    });
    const result = await service.generateUploadUrl('u1', 'b1', 'BOOKING', 'POD', 'image/png');
    expect(result.uploadUrl).toBe('https://mocked-signed-url');
  });
});
