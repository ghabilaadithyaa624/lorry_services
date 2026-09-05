import { Test, TestingModule } from '@nestjs/testing'
import { TrucksController } from './trucks.controller'
import { TrucksService } from './trucks.service'
import { CreateTruckDto } from './dto/create-truck.dto'
import { UpdateTruckDto } from './dto/update-truck.dto'

describe('TrucksController', () => {
  let controller: TrucksController
  let trucksService: TrucksService

  const mockTrucksService = {
    create: jest.fn(),
    uploadDocument: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateLocation: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrucksController],
      providers: [
        {
          provide: TrucksService,
          useValue: mockTrucksService,
        },
      ],
    }).compile()

    controller = module.get<TrucksController>(TrucksController)
    trucksService = module.get<TrucksService>(TrucksService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('create', () => {
    it('should call trucksService.create with the owner user id', async () => {
      const userId = 'user-123'
      const dto = {
        registrationNumber: 'MH12AB1234',
        bodyType: 'Open' as any,
        lengthFt: 20,
        heightFt: 8,
        tonnageCapacity: 15,
        currentLocationAddress: 'Pune, Maharashtra',
      } as CreateTruckDto

      const mockResult = { id: 'truck-1', ...dto, userId }
      mockTrucksService.create.mockResolvedValue(mockResult)

      const result = await controller.create(dto, userId)

      expect(trucksService.create).toHaveBeenCalledWith(userId, dto)
      expect(result).toEqual(mockResult)
    })
  })

  describe('findMyTrucks', () => {
    it('should call trucksService.findByUser with the current user id', async () => {
      const userId = 'user-123'
      const mockResult = [{ id: 'truck-1' }]
      mockTrucksService.findByUser.mockResolvedValue(mockResult)

      const result = await controller.findMyTrucks(userId)

      expect(trucksService.findByUser).toHaveBeenCalledWith(userId)
      expect(result).toEqual(mockResult)
    })
  })

  describe('findOne', () => {
    it('should call trucksService.findOne with id and requester id', async () => {
      const id = 'truck-1'
      const userId = 'user-123'
      const mockResult = { id }
      mockTrucksService.findOne.mockResolvedValue(mockResult)

      const result = await controller.findOne(id, userId)

      expect(trucksService.findOne).toHaveBeenCalledWith(id, userId)
      expect(result).toEqual(mockResult)
    })
  })

  describe('update', () => {
    it('should call trucksService.update with id, dto, userId and role for a transporter', async () => {
      const id = 'truck-1'
      const userId = 'transporter-1'
      const role = 'transporter' as any
      const dto: UpdateTruckDto = {
        bodyType: 'Container' as any,
        tonnageCapacity: 22,
        serviceableRadiusKm: 75,
      }
      const mockResult = { id, ...dto }
      mockTrucksService.update.mockResolvedValue(mockResult)

      const result = await controller.update(id, dto, userId, role)

      // The controller must forward the role so the service can run the
      // owner-or-admin ownership gate (transporters may edit OWN trucks only).
      expect(trucksService.update).toHaveBeenCalledWith(id, userId, dto, role)
      expect(result).toEqual(mockResult)
    })

    it('should pass an admin role through so the service can manage any truck', async () => {
      const id = 'truck-1'
      const dto: UpdateTruckDto = { tonnageCapacity: 25 }
      mockTrucksService.update.mockResolvedValue({ id, tonnageCapacity: 25 })

      await controller.update(id, dto, 'admin-1', 'admin' as any)

      expect(trucksService.update).toHaveBeenCalledWith(id, 'admin-1', dto, 'admin')
    })
  })

  describe('updateLocation', () => {
    it('should call trucksService.updateLocation with id, address, userId and role', async () => {
      const id = 'truck-1'
      const userId = 'truck_driver-1'
      const role = 'truck_driver' as any
      const mockResult = { id, currentLat: 19.07, currentLng: 72.87 }
      mockTrucksService.updateLocation.mockResolvedValue(mockResult)

      const result = await controller.updateLocation(id, 'Mumbai', userId, role)

      expect(trucksService.updateLocation).toHaveBeenCalledWith(id, userId, 'Mumbai', role)
      expect(result).toEqual(mockResult)
    })
  })

  describe('delete', () => {
    it('should call trucksService.delete with id, userId and role for an owner', async () => {
      const id = 'truck-1'
      const userId = 'user-123'
      const role = 'truck_driver' as any
      const mockResult = { success: true }
      mockTrucksService.delete.mockResolvedValue(mockResult)

      const result = await controller.delete(id, userId, role)

      expect(trucksService.delete).toHaveBeenCalledWith(id, userId, role)
      expect(result).toEqual(mockResult)
    })

    it('should pass an admin role through on delete so admins can remove any truck', async () => {
      const id = 'truck-1'
      mockTrucksService.delete.mockResolvedValue({ success: true })

      await controller.delete(id, 'admin-1', 'admin' as any)

      expect(trucksService.delete).toHaveBeenCalledWith(id, 'admin-1', 'admin')
    })
  })

  describe('uploadDocument', () => {
    it('should call trucksService.uploadDocument with the owner id and role', async () => {
      const id = 'truck-1'
      const userId = 'transporter-1'
      const role = 'transporter' as any
      const file = { buffer: Buffer.from('x'), mimetype: 'application/pdf', originalname: 'rc.pdf', size: 10 } as any
      const mockResult = { document: { id: 'doc-1' }, signedUrl: 'https://s3/signed' }
      mockTrucksService.uploadDocument.mockResolvedValue(mockResult)

      const result = await controller.uploadDocument(id, 'RC', file, userId, role, 'RC-NUM')

      expect(trucksService.uploadDocument).toHaveBeenCalledWith(id, userId, file, 'RC', 'RC-NUM', role)
      expect(result).toEqual(mockResult)
    })
  })
})
