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
    load: { count: jest.fn() },
    truck: { count: jest.fn(), update: jest.fn() },
    booking: { count: jest.fn(), findMany: jest.fn() },
    document: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    subscription: { count: jest.fn(), findMany: jest.fn() },
    payment: { findMany: jest.fn(), aggregate: jest.fn() },
    $transaction: jest.fn((args) => Promise.all(args)),
  }
  return {
    prisma: mockPrisma,
    UserRole: {
      truck_owner: 'truck_owner',
      load_owner: 'load_owner',
      admin: 'admin',
    },
    VerificationStatus: {
      Pending: 'Pending',
      Verified: 'Verified',
      Rejected: 'Rejected',
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
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.truck_owner })

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

      const result = await service.listUsers('admin-id', UserRole.truck_owner, 1, 10)

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { role: UserRole.truck_owner },
        skip: 0,
      }))
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: UserRole.truck_owner } })

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
})
