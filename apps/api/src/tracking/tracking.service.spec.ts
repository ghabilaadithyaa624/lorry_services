import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { prisma } from '@lorrycarry/database';

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    checkpoint: { findFirst: jest.fn(), update: jest.fn() },
    booking: { update: jest.fn() },
  },
  BookingStatus: { InTransit: 'InTransit' },
}));

describe('TrackingService', () => {
  let service: TrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        {
          provide: NotificationsService,
          useValue: {
            sendCheckpointCrossed: jest.fn().mockResolvedValue(null),
            sendDeliveryCompleted: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should record geofence checkpoint crossing', async () => {
    const cp = { id: 'cp1', lat: 10, lng: 20, radiusM: 1000, crossedAt: null };
    (prisma.checkpoint.findFirst as jest.Mock).mockResolvedValue(cp);
    (prisma.checkpoint.update as jest.Mock).mockResolvedValue({});
    (prisma.booking.update as jest.Mock).mockResolvedValue({});
    jest.spyOn(service as any, 'calculateDistance').mockReturnValue(0.5); // 0.5 km < 1000/1000

    const result = await service.processGeofenceCrossing('b1', 1, { lat: 10, lng: 20 });
    expect(result).not.toHaveProperty('success', false);
    expect(prisma.checkpoint.update).toHaveBeenCalledWith({
      where: { id: 'cp1' },
      data: expect.objectContaining({ crossedBy: 'device' }),
    });
  });

  it('should fail if device outside radius', async () => {
    const cp = { id: 'cp1', lat: 10, lng: 20, radiusM: 10, crossedAt: null };
    (prisma.checkpoint.findFirst as jest.Mock).mockResolvedValue(cp);
    jest.spyOn(service as any, 'calculateDistance').mockReturnValue(5); // 5 km > 10/1000

    const result = await service.processGeofenceCrossing('b1', 1, { lat: 11, lng: 21 });
    expect(result.success).toBe(false);
    expect(result.message).toContain('outside checkpoint radius');
    expect(prisma.checkpoint.update).not.toHaveBeenCalled();
  });
});
