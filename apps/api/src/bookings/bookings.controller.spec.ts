import { Test, TestingModule } from '@nestjs/testing'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'
import { BookingStatus, UserRole } from '@lorrycarry/database'
import { CreateBookingDto } from './dto/create-booking.dto'
import { CreateDisputeDto } from './dto/create-dispute.dto'

jest.mock('@prisma/client', () => ({
  UserRole: {
    factory_owner: 'factory_owner',
    truck_driver: 'truck_driver',
    admin: 'admin',
  },
  BookingStatus: {
    Pending: 'Pending',
    Confirmed: 'Confirmed',
    InTransit: 'In-transit',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
  },
}))

describe('BookingsController', () => {
  let controller: BookingsController
  let bookingsService: BookingsService

  const mockBookingsService = {
    create: jest.fn(),
    findByUser: jest.fn(),
    createDispute: jest.fn(),
    findOne: jest.fn(),
    confirmAdvance: jest.fn(),
    confirmBalance: jest.fn(),
    updateStatus: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile()

    controller = module.get<BookingsController>(BookingsController)
    bookingsService = module.get<BookingsService>(BookingsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('create', () => {
    it('should call bookingsService.create with mapped dto fields', async () => {
      const userId = 'owner-1'
      const dto: CreateBookingDto = {
        loadId: 'load-1',
        truckId: 'truck-1',
        agreedPrice: 25000,
        ewayBillNumber: '123456789012',
        liabilityAccepted: true,
      }
      const mockResult = { id: 'booking-1', ...dto }
      mockBookingsService.create.mockResolvedValue(mockResult)

      const result = await controller.create(dto, userId)

      expect(bookingsService.create).toHaveBeenCalledWith(userId, {
        loadId: dto.loadId,
        truckId: dto.truckId,
        agreedPrice: dto.agreedPrice,
        ewayBillNumber: dto.ewayBillNumber,
        liabilityAccepted: true,
      })
      expect(result).toEqual(mockResult)
    })
  })

  describe('findMyBookings', () => {
    it('should scope factory owners to load-owner bookings', async () => {
      const mockResult = [{ id: 'booking-1' }]
      mockBookingsService.findByUser.mockResolvedValue(mockResult)

      const result = await controller.findMyBookings('owner-1', UserRole.factory_owner)

      expect(bookingsService.findByUser).toHaveBeenCalledWith('owner-1', 'factory_owner')
      expect(result).toEqual(mockResult)
    })

    it('should scope truck drivers to truck-owner bookings', async () => {
      mockBookingsService.findByUser.mockResolvedValue([])

      await controller.findMyBookings('driver-1', UserRole.truck_driver)

      expect(bookingsService.findByUser).toHaveBeenCalledWith('driver-1', 'truck_driver')
    })
  })

  describe('createDispute', () => {
    it('should call bookingsService.createDispute', async () => {
      const dto: CreateDisputeDto = {
        category: 'Payment',
        priority: 'High',
        description: 'Advance not released after loading.',
      }
      const mockResult = { id: 'dispute-1' }
      mockBookingsService.createDispute.mockResolvedValue(mockResult)

      const result = await controller.createDispute('booking-1', dto, 'owner-1')

      expect(bookingsService.createDispute).toHaveBeenCalledWith('booking-1', 'owner-1', dto)
      expect(result).toEqual(mockResult)
    })
  })

  describe('findOne', () => {
    it('should call bookingsService.findOne', async () => {
      const mockResult = { id: 'booking-1' }
      mockBookingsService.findOne.mockResolvedValue(mockResult)

      const result = await controller.findOne('booking-1', 'owner-1')

      expect(bookingsService.findOne).toHaveBeenCalledWith('booking-1', 'owner-1')
      expect(result).toEqual(mockResult)
    })
  })

  describe('confirmAdvance', () => {
    it('should call bookingsService.confirmAdvance', async () => {
      const mockResult = {
        id: 'booking-1',
        advanceConfirmed: true,
        advanceConfirmedAt: new Date(),
      }
      mockBookingsService.confirmAdvance.mockResolvedValue(mockResult)

      const result = await controller.confirmAdvance('booking-1', 'owner-1')

      expect(bookingsService.confirmAdvance).toHaveBeenCalledWith('booking-1', 'owner-1')
      expect(result).toEqual(mockResult)
    })
  })

  describe('confirmBalance', () => {
    it('should call bookingsService.confirmBalance', async () => {
      const mockResult = {
        id: 'booking-1',
        balanceConfirmed: true,
        balanceConfirmedAt: new Date(),
      }
      mockBookingsService.confirmBalance.mockResolvedValue(mockResult)

      const result = await controller.confirmBalance('booking-1', 'owner-1')

      expect(bookingsService.confirmBalance).toHaveBeenCalledWith('booking-1', 'owner-1')
      expect(result).toEqual(mockResult)
    })
  })

  describe('updateStatus', () => {
    it('should preserve PATCH /bookings/:id/status for backward compatibility', async () => {
      const updateData = { advanceConfirmed: true }
      const mockResult = { id: 'booking-1', status: BookingStatus.InTransit }
      mockBookingsService.updateStatus.mockResolvedValue(mockResult)

      const result = await controller.updateStatus(
        'booking-1',
        BookingStatus.InTransit,
        updateData,
        'owner-1',
      )

      expect(bookingsService.updateStatus).toHaveBeenCalledWith(
        'booking-1',
        'owner-1',
        BookingStatus.InTransit,
        updateData,
      )
      expect(result).toEqual(mockResult)
    })
  })
})
