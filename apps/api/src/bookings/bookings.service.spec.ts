import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { GupshupService } from '../auth/gupshup.service'
import { prisma, BookingStatus, LoadStatus, SubscriptionStatus } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const actual = jest.requireActual('@lorrycarry/database')
  const mockPrisma = {
    load: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    truck: {
      findFirst: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    checkpoint: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  }
  return {
    ...actual,
    prisma: mockPrisma,
    BookingStatus: {
      Pending: 'Pending',
      Confirmed: 'Confirmed',
      InTransit: 'In-transit',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
    },
    LoadStatus: {
      Open: 'Open',
      Matched: 'Matched',
      InTransit: 'In-transit',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
    },
    SubscriptionStatus: {
      active: 'active',
      expired: 'expired',
      cancelled: 'cancelled',
    },
  }
})

describe('BookingsService', () => {
  let service: BookingsService
  let gupshupService: jest.Mocked<GupshupService>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: GupshupService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile()

    service = module.get<BookingsService>(BookingsService)
    gupshupService = module.get(GupshupService)
  })

  describe('Create Booking', () => {
    const mockDto = {
      loadId: 'load-1',
      truckId: 'truck-1',
      agreedPrice: 25000,
      liabilityAccepted: true,
    }

    it('should successfully create a booking and 5 checkpoints within an atomic transaction', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        userId: 'owner-1',
        status: LoadStatus.Open,
        loadingLat: 18.5204,
        loadingLng: 73.8567,
        unloadingLat: 12.9716,
        unloadingLng: 77.5946,
      })

      ;(prisma.truck.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'truck-1',
        userId: 'transporter-1',
        verificationStatus: 'Verified',
      })

      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'owner-1',
        status: SubscriptionStatus.active,
        expiresAt: new Date(Date.now() + 86400000),
      })

      ;(prisma.load.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 })

      const mockCreatedBooking = {
        id: 'booking-1001',
        loadId: 'load-1',
        truckId: 'truck-1',
        loadOwnerId: 'owner-1',
        truckOwnerId: 'transporter-1',
        agreedPrice: 25000,
        status: BookingStatus.Confirmed,
        load: { user: { phone: '+919876543210', name: 'Shipper' }, loadingAddress: 'Pune', unloadingAddress: 'Bangalore' },
        truck: { user: { phone: '+919876543211', name: 'Transporter' }, registrationNumber: 'KA01AB1234' },
      }

      ;(prisma.booking.create as jest.Mock).mockResolvedValueOnce(mockCreatedBooking)

      const result = await service.create('owner-1', mockDto)

      expect(result.id).toBe('booking-1001')
      expect(prisma.load.updateMany).toHaveBeenCalledWith({
        where: { id: 'load-1', userId: 'owner-1', status: LoadStatus.Open },
        data: { status: LoadStatus.Matched },
      })
      expect(prisma.checkpoint.createMany).toHaveBeenCalledTimes(1)
      expect(prisma.checkpoint.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Loading Point', seq: 1 }),
          expect.objectContaining({ name: 'Checkpoint 1', seq: 2 }),
          expect.objectContaining({ name: 'Checkpoint 2', seq: 3 }),
          expect.objectContaining({ name: 'Checkpoint 3', seq: 4 }),
          expect.objectContaining({ name: 'Unloading Point', seq: 5 }),
        ]),
      })
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
      expect(gupshupService.sendNotification).toHaveBeenCalledTimes(2)
    })

    it('should throw ConflictException if load has already been matched / claimed', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        userId: 'owner-1',
        status: LoadStatus.Open,
      })

      ;(prisma.truck.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'truck-1',
        userId: 'transporter-1',
        verificationStatus: 'Verified',
      })

      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'owner-1',
        status: SubscriptionStatus.active,
        expiresAt: new Date(Date.now() + 86400000),
      })

      // Claim returns count 0 (already matched / double-booking conflict)
      ;(prisma.load.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 })

      await expect(service.create('owner-1', mockDto)).rejects.toThrow(ConflictException)
    })

    it('should rollback transaction and throw error without sending notifications when checkpoint creation fails', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        userId: 'owner-1',
        status: LoadStatus.Open,
      })

      ;(prisma.truck.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'truck-1',
        userId: 'transporter-1',
        verificationStatus: 'Verified',
      })

      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'owner-1',
        status: SubscriptionStatus.active,
        expiresAt: new Date(Date.now() + 86400000),
      })

      ;(prisma.load.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 })
      ;(prisma.booking.create as jest.Mock).mockResolvedValueOnce({ id: 'b1' })
      ;(prisma.checkpoint.createMany as jest.Mock).mockRejectedValueOnce(new Error('DB transaction error'))

      await expect(service.create('owner-1', mockDto)).rejects.toThrow('DB transaction error')
      expect(gupshupService.sendNotification).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException if load owner lacks active subscription', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        userId: 'owner-1',
        status: LoadStatus.Open,
      })

      ;(prisma.truck.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'truck-1',
        userId: 'transporter-1',
        verificationStatus: 'Verified',
      })

      // No active subscription
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.create('owner-1', mockDto)).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException if truck is missing or unverified', async () => {
      ;(prisma.load.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        userId: 'owner-1',
        status: LoadStatus.Open,
      })

      ;(prisma.truck.findFirst as jest.Mock).mockResolvedValueOnce(null)

      await expect(service.create('owner-1', mockDto)).rejects.toThrow(NotFoundException)
    })
  })

  describe('Authorization Checks', () => {
    it('should throw NotFoundException when unauthorized user accesses booking detail', async () => {
      ;(prisma.booking.findFirst as jest.Mock).mockResolvedValueOnce(null)
      await expect(service.findOne('booking-1001', 'unauthorized-user')).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when unauthorized user attempts status update', async () => {
      ;(prisma.booking.findFirst as jest.Mock).mockResolvedValueOnce(null)
      await expect(service.updateStatus('booking-1001', 'unauthorized-user', BookingStatus.InTransit)).rejects.toThrow(NotFoundException)
    })
  })
})
