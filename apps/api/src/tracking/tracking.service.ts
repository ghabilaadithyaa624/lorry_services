import { Injectable, Logger } from '@nestjs/common'
import { prisma, BookingStatus } from '@lorrycarry/database'
import { GupshupService } from '../auth/gupshup.service'

/**
 * Checkpoint-based tracking service
 * Updates status when driver crosses geofenced checkpoints
 * NO continuous GPS streaming - only checkpoint triggers
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name)

  constructor(private gupshup: GupshupService) {}

  /**
   * Process geofence crossing event from mobile app
   */
  async processGeofenceCrossing(
    bookingId: string,
    checkpointSeq: number,
    deviceLocation: { lat: number; lng: number }
  ) {
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { bookingId, seq: checkpointSeq },
      include: {
        booking: {
          include: {
            load: { include: { user: { select: { phone: true } } } },
            truck: { include: { user: { select: { phone: true } } } },
          },
        },
      },
    })

    if (!checkpoint || checkpoint.crossedAt) {
      return { success: false, message: 'Checkpoint not found or already crossed' }
    }

    // Verify device is within radius
    const cpLat = Number(checkpoint.lat)
    const cpLng = Number(checkpoint.lng)
    const distance = this.calculateDistance(
      deviceLocation.lat,
      deviceLocation.lng,
      cpLat,
      cpLng
    )

    if (distance > checkpoint.radiusM / 1000) {
      return { success: false, message: 'Device outside checkpoint radius' }
    }

    // Mark checkpoint as crossed
    await prisma.checkpoint.update({
      where: { id: checkpoint.id },
      data: {
        crossedAt: new Date(),
        crossedBy: 'device',
      },
    })

    // Update booking status if first or last checkpoint
    if (checkpointSeq === 1) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.InTransit },
      })
    }

    if (checkpointSeq === 5) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.Completed },
      })
    }

    // Send WhatsApp notification
    await this.sendCheckpointNotification(checkpoint, checkpointSeq)

    return { success: true, message: 'Checkpoint recorded' }
  }

  /**
   * Send checkpoint crossed notification
   */
  private async sendCheckpointNotification(checkpoint: any, seq: number) {
    const { booking } = checkpoint
    const progress = `${seq}/5`

    if (booking?.load?.user?.phone) {
      // Notify load owner
      await this.gupshup.sendNotification(
        booking.load.user.phone,
        'checkpoint_crossed',
        [
          booking.truck?.registrationNumber || 'Truck',
          checkpoint.name,
          progress,
          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        ]
      )
    }
  }

  /**
   * Calculate distance between two points in km (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get current tracking status for a booking
   */
  async getTrackingStatus(bookingId: string) {
    const checkpoints = await prisma.checkpoint.findMany({
      where: { bookingId },
      orderBy: { seq: 'asc' },
    })

    const currentCheckpoint = checkpoints.find((cp) => !cp.crossedAt)
    const lastCrossed = checkpoints.filter((cp) => cp.crossedAt).pop()

    return {
      totalCheckpoints: checkpoints.length,
      crossedCount: checkpoints.filter((cp) => cp.crossedAt).length,
      currentCheckpoint: currentCheckpoint?.name || 'Completed',
      lastCrossedAt: lastCrossed?.crossedAt,
      nextCheckpoint: currentCheckpoint
        ? {
            name: currentCheckpoint.name,
            etaMinutes: currentCheckpoint.etaMinutes,
          }
        : null,
      checkpoints: checkpoints.map((cp) => ({
        seq: cp.seq,
        name: cp.name,
        crossed: !!cp.crossedAt,
        crossedAt: cp.crossedAt,
      })),
    }
  }
}
