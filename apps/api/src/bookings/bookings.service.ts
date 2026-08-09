import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { 
  prisma, 
  BookingStatus, 
  LoadStatus, 
  SubscriptionStatus 
} from '@lorrycarry/database'
import { GupshupService } from '../auth/gupshup.service'

export interface CreateBookingDto {
  loadId: string
  truckId: string
  agreedPrice: number
  ewayBillNumber?: string
  liabilityAccepted: boolean
}

@Injectable()
export class BookingsService {
  constructor(private gupshup: GupshupService) {}

  /**
   * Create booking with commercial terms within an atomic database transaction
   * 1. Validates load status and ownership
   * 2. Validates truck availability & verification
   * 3. Checks load owner active subscription
   * 4. Atomically transitions load to Matched
   * 5. Creates booking record
   * 6. Generates 5 highway tracking checkpoints
   */
  async create(
    loadOwnerId: string,
    dto: CreateBookingDto
  ) {
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Verify load exists, belongs to user, and is open
      const load = await tx.load.findFirst({
        where: { id: dto.loadId, userId: loadOwnerId, status: LoadStatus.Open },
        include: { user: true },
      })

      if (!load) {
        throw new NotFoundException('Load not found or not available')
      }

      // 2. Verify truck exists, is verified, and has no active bookings
      const truck = await tx.truck.findFirst({
        where: { 
          id: dto.truckId, 
          verificationStatus: 'Verified',
          bookings: { none: { status: { in: [BookingStatus.Confirmed, BookingStatus.InTransit] } } }
        },
        include: { user: true },
      })

      if (!truck) {
        throw new NotFoundException('Truck not found, unverified, or currently assigned to another active trip')
      }

      // 3. Check load owner has active subscription
      const subscription = await tx.subscription.findFirst({
        where: {
          userId: loadOwnerId,
          status: SubscriptionStatus.active,
          expiresAt: { gt: new Date() },
        },
      })

      if (!subscription) {
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Active subscription required to create bookings',
        })
      }

      // 4. Atomically claim and transition load status to prevent concurrent double-booking
      const claimResult = await tx.load.updateMany({
        where: { id: dto.loadId, userId: loadOwnerId, status: LoadStatus.Open },
        data: { status: LoadStatus.Matched },
      })

      if (claimResult.count === 0) {
        throw new ConflictException('Load is no longer available or has already been booked')
      }

      // 5. Create booking record
      const createdBooking = await tx.booking.create({
        data: {
          loadId: dto.loadId,
          truckId: dto.truckId,
          loadOwnerId,
          truckOwnerId: truck.userId,
          agreedPrice: dto.agreedPrice,
          ewayBillNumber: dto.ewayBillNumber,
          liabilityAccepted: dto.liabilityAccepted,
          liabilityAcceptedAt: dto.liabilityAccepted ? new Date() : null,
          status: BookingStatus.Confirmed,
          advanceConfirmed: false,
          balanceConfirmed: false,
        },
        include: {
          load: {
            include: {
              user: { select: { phone: true, name: true } },
            },
          },
          truck: {
            include: {
              user: { select: { phone: true, name: true } },
            },
          },
        },
      })

      // 6. Create checkpoints (5 major waypoints)
      const startLat = Number(load.loadingLat ?? 18.5204)
      const startLng = Number(load.loadingLng ?? 73.8567)
      const endLat = Number(load.unloadingLat ?? 12.9716)
      const endLng = Number(load.unloadingLng ?? 77.5946)

      await this.createCheckpointsTx(tx, createdBooking.id, startLat, startLng, endLat, endLng)

      return createdBooking
    })

    // Send WhatsApp notifications asynchronously outside the transaction
    await this.sendBookingNotifications(booking)

    return booking
  }

  /**
   * Create 5 checkpoints for trip tracking inside transaction
   */
  private async createCheckpointsTx(
    tx: any,
    bookingId: string,
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) {
    // Calculate waypoints
    const checkpoints = [
      { name: 'Loading Point', lat: startLat, lng: startLng, radiusM: 500 },
      { name: 'Checkpoint 1', lat: startLat + (endLat - startLat) * 0.25, lng: startLng + (endLng - startLng) * 0.25, radiusM: 2000 },
      { name: 'Checkpoint 2', lat: startLat + (endLat - startLat) * 0.5, lng: startLng + (endLng - startLng) * 0.5, radiusM: 2000 },
      { name: 'Checkpoint 3', lat: startLat + (endLat - startLat) * 0.75, lng: startLng + (endLng - startLng) * 0.75, radiusM: 2000 },
      { name: 'Unloading Point', lat: endLat, lng: endLng, radiusM: 500 },
    ]

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i]
      await tx.checkpoint.create({
        data: {
          bookingId,
          seq: i + 1,
          name: cp.name,
          lat: cp.lat,
          lng: cp.lng,
          radiusM: cp.radiusM,
        },
      })
    }
  }

  /**
   * Send booking confirmation WhatsApp messages
   */
  private async sendBookingNotifications(booking: any) {
    // Notify truck owner
    if (booking.truck?.user?.phone) {
      await this.gupshup.sendNotification(
        booking.truck.user.phone,
        'booking_confirmed_driver',
        [
          booking.load?.loadingAddress || 'Loading Point',
          booking.load?.unloadingAddress || 'Unloading Point',
          booking.agreedPrice.toString(),
          booking.id.slice(0, 8),
        ]
      )
    }

    // Notify load owner
    if (booking.load?.user?.phone) {
      await this.gupshup.sendNotification(
        booking.load.user.phone,
        'booking_confirmed_shipper',
        [
          booking.truck?.registrationNumber || 'Truck',
          booking.truck?.user?.name || 'Transporter',
          booking.agreedPrice.toString(),
          booking.id.slice(0, 8),
        ]
      )
    }
  }

  /**
   * Update booking status (advance paid, in transit, etc.)
   */
  async updateStatus(
    bookingId: string,
    userId: string,
    status: BookingStatus,
    updateData?: { advanceConfirmed?: boolean; balanceConfirmed?: boolean }
  ) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }],
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    const data: any = { status }

    if (updateData?.advanceConfirmed) {
      data.advanceConfirmed = true
      data.advanceConfirmedAt = new Date()
    }

    if (updateData?.balanceConfirmed) {
      data.balanceConfirmed = true
      data.balanceConfirmedAt = new Date()
    }

    if (status === BookingStatus.InTransit) {
      data.startedAt = new Date()
    }

    if (status === BookingStatus.Completed) {
      data.completedAt = new Date()
      // Update load status
      await prisma.load.update({
        where: { id: booking.loadId },
        data: { status: LoadStatus.Completed },
      })
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data,
    })
  }

  /**
   * Get booking with checkpoints
   */
  async findOne(bookingId: string, userId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }],
      },
      include: {
        load: true,
        truck: {
          include: {
            user: {
              select: { name: true, phone: true },
            },
          },
        },
        checkpoints: {
          orderBy: { seq: 'asc' },
        },
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    return booking
  }

  /**
   * Get user's bookings
   */
  async findByUser(userId: string, role: 'load_owner' | 'truck_owner') {
    const where = role === 'load_owner' 
      ? { loadOwnerId: userId }
      : { truckOwnerId: userId }

    return prisma.booking.findMany({
      where,
      include: {
        load: {
          select: {
            loadingAddress: true,
            unloadingAddress: true,
            tonnageRequired: true,
          },
        },
        truck: {
          select: {
            registrationNumber: true,
            bodyType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
