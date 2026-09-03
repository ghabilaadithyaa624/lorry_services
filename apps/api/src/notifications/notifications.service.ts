import { Injectable, Logger } from '@nestjs/common'
import { prisma, NotificationChannel, NotificationStatus } from '@lorrycarry/database'
import { GupshupService } from '../auth/gupshup.service'

export type NotificationCategory =
  | 'BOOKING'
  | 'LOAD'
  | 'TRUCK'
  | 'PAYMENT'
  | 'KYC'
  | 'TRACKING'
  | 'SYSTEM'

export interface SendNotificationPayload {
  userId: string
  /** Optional explicit recipient. Defaults to the user's registered phone. */
  recipient?: string
  channel?: NotificationChannel
  template: string
  title: string
  message: string
  category: NotificationCategory
  /** Message parameters substituted into the WhatsApp template. */
  params?: string[]
  actionUrl?: string
  metadata?: Record<string, unknown>
  /** Which user preference governs delivery. Defaults to `notifyWhatsapp`. */
  optInKey?: 'notifyWhatsapp' | 'notifySms' | 'notifyPush' | 'notifyCheckpoints'
  /** Force a persisted in-app alert without attempting an outbound send. */
  skipOutbound?: boolean
}

export interface SenderResult<T = unknown> {
  /** Persisted Notification row used for the in-app feed. */
  notification: T
  /** `true` when the outbound channel (WhatsApp) accepted the message. */
  delivered: boolean
  /** Human-readable delivery state: sent | failed | skipped | pending. */
  whatsappStatus: 'sent' | 'failed' | 'skipped' | 'pending'
  providerMsgId?: string
}

interface BookingLike {
  id: string
  loadOwnerId: string
  truckOwnerId: string
  agreedPrice: any
  status?: string
  load: {
    loadingAddress: string
    unloadingAddress: string
    user?: { id?: string; phone?: string; name?: string }
  }
  truck: {
    registrationNumber: string
    user?: { id?: string; phone?: string; name?: string }
  }
}

interface CheckpointLike {
  seq: number
  name: string
  crossedAt?: Date | null
  booking: BookingLike
}

/** WhatsApp template codes that must exist in the Gupshup approved templates. */
const TEMPLATES = {
  bookingConfirmedDriver: 'booking_confirmed_driver',
  bookingConfirmedShipper: 'booking_confirmed_shipper',
  dispatchUpdate: 'dispatch_update',
  deliveryCompleted: 'delivery_completed',
  checkpointCrossed: 'checkpoint_crossed',
} as const

