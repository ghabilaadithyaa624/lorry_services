import { Test, TestingModule } from '@nestjs/testing'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { UserRole } from '@lorrycarry/database'
import { VerifyDocumentDto, VerifyTruckDto, PaginationDto } from './dto/admin.dto'

jest.mock('@lorrycarry/database', () => ({
  prisma: {},
  UserRole: {
    factory_owner: 'factory_owner',
    truck_driver: 'truck_driver',
    admin: 'admin',
  },
}))

describe('AdminController', () => {
  let controller: AdminController
  let adminService: jest.Mocked<AdminService>

  const mockUserId = 'admin-user-id'

  beforeEach(async () => {
    const mockAdminService = {
      getDashboardStats: jest.fn(),
      getAnalytics: jest.fn(),
      getIntelligence: jest.fn(),
      listUsers: jest.fn(),
      getPendingDocuments: jest.fn(),
      verifyDocument: jest.fn(),
      verifyTruck: jest.fn(),
      listSubscriptions: jest.fn(),
      listBookings: jest.fn(),
      listDisputes: jest.fn(),
      resolveDispute: jest.fn(),
      checkVahan: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile()

    controller = module.get<AdminController>(AdminController)
    adminService = module.get(AdminService) as jest.Mocked<AdminService>
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getStats', () => {
    it('should return dashboard stats', async () => {
      const mockStats = {
        totalUsers: 10, totalLoads: 5, totalTrucks: 2,
        totalBookings: 1, pendingDocuments: 0,
        activeSubscriptions: 2, totalRevenue: 1000, recentPayments: []
      }
      adminService.getDashboardStats.mockResolvedValue(mockStats as any)

      const result = await controller.getStats(mockUserId)
      expect(result).toEqual(mockStats)
      expect(adminService.getDashboardStats).toHaveBeenCalledWith(mockUserId)
    })
  })

  describe('getAnalytics', () => {
    it('should return analytics with default 30 day range', async () => {
      const mockAnalytics = { rangeDays: 30, trips: {}, earnings: {}, bookings: {}, routes: {} }
      adminService.getAnalytics.mockResolvedValue(mockAnalytics as any)

      const result = await controller.getAnalytics(mockUserId)
      expect(result).toEqual(mockAnalytics)
      expect(adminService.getAnalytics).toHaveBeenCalledWith(mockUserId, 30)
    })

    it('should pass a valid requested range', async () => {
      const mockAnalytics = { rangeDays: 90, trips: {}, earnings: {}, bookings: {}, routes: {} }
      adminService.getAnalytics.mockResolvedValue(mockAnalytics as any)

      const result = await controller.getAnalytics(mockUserId, '90')
      expect(result).toEqual(mockAnalytics)
      expect(adminService.getAnalytics).toHaveBeenCalledWith(mockUserId, 90)
    })

    it('should fall back to 30 days for an invalid range', async () => {
      const mockAnalytics = { rangeDays: 30, trips: {}, earnings: {}, bookings: {}, routes: {} }
      adminService.getAnalytics.mockResolvedValue(mockAnalytics as any)

      const result = await controller.getAnalytics(mockUserId, '999')
      expect(adminService.getAnalytics).toHaveBeenCalledWith(mockUserId, 30)
    })
  })

  describe('getIntelligence', () => {
    it('should return national logistics intelligence summary', async () => {
      const mockIntelligence = {
        realMetrics: {
          totalPlatformLoads: 10,
          totalPlatformTrucks: 8,
          verifiedTrucksCount: 6,
          totalCompletedBookings: 12,
          totalGrossPaymentVolumeINR: 250000,
          kycApprovalRatePercent: 75,
        },
        estimatedMetrics: {
          nationalAvgRatePerTonKmINR: 3.95,
          avgTransitOnTimeRatePercent: 94.2,
        },
        predictiveMetrics: {
          projectedMonthlyVolumeTons: 720,
        },
        corridors: [],
      }
      adminService.getIntelligence.mockResolvedValue(mockIntelligence as any)

      const result = await controller.getIntelligence(mockUserId)
      expect(result).toEqual(mockIntelligence)
      expect(adminService.getIntelligence).toHaveBeenCalledWith(mockUserId)
    })
  })

  describe('listUsers', () => {
    it('should list users with default pagination', async () => {
      const mockResult = { users: [], total: 0, page: 1, pages: 0 }
      adminService.listUsers.mockResolvedValue(mockResult as any)

      const result = await controller.listUsers(mockUserId)
      expect(result).toEqual(mockResult)
      expect(adminService.listUsers).toHaveBeenCalledWith(mockUserId, undefined, undefined, undefined)
    })

    it('should list users with role and pagination', async () => {
      const mockResult = { users: [], total: 0, page: 2, pages: 0 }
      adminService.listUsers.mockResolvedValue(mockResult as any)
      const pagination: PaginationDto = { page: 2, limit: 10 }

      const result = await controller.listUsers(mockUserId, UserRole.factory_owner, pagination)
      expect(result).toEqual(mockResult)
      expect(adminService.listUsers).toHaveBeenCalledWith(mockUserId, UserRole.factory_owner, 2, 10)
    })
  })

  describe('getPendingDocuments', () => {
    it('should list pending documents', async () => {
      const mockDocs: any[] = []
      adminService.getPendingDocuments.mockResolvedValue(mockDocs)

      const result = await controller.getPendingDocuments(mockUserId)
      expect(result).toEqual(mockDocs)
      expect(adminService.getPendingDocuments).toHaveBeenCalledWith(mockUserId)
    })
  })

  describe('verifyDocument', () => {
    it('should verify document', async () => {
      const dto: VerifyDocumentDto = { status: 'Verified', notes: 'All good' }
      const mockResult: any = { success: true }
      adminService.verifyDocument.mockResolvedValue(mockResult)

      const result = await controller.verifyDocument('doc-1', dto, mockUserId)
      expect(result).toEqual(mockResult)
      expect(adminService.verifyDocument).toHaveBeenCalledWith(mockUserId, 'doc-1', 'Verified', 'All good')
    })
  })

  describe('verifyTruck', () => {
    it('should verify truck', async () => {
      const dto: VerifyTruckDto = { status: 'Verified' }
      const mockResult: any = { success: true }
      adminService.verifyTruck.mockResolvedValue(mockResult)

      const result = await controller.verifyTruck('truck-1', dto, mockUserId)
      expect(result).toEqual(mockResult)
      expect(adminService.verifyTruck).toHaveBeenCalledWith(mockUserId, 'truck-1', 'Verified')
    })
  })

  describe('listSubscriptions', () => {
    it('should list subscriptions with default pagination', async () => {
      const mockResult = { subscriptions: [], total: 0, page: 1, pages: 0 }
      adminService.listSubscriptions.mockResolvedValue(mockResult as any)

      const result = await controller.listSubscriptions(mockUserId)
      expect(result).toEqual(mockResult)
      expect(adminService.listSubscriptions).toHaveBeenCalledWith(mockUserId, undefined, undefined)
    })

    it('should list subscriptions with pagination', async () => {
      const mockResult = { subscriptions: [], total: 0, page: 2, pages: 0 }
      adminService.listSubscriptions.mockResolvedValue(mockResult as any)
      const pagination: PaginationDto = { page: 2, limit: 10 }

      const result = await controller.listSubscriptions(mockUserId, pagination)
      expect(result).toEqual(mockResult)
      expect(adminService.listSubscriptions).toHaveBeenCalledWith(mockUserId, 2, 10)
    })
  })

  describe('listBookings', () => {
    it('should list bookings with default pagination', async () => {
      const mockResult = { bookings: [], total: 0, page: 1, pages: 0 }
      adminService.listBookings.mockResolvedValue(mockResult as any)

      const result = await controller.listBookings(mockUserId)
      expect(result).toEqual(mockResult)
      expect(adminService.listBookings).toHaveBeenCalledWith(mockUserId, undefined, undefined)
    })

    it('should list bookings with pagination', async () => {
      const mockResult = { bookings: [], total: 0, page: 3, pages: 0 }
      adminService.listBookings.mockResolvedValue(mockResult as any)
      const pagination: PaginationDto = { page: 3, limit: 5 }

      const result = await controller.listBookings(mockUserId, pagination)
      expect(result).toEqual(mockResult)
      expect(adminService.listBookings).toHaveBeenCalledWith(mockUserId, 3, 5)
    })
  })
})
