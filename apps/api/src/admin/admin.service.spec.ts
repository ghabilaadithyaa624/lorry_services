import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { AdminService } from './admin.service'
import { prisma, UserRole, VerificationStatus } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    load: { count: jest.fn(), findMany: jest.fn() },
    truck: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    booking: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
    bookingDispute: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    document: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    subscription: { count: jest.fn(), findMany: jest.fn() },
    payment: { count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    $transaction: jest.fn((args) => Promise.all(args)),
  }
  return {
    prisma: mockPrisma,
    UserRole: {
      truck_driver: 'truck_driver',
      factory_owner: 'factory_owner',
      admin: 'admin',
    },
    VerificationStatus: {
      Pending: 'Pending',
      Verified: 'Verified',
      Rejected: 'Rejected',
    },
    LoadStatus: {
      Open: 'Open',
      Matched: 'Matched',
      InTransit: 'In-transit',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
    },
    BookingStatus: {
      Pending: 'Pending',
      Confirmed: 'Confirmed',
      InTransit: 'In-transit',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
    },
    PaymentPurpose: {
      subscription: 'subscription',
      booking_advance: 'booking_advance',
      booking_balance: 'booking_balance',
    },
    PaymentStatus: {
      Pending: 'Pending',
      Success: 'Success',
      Failed: 'Failed',
      Refunded: 'Refunded',
    },
    DisputeStatus: {
      Open: 'Open',
      Investigating: 'Investigating',
      Resolved: 'Resolved',
      Rejected: 'Rejected',
    },
    VahanCheckStatus: {
      NotChecked: 'NotChecked',
      Pending: 'Pending',
      Verified: 'Verified',
      Mismatch: 'Mismatch',
      Unavailable: 'Unavailable',
      Error: 'Error',
    },
    SubscriptionStatus: {
      active: 'active',
      expired: 'expired',
      cancelled: 'cancelled',
    },
    FastagStatus: {
      Unknown: 'Unknown',
      Active: 'Active',
      LowBalance: 'LowBalance',
      Inactive: 'Inactive',
    },
    EwayBillStatus: {
      Pending: 'Pending',
      Active: 'Active',
      Expired: 'Expired',
      Invalid: 'Invalid',
    },
  }
})