/**
 * Central notification service.
 *
 * Responsible for the three requirement pillars:
 * 1. WhatsApp Business API automation (via Gupshup) for booking confirmation,
 *    dispatch updates and delivery completion.
 * 2. Persisted in-app alert rows so the notification centre always has a copy
 *    of the event, even if the outbound channel fails or is opted out.
 * 3. Read/unread state for the notification centre (via NotificationReceipt).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly gupshup: GupshupService) {}

  /**
   * Generic entry point used by every domain event. Creates the in-app
   * notification row first (so the alert is never lost), then attempts the
   * outbound WhatsApp message when the channel is enabled and configured.
   */
  async send(payload: SendNotificationPayload): Promise<SenderResult> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { preference: true },
    })

    if (!user) {
      this.logger.warn(`Notification skipped: user ${payload.userId} not found`)
      return {
        notification: null,
        delivered: false,
        whatsappStatus: 'skipped',
      }
    }

    const variables: any = {
      title: payload.title,
      category: payload.category,
      actionUrl: payload.actionUrl ?? null,
      template: payload.template,
      ...(payload.metadata ?? {}),
    }
    const recipient = payload.recipient ?? user.phone
    const channel = payload.channel ?? NotificationChannel.whatsapp

    // Persist first so the in-app centre has the event regardless of channel state.
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        channel,
        template: payload.template,
        variables,
        recipient,
        content: payload.message,
        status: NotificationStatus.Pending,
        provider: 'gupshup',
      },
    })

    // No outbound channel requested: the persisted row is a pure in-app alert.
    if (payload.skipOutbound || channel !== NotificationChannel.whatsapp) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.Sent,
          deliveredAt: new Date(),
          variables: { ...variables, whatsappStatus: 'skipped' },
        },
      })
      return {
        notification: await this.fetchNotification(notification.id),
        delivered: false,
        whatsappStatus: 'skipped',
      }
    }

    const preference = user.preference as Record<string, boolean> | null
    const optInKey = payload.optInKey ?? 'notifyWhatsapp'
    const optedIn = preference?.[optInKey] !== false

    if (!optedIn) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.Failed,
          failedAt: new Date(),
          failureReason: `User opted out of ${channel} notifications`,
          variables: { ...variables, whatsappStatus: 'skipped' },
        },
      })
      this.logger.log(
        `Notification ${notification.id} to ${recipient}: ${channel} opted out`,
      )
      return {
        notification: await this.fetchNotification(notification.id),
        delivered: false,
        whatsappStatus: 'skipped',
      }
    }

    try {
      const result = await this.gupshup.sendNotification(
        recipient,
        payload.template,
        payload.params ?? [],
      )

      if (result.success) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.Sent,
            deliveredAt: new Date(),
            providerMsgId: result.providerMsgId,
            variables: { ...variables, whatsappStatus: 'sent' },
          },
        })
        return {
          notification: await this.fetchNotification(notification.id),
          delivered: true,
          whatsappStatus: 'sent',
          providerMsgId: result.providerMsgId,
        }
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.Failed,
          failedAt: new Date(),
          failureReason: result.message,
          variables: { ...variables, whatsappStatus: 'failed' },
        },
      })
      return {
        notification: await this.fetchNotification(notification.id),
        delivered: false,
        whatsappStatus: 'failed',
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown send error'
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.Failed,
          failedAt: new Date(),
          failureReason: errorMessage,
          variables: { ...variables, whatsappStatus: 'failed' },
        },
      })
      this.logger.error(`Dispatch notification ${notification.id} failed: ${errorMessage}`)
      return {
        notification: await this.fetchNotification(notification.id),
        delivered: false,
        whatsappStatus: 'failed',
      }
    }
  }

  /**
   * Booking confirmation — notifies the truck owner (driver) and load owner
   * (shipper) as soon as a booking is created.
   */
  async sendBookingConfirmed(booking: BookingLike) {
    const shortId = booking.id.slice(0, 8).toUpperCase()
    await Promise.allSettled([
      this.send({
        userId: booking.truckOwnerId,
        recipient: booking.truck.user?.phone,
        template: TEMPLATES.bookingConfirmedDriver,
        title: 'New booking confirmed',
        message: `You have a confirmed shipment from ${booking.load.loadingAddress} to ${booking.load.unloadingAddress}.`,
        category: 'BOOKING',
        params: [
          booking.load.loadingAddress || 'Loading Point',
          booking.load.unloadingAddress || 'Unloading Point',
          String(booking.agreedPrice),
          shortId,
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, party: 'truck_owner' },
      }),
      this.send({
        userId: booking.loadOwnerId,
        recipient: booking.load.user?.phone,
        template: TEMPLATES.bookingConfirmedShipper,
        title: 'Booking confirmed',
        message: `Vehicle ${booking.truck.registrationNumber} is confirmed for your consignment.`,
        category: 'BOOKING',
        params: [
          booking.truck.registrationNumber || 'Truck',
          booking.truck.user?.name || 'Transporter',
          String(booking.agreedPrice),
          shortId,
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, party: 'load_owner' },
      }),
    ])
  }

  /**
   * Dispatch updates — fired on booking status transitions (In-transit,
   * Completed, Cancelled). Both counterparties receive a WhatsApp message and
   * an in-app alert.
   */
  async sendDispatchUpdate(booking: BookingLike, status: string) {
    const shortId = booking.id.slice(0, 8).toUpperCase()
    const statusMeta = this.dispatchStatusMeta(status)
    const statusLabel =
      status === 'InTransit' ? 'In Transit' : status === 'Cancelled' ? 'Cancelled' : status

    await Promise.allSettled([
      this.send({
        userId: booking.truckOwnerId,
        recipient: booking.truck.user?.phone,
        template: TEMPLATES.dispatchUpdate,
        title: statusMeta.driverTitle,
        message: statusMeta.driverMessage(booking),
        category: 'BOOKING',
        params: [
          shortId,
          statusLabel,
          booking.load.loadingAddress || 'Loading Point',
          booking.load.unloadingAddress || 'Unloading Point',
          booking.truck.registrationNumber || 'Vehicle',
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, status, party: 'truck_owner' },
      }),
      this.send({
        userId: booking.loadOwnerId,
        recipient: booking.load.user?.phone,
        template: TEMPLATES.dispatchUpdate,
        title: statusMeta.shipperTitle,
        message: statusMeta.shipperMessage(booking),
        category: 'BOOKING',
        params: [
          shortId,
          statusLabel,
          booking.truck.registrationNumber || 'Vehicle',
          booking.load.loadingAddress || 'Loading Point',
          booking.load.unloadingAddress || 'Unloading Point',
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, status, party: 'load_owner' },
      }),
    ])
  }

  /**
   * Delivery completion — fired when a booking is marked Completed or when a
   * Proof of Delivery is uploaded.
   */
  async sendDeliveryCompleted(booking: BookingLike) {
    const shortId = booking.id.slice(0, 8).toUpperCase()
    await Promise.allSettled([
      this.send({
        userId: booking.truckOwnerId,
        recipient: booking.truck.user?.phone,
        template: TEMPLATES.deliveryCompleted,
        title: 'Delivery completed',
        message: `Consignment ${shortId} delivered at ${booking.load.unloadingAddress}.`,
        category: 'BOOKING',
        params: [
          shortId,
          booking.load.unloadingAddress || 'Unloading Point',
          String(booking.agreedPrice),
          booking.truck.registrationNumber || 'Vehicle',
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, status: 'Completed', party: 'truck_owner' },
      }),
      this.send({
        userId: booking.loadOwnerId,
        recipient: booking.load.user?.phone,
        template: TEMPLATES.deliveryCompleted,
        title: 'Delivery completed',
        message: `Vehicle ${booking.truck.registrationNumber} has delivered your consignment.`,
        category: 'BOOKING',
        params: [
          shortId,
          booking.load.unloadingAddress || 'Unloading Point',
          String(booking.agreedPrice),
          booking.truck.registrationNumber || 'Vehicle',
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, status: 'Completed', party: 'load_owner' },
      }),
    ])
  }

  /**
   * Checkpoint crossed — a tracking event; governed by notifyCheckpoints.
   */
  async sendCheckpointCrossed(checkpoint: CheckpointLike) {
    const { booking } = checkpoint
    const progress = `${checkpoint.seq}/5`
    await Promise.allSettled([
      this.send({
        userId: booking.loadOwnerId,
        recipient: booking.load.user?.phone,
        template: TEMPLATES.checkpointCrossed,
        title: `Milestone ${progress}: ${checkpoint.name} crossed`,
        message: `Consignment on vehicle ${booking.truck?.registrationNumber} crossed ${checkpoint.name}.`,
        category: 'TRACKING',
        optInKey: 'notifyCheckpoints',
        params: [
          booking.truck?.registrationNumber || 'Truck',
          checkpoint.name,
          progress,
          new Date().toLocaleString('en-IN'),
        ],
        actionUrl: `/booking/${booking.id}`,
        metadata: { bookingId: booking.id, checkpointSeq: checkpoint.seq, party: 'load_owner' },
      }),
    ])
  }

  private dispatchStatusMeta(status: string) {
    if (status === 'Completed') {
      return {
        driverTitle: 'Delivery completed',
        shipperTitle: 'Delivery completed',
        driverMessage: (b: BookingLike) =>
          `Consignment ${b.id.slice(0, 8).toUpperCase()} delivered at ${b.load.unloadingAddress}.`,
        shipperMessage: (b: BookingLike) =>
          `Vehicle ${b.truck.registrationNumber} has delivered your consignment at ${b.load.unloadingAddress}.`,
      }
    }
    if (status === 'Cancelled') {
      return {
        driverTitle: 'Booking cancelled',
        shipperTitle: 'Booking cancelled',
        driverMessage: (b: BookingLike) =>
          `Booking ${b.id.slice(0, 8).toUpperCase()} has been cancelled by the shipper.`,
        shipperMessage: (b: BookingLike) =>
          `Booking ${b.id.slice(0, 8).toUpperCase()} for vehicle ${b.truck.registrationNumber} has been cancelled.`,
      }
    }
    return {
      driverTitle: 'Shipment dispatched',
      shipperTitle: 'Shipment in transit',
      driverMessage: (b: BookingLike) =>
        `Booking ${b.id.slice(0, 8).toUpperCase()} is now ${status} on route to ${b.load.unloadingAddress}.`,
      shipperMessage: (b: BookingLike) =>
        `Vehicle ${b.truck.registrationNumber} is ${status} for consignment ${b.id.slice(0, 8).toUpperCase()}.`,
    }
  }

  private async fetchNotification(id: string) {
    return prisma.notification.findUnique({ where: { id } })
  }
}
