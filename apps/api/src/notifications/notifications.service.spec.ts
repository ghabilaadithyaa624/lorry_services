import { Test, TestingModule } from '@nestjs/testing'
import { NotificationsService } from './notifications.service'
import { GupshupService } from '../auth/gupshup.service'
import { prisma } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
  NotificationChannel: {
    whatsapp: 'whatsapp',
    sms: 'sms',
    push: 'push',
  },
  NotificationStatus: {
    Pending: 'Pending',
    Sent: 'Sent',
    Delivered: 'Delivered',
    Failed: 'Failed',
  },
}))

describe('NotificationsService', () => {
  let service: NotificationsService
  let gupshup: jest.Mocked<GupshupService>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: GupshupService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({
              success: true,
              message: 'sent',
              providerMsgId: 'msg-1',
            }),
          },
        },
      ],
    }).compile()

    service = module.get<NotificationsService>(NotificationsService)
    gupshup = module.get(GupshupService)
  })

  it('should persist an in-app notification and dispatch WhatsApp', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u-1',
      phone: '+919876543210',
      preference: { notifyWhatsapp: true },
    })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'n-1',
      userId: 'u-1',
    })
    ;(prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'n-1',
      userId: 'u-1',
      status: 'Sent',
      variables: { whatsappStatus: 'sent' },
    })

    const result = await service.send({
      userId: 'u-1',
      template: 'booking_confirmed_driver',
      title: 'Booking confirmed',
      message: 'Your shipment is confirmed.',
      category: 'BOOKING',
      params: ['Pune', 'Bangalore', '25000', 'B1001'],
    })

    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u-1',
          channel: 'whatsapp',
          template: 'booking_confirmed_driver',
          status: 'Pending',
          provider: 'gupshup',
        }),
      }),
    )
    expect(gupshup.sendNotification).toHaveBeenCalledWith(
      '+919876543210',
      'booking_confirmed_driver',
      ['Pune', 'Bangalore', '25000', 'B1001'],
    )
    expect(result.whatsappStatus).toBe('sent')
  })

  it('should skip WhatsApp when the user has opted out', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u-1',
      phone: '+919876543210',
      preference: { notifyWhatsapp: false },
    })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'n-1',
      userId: 'u-1',
    })
    ;(prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'n-1',
      status: 'Failed',
    })

    const result = await service.send({
      userId: 'u-1',
      template: 'delivery_completed',
      title: 'Delivery completed',
      message: 'Delivered.',
      category: 'BOOKING',
    })

    expect(gupshup.sendNotification).not.toHaveBeenCalled()
    expect(result.whatsappStatus).toBe('skipped')
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n-1' },
        data: expect.objectContaining({
          status: 'Failed',
          failureReason: expect.stringContaining('opted out'),
        }),
      }),
    )
  })

  it('should record a provider failure without throwing', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u-1',
      phone: '+919876543210',
      preference: { notifyWhatsapp: true },
    })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'n-1',
    })
    ;(prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'n-1',
      status: 'Failed',
    })
    gupshup.sendNotification.mockResolvedValueOnce({
      success: false,
      message: 'template not approved',
    })

    const result = await service.send({
      userId: 'u-1',
      template: 'dispatch_update',
      title: 'Dispatch',
      message: 'Updated.',
      category: 'BOOKING',
    })

    expect(result.delivered).toBe(false)
    expect(result.whatsappStatus).toBe('failed')
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failureReason: 'template not approved' }),
      }),
    )
  })
})