describe('AdminService', () => {
  let service: AdminService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService],
    }).compile()

    service = module.get<AdminService>(AdminService)
  })

  describe('assertAdmin (via getDashboardStats)', () => {
    it('should throw ForbiddenException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.getDashboardStats('admin-id')).rejects.toThrow(
        new ForbiddenException('Admin access required'),
      )
    })

    it('should throw ForbiddenException if user is not admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.truck_driver })

      await expect(service.getDashboardStats('admin-id')).rejects.toThrow(
        new ForbiddenException('Admin access required'),
      )
    })

    it('should allow access if user is admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })

      // Mock other calls in getDashboardStats just to prevent errors
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.load.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.truck.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.booking.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.document.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.subscription.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.payment.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } })

      const res = await service.getDashboardStats('admin-id')
      expect(res).toBeDefined()
    })
  })

  describe('getDashboardStats', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should return correct stats from prisma models', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(10)
      ;(prisma.load.count as jest.Mock).mockResolvedValue(20)
      ;(prisma.truck.count as jest.Mock).mockResolvedValue(30)
      ;(prisma.booking.count as jest.Mock).mockResolvedValue(40)
      ;(prisma.document.count as jest.Mock).mockResolvedValue(5)
      ;(prisma.subscription.count as jest.Mock).mockResolvedValue(15)
      ;(prisma.payment.findMany as jest.Mock).mockResolvedValue([{ id: 1 }])
      ;(prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 500 } })

      const result = await service.getDashboardStats('admin-id')

      expect(result).toEqual({
        totalUsers: 10,
        totalLoads: 20,
        totalTrucks: 30,
        totalBookings: 40,
        pendingDocuments: 5,
        activeSubscriptions: 15,
        activeTrials: 10,
        expiredTrials: 10,
        totalRevenue: 500,
        recentPayments: [{ id: 1 }],
      })
    })

    it('should handle null totalRevenue sum', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(10)
      ;(prisma.load.count as jest.Mock).mockResolvedValue(20)
      ;(prisma.truck.count as jest.Mock).mockResolvedValue(30)
      ;(prisma.booking.count as jest.Mock).mockResolvedValue(40)
      ;(prisma.document.count as jest.Mock).mockResolvedValue(5)
      ;(prisma.subscription.count as jest.Mock).mockResolvedValue(15)
      ;(prisma.payment.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } })

      const result = await service.getDashboardStats('admin-id')

      expect(result.totalRevenue).toBe(0)
    })
  })

  describe('getAnalytics', () => {
    const queueAnalyticsMocks = () => {
      ;(prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(12) // total completed
        .mockResolvedValueOnce(5) // this period
        .mockResolvedValueOnce(3) // previous period
      ;(prisma.booking.groupBy as jest.Mock).mockResolvedValue([
        { status: 'Completed', _count: { _all: 12 } },
        { status: 'Pending', _count: { _all: 4 } },
        { status: 'Confirmed', _count: { _all: 3 } },
        { status: 'In-transit', _count: { _all: 2 } },
      ])
      ;(prisma.booking.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { agreedPrice: 120000 }, _avg: { agreedPrice: 10000 } })
        .mockResolvedValueOnce({ _sum: { agreedPrice: 60000 } })
        .mockResolvedValueOnce({ _sum: { agreedPrice: 55000 } })
      ;(prisma.payment.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 25000 } })
        .mockResolvedValueOnce({ _sum: { amount: 20000 } })
        .mockResolvedValueOnce({ _sum: { amount: 5000 } })
    }

    beforeEach(() => {
      ;(prisma.booking.count as jest.Mock).mockReset()
      ;(prisma.booking.groupBy as jest.Mock).mockReset()
      ;(prisma.booking.aggregate as jest.Mock).mockReset()
      ;(prisma.payment.aggregate as jest.Mock).mockReset()
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should throw ForbiddenException if user is not admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.truck_driver })
      await expect(service.getAnalytics('user-id')).rejects.toThrow(
        new ForbiddenException('Admin access required'),
      )
    })

    it('should return aggregated totals with zero route data', async () => {
      queueAnalyticsMocks()
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getAnalytics('admin-id', 30)

      expect(result.rangeDays).toBe(30)
      expect(result.trips.totalCompleted).toBe(12)
      expect(result.trips.periodCompleted).toBe(5)
      expect(result.trips.changePercent).toBe(66.7)
      expect(result.earnings.grossBookingValue).toBe(120000)
      expect(result.earnings.averageTripEarnings).toBe(10000)
      expect(result.earnings.platformRevenue).toBe(25000)
      expect(result.earnings.subscriptionRevenue).toBe(20000)
      expect(result.earnings.bookingPaymentRevenue).toBe(5000)
      expect(result.bookings.active).toBe(9)
      expect(result.bookings.pending).toBe(4)
      expect(result.bookings.confirmed).toBe(3)
      expect(result.bookings.inTransit).toBe(2)
      expect(result.bookings.completionRate).toBe(100)
      expect(result.routes.totalRoutes).toBe(0)
      expect(result.routes.averageEfficiency).toBe(0)
      expect(result.trips.completedByMonth).toHaveLength(6)
    })

    it('should build route efficiency heatmap with monthly traffic', async () => {
      queueAnalyticsMocks()
      const now = Date.now()
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          agreedPrice: '50000',
          startedAt: new Date(now - 30 * 60 * 60 * 1000),
          completedAt: new Date(now - 5 * 60 * 60 * 1000),
          load: {
            loadingAddress: 'Plot 12, Baner, Pune, Maharashtra 411001',
            loadingPin: '411001',
            unloadingAddress: 'CST Road, Kalina, Mumbai, Maharashtra 400098',
            unloadingPin: '400098',
            expectedDeliveryAt: new Date(now + 12 * 60 * 60 * 1000),
          },
          checkpoints: [
            { seq: 1, crossedAt: new Date(now - 22 * 60 * 60 * 1000), etaMinutes: null },
            { seq: 2, crossedAt: new Date(now - 18 * 60 * 60 * 1000), etaMinutes: null },
            { seq: 3, crossedAt: new Date(now - 12 * 60 * 60 * 1000), etaMinutes: null },
            { seq: 4, crossedAt: new Date(now - 8 * 60 * 60 * 1000), etaMinutes: null },
            { seq: 5, crossedAt: new Date(now - 5 * 60 * 60 * 1000), etaMinutes: null },
          ],
        },
      ])

      const result = await service.getAnalytics('admin-id', 90)

      expect(result.earnings.periodEarnings).toBe(50000)
      expect(result.routes.totalRoutes).toBe(1)
      expect(result.routes.heatmap).toHaveLength(1)
      expect(result.routes.heatmap[0].origin).toBe('Pune')
      expect(result.routes.heatmap[0].destination).toBe('Mumbai')
      expect(result.routes.heatmap[0].trips).toBe(1)
      expect(result.routes.heatmap[0].efficiencyScore).toBeGreaterThan(0)
      // 25h trip: transit 98 (100 - (25-24)*2), all 5 checkpoints crossed,
      // on-time → composite 0.5*98 + 0.3*100 + 0.2*100 = 99.
      expect(result.routes.heatmap[0].efficiencyScore).toBe(99)
      expect(result.routes.heatmap[0].months).toHaveLength(6)
      expect(result.routes.heatmap[0].months.reduce((a, m) => a + m.trips, 0)).toBe(1)
    })

    it('should fall back to default 30 day range for invalid ranges', async () => {
      queueAnalyticsMocks()
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getAnalytics('admin-id', 7)

      expect(result.rangeDays).toBe(30)
    })
  })

  describe('listUsers', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should query all users with correct pagination if role not provided', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 1 }])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(25)

      const result = await service.listUsers('admin-id', undefined, 2, 10)

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10, // (2-1) * 10
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { loads: true, trucks: true, subscriptions: true } } },
      })
      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} })

      expect(result).toEqual({ users: [{ id: 1 }], total: 25, page: 2, pages: 3 })
    })

    it('should query by role if role is provided', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 1 }])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(15)

      const result = await service.listUsers('admin-id', UserRole.truck_driver, 1, 10)

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { role: UserRole.truck_driver },
        skip: 0,
      }))
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: UserRole.truck_driver } })

      expect(result.pages).toBe(2)
    })
  })

  describe('getPendingDocuments', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should query pending documents', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([{ id: 'doc-1' }])

      const result = await service.getPendingDocuments('admin-id')

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { verificationStatus: VerificationStatus.Pending },
        orderBy: { createdAt: 'asc' },
        include: expect.any(Object),
      })
      expect(result).toEqual([{ id: 'doc-1' }])
    })
  })

  describe('verifyDocument', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should throw NotFoundException if document not found', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.verifyDocument('admin-id', 'doc-1', 'Verified')).rejects.toThrow(
        new NotFoundException('Document not found'),
      )
    })

    it('should reject document and mark truck as Rejected', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: 'doc-1', truckId: 'truck-1' })
      ;(prisma.document.update as jest.Mock).mockResolvedValue({ id: 'doc-1', status: 'Rejected' })

      const result = await service.verifyDocument('admin-id', 'doc-1', 'Rejected', 'Bad image')

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: {
          verificationStatus: 'Rejected',
          verifiedBy: 'admin-id',
          verificationNotes: 'Bad image',
          verifiedAt: expect.any(Date),
        }
      })
      expect(prisma.truck.update).toHaveBeenCalledWith({
        where: { id: 'truck-1' },
        data: { verificationStatus: VerificationStatus.Rejected },
      })
      expect(result).toEqual({ id: 'doc-1', status: 'Rejected' })
    })

    it('should verify document and NOT update truck if not all docs are Verified', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: 'doc-1', truckId: 'truck-1' })
      ;(prisma.document.update as jest.Mock).mockResolvedValue({ id: 'doc-1', status: 'Verified' })
      // Other docs for this truck: one is Pending
      ;(prisma.document.findMany as jest.Mock).mockResolvedValue([
        { id: 'doc-1', verificationStatus: VerificationStatus.Verified },
        { id: 'doc-2', verificationStatus: VerificationStatus.Pending },
      ])

      await service.verifyDocument('admin-id', 'doc-1', 'Verified')

      // Since one doc is still Pending, truck is not updated
      expect(prisma.truck.update).not.toHaveBeenCalled()
    })

    it('should verify document and update truck to Verified if all docs are Verified', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: 'doc-1', truckId: 'truck-1' })
      ;(prisma.document.update as jest.Mock).mockResolvedValue({ id: 'doc-1', status: 'Verified' })
      // All docs are Verified
      ;(prisma.document.findMany as jest.Mock).mockResolvedValue([
        { id: 'doc-1', verificationStatus: VerificationStatus.Verified },
        { id: 'doc-2', verificationStatus: VerificationStatus.Verified },
      ])

      await service.verifyDocument('admin-id', 'doc-1', 'Verified')

      // Truck should be updated
      expect(prisma.truck.update).toHaveBeenCalledWith({
        where: { id: 'truck-1' },
        data: {
          verificationStatus: VerificationStatus.Verified,
          verifiedAt: expect.any(Date),
        }
      })
    })
  })

  describe('verifyTruck', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should verify truck and set verifiedAt', async () => {
      (prisma.truck.update as jest.Mock).mockResolvedValue({ id: 'truck-1' })

      await service.verifyTruck('admin-id', 'truck-1', 'Verified')

      expect(prisma.truck.update).toHaveBeenCalledWith({
        where: { id: 'truck-1' },
        data: {
          verificationStatus: 'Verified',
          verifiedAt: expect.any(Date),
        }
      })
    })

    it('should reject truck and set verifiedAt to null', async () => {
      (prisma.truck.update as jest.Mock).mockResolvedValue({ id: 'truck-1' })

      await service.verifyTruck('admin-id', 'truck-1', 'Rejected')

      expect(prisma.truck.update).toHaveBeenCalledWith({
        where: { id: 'truck-1' },
        data: {
          verificationStatus: 'Rejected',
          verifiedAt: null,
        }
      })
    })
  })

  describe('listSubscriptions', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should list subscriptions with pagination', async () => {
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([{ id: 'sub-1' }])
      ;(prisma.subscription.count as jest.Mock).mockResolvedValue(30)

      const result = await service.listSubscriptions('admin-id', 2, 20)

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      })
      expect(result).toEqual({ subscriptions: [{ id: 'sub-1' }], total: 30, page: 2, pages: 2 })
    })
  })

  describe('listBookings', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should list bookings with pagination', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([{ id: 'book-1' }])
      ;(prisma.booking.count as jest.Mock).mockResolvedValue(5)

      const result = await service.listBookings('admin-id', 1, 10)

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      })
      expect(result).toEqual({ bookings: [{ id: 'book-1' }], total: 5, page: 1, pages: 1 })
    })
  })

  describe('getIntelligence', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.admin })
    })

    it('should throw ForbiddenException if user is not admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.factory_owner })

      await expect(service.getIntelligence('user-id')).rejects.toThrow(
        new ForbiddenException('Admin access required'),
      )
    })

    it('should aggregate real platform data and classify into REAL, ESTIMATED, and PREDICTIVE metrics', async () => {
      const now = Date.now()
      const mockLoads = [
        {
          id: 'load-1',
          loadingAddress: 'Guindy Industrial Estate, Chennai, Tamil Nadu 600032',
          unloadingAddress: 'Peenya Industrial Area, Bengaluru, Karnataka 560058',
          tonnageRequired: 20,
          truckType: 'Open',
          status: 'Completed',
          urgent: false,
          maxPrice: 45000,
        },
        {
          id: 'load-2',
          loadingAddress: 'Ambattur, Chennai, Tamil Nadu 600058',
          unloadingAddress: 'Electronic City, Bengaluru, Karnataka 560100',
          tonnageRequired: 18,
          truckType: 'Container',
          status: 'Open',
          urgent: true,
          maxPrice: 42000,
        },
      ]

      const mockTrucks = [
        {
          id: 'truck-1',
          registrationNumber: 'TN01AB1234',
          bodyType: 'Open',
          tonnageCapacity: 25,
          verificationStatus: 'Verified',
          vahanStatus: 'Verified',
          fastagStatus: 'Active',
          preferredDestinations: ['Bengaluru', 'Chennai'],
        },
        {
          id: 'truck-2',
          registrationNumber: 'KA01CD5678',
          bodyType: 'Container',
          tonnageCapacity: 20,
          verificationStatus: 'Verified',
          vahanStatus: 'Verified',
          fastagStatus: 'Active',
          preferredDestinations: ['Mumbai', 'Pune'],
        },
      ]

      const mockBookings = [
        {
          id: 'booking-1',
          status: 'Completed',
          agreedPrice: 44000,
          startedAt: new Date(now - 20 * 3600 * 1000),
          completedAt: new Date(now - 5 * 3600 * 1000),
          ewayBillStatus: 'Active',
          load: {
            loadingAddress: 'Guindy, Chennai, Tamil Nadu',
            unloadingAddress: 'Peenya, Bengaluru, Karnataka',
            tonnageRequired: 20,
            expectedDeliveryAt: new Date(now + 2 * 3600 * 1000),
          },
          truck: { registrationNumber: 'TN01AB1234' },
        },
        {
          id: 'booking-2',
          status: 'Completed',
          agreedPrice: 40000,
          startedAt: new Date(now - 15 * 3600 * 1000),
          completedAt: new Date(now - 2 * 3600 * 1000),
          ewayBillStatus: 'Expired',
          load: {
            loadingAddress: 'Chennai Port, Chennai',
            unloadingAddress: 'Whitefield, Bengaluru',
            tonnageRequired: 18,
            expectedDeliveryAt: new Date(now - 4 * 3600 * 1000),
          },
          truck: { registrationNumber: 'TN01AB1234' },
        },
      ]

      ;(prisma.$transaction as jest.Mock).mockResolvedValue([
        20, // totalPlatformLoads
        8,  // openLoads
        4,  // inTransitLoads
        8,  // completedLoads
        10, // totalPlatformTrucks
        8,  // verifiedTrucksCount
        7,  // vahanVerifiedTrucksCount
        6,  // fastagActiveTrucksCount
        15, // totalBookings
        10, // completedBookingsCount
        3,  // inTransitBookingsCount
        { _sum: { amount: 500000 } }, // grossPaymentSum
        { _sum: { amount: 60000 } },  // subscriptionPaymentsSum
        12, // totalSubscriptions
        8,  // activeSubscriptions
        4,  // activeTrials
        5,  // totalDisputes
        4,  // resolvedDisputes
        1,  // openDisputes
        20, // totalDocuments
        16, // verifiedDocuments
        mockLoads,
        mockTrucks,
        mockBookings,
        42, // totalUsers
        2,  // pendingDocuments
        2,  // rejectedDocuments
        1,  // investigatingDisputes
        1,  // rejectedDisputes
      ])

      const result = await service.getIntelligence('admin-id')

      expect(result).toBeDefined()
      expect(result.realMetrics).toEqual({
        totalUsers: 42,
        totalPlatformLoads: 20,
        openLoads: 8,
        inTransitLoads: 4,
        completedLoads: 8,
        totalPlatformTrucks: 10,
        verifiedTrucksCount: 8,
        vahanVerifiedTrucksCount: 7,
        fastagActiveTrucksCount: 6,
        fastagLowBalanceTrucksCount: 0,
        fastagInactiveTrucksCount: 0,
        fastagUnknownTrucksCount: 0,
        totalCompletedBookings: 10,
        totalBookings: 15,
        inTransitBookings: 3,
        totalGrossPaymentVolumeINR: 500000,
        subscriptionPaymentVolumeINR: 60000,
        kycApprovalRatePercent: 80,
        documentComplianceRatePercent: 80,
        vahanVerificationRatePercent: 70,
        totalSubscriptionsCount: 12,
        activeSubscriptionsCount: 8,
        activeTrialsCount: 4,
        totalDisputesCount: 5,
        openDisputesCount: 1,
        investigatingDisputesCount: 1,
        rejectedDisputesCount: 1,
        resolvedDisputesCount: 4,
        totalDocumentsCount: 20,
        pendingDocumentsCount: 2,
        rejectedDocumentsCount: 2,
        verifiedDocumentsCount: 16,
        ewayBillActiveCount: 1,
        ewayBillExpiredCount: 1,
        ewayBillInvalidCount: 0,
        ewayBillPendingCount: 0,
        ewayBillCoverageRatePercent: 100,
      })

      expect(result.estimatedMetrics.nationalAvgRatePerTonKmINR).toBe(3.95)
      expect(result.estimatedMetrics.avgTransitOnTimeRatePercent).toBe(50) // 1 out of 2 on-time
      expect(result.estimatedMetrics.estimatedEmptyKmSavedTotal).toBe(10 * 320)
      expect(result.estimatedMetrics.disputeResolutionRatePercent).toBe(80)

      expect(result.predictiveMetrics.projectedMonthlyVolumeTons).toBe(20 * 18 * 4)
      expect(result.predictiveMetrics.demandSupplyRatio).toBe(2)
      expect(result.predictiveMetrics.emptyRunReductionPotentialKm).toBe(320)

      // Chennai ➔ Bengaluru has 2 bookings + 2 loads -> SUFFICIENT_DATA
      const maaBlr = result.corridors.find((c) => c.corridorId === 'corridor-maa-blr')
      expect(maaBlr).toBeDefined()
      expect(maaBlr?.dataStatus).toBe('SUFFICIENT_DATA')
      expect(maaBlr?.realMetrics.totalBookings).toBe(2)
      expect(maaBlr?.realMetrics.completedTrips).toBe(2)
      expect(maaBlr?.realMetrics.grossBookingValueINR).toBe(84000)

      // Mumbai ➔ Pune has 0 loads/bookings -> INSUFFICIENT_DATA
      const bomPnq = result.corridors.find((c) => c.corridorId === 'corridor-bom-pnq')
      expect(bomPnq).toBeDefined()
      expect(bomPnq?.dataStatus).toBe('INSUFFICIENT_DATA')
    })

    it('should handle zero counts and empty data gracefully without runtime errors', async () => {
      ;(prisma.$transaction as jest.Mock).mockResolvedValue([
        0, // totalPlatformLoads
        0, // openLoads
        0, // inTransitLoads
        0, // completedLoads
        0, // totalPlatformTrucks
        0, // verifiedTrucksCount
        0, // vahanVerifiedTrucksCount
        0, // fastagActiveTrucksCount
        0, // totalBookings
        0, // completedBookingsCount
        0, // inTransitBookingsCount
        { _sum: { amount: null } }, // grossPaymentSum
        { _sum: { amount: null } }, // subscriptionPaymentsSum
        0, // totalSubscriptions
        0, // activeSubscriptions
        0, // activeTrials
        0, // totalDisputes
        0, // resolvedDisputes
        0, // openDisputes
        0, // totalDocuments
        0, // verifiedDocuments
        [],
        [],
        [],
        0, // totalUsers
        0, // pendingDocuments
        0, // rejectedDocuments
        0, // investigatingDisputes
        0, // rejectedDisputes
      ])

      const result = await service.getIntelligence('admin-id')

      expect(result.realMetrics.totalPlatformLoads).toBe(0)
      expect(result.realMetrics.totalPlatformTrucks).toBe(0)
      expect(result.realMetrics.totalUsers).toBe(0)
      expect(result.realMetrics.kycApprovalRatePercent).toBe(0)
      expect(result.realMetrics.vahanVerificationRatePercent).toBe(0)
      expect(result.realMetrics.documentComplianceRatePercent).toBe(0)
      expect(result.realMetrics.totalGrossPaymentVolumeINR).toBe(0)
      expect(result.realMetrics.subscriptionPaymentVolumeINR).toBe(0)
      expect(result.realMetrics.ewayBillCoverageRatePercent).toBe(0)
      expect(result.realMetrics.fastagLowBalanceTrucksCount).toBe(0)
      expect(result.realMetrics.fastagInactiveTrucksCount).toBe(0)
      expect(result.realMetrics.fastagUnknownTrucksCount).toBe(0)
      expect(result.predictiveMetrics.demandSupplyRatio).toBe(1.0)
      expect(result.corridors.every((c) => c.dataStatus === 'INSUFFICIENT_DATA')).toBe(true)
    })
  })
})
