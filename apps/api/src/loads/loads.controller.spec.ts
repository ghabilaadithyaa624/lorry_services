import { Test, TestingModule } from '@nestjs/testing'
import { LoadsController } from './loads.controller'
import { LoadsService } from './loads.service'
import { LoadStatus } from '@prisma/client'
import { CreateLoadDto } from './dto/create-load.dto'

describe('LoadsController', () => {
  let controller: LoadsController
  let loadsService: LoadsService

  const mockLoadsService = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoadsController],
      providers: [
        {
          provide: LoadsService,
          useValue: mockLoadsService,
        },
      ],
    }).compile()

    controller = module.get<LoadsController>(LoadsController)
    loadsService = module.get<LoadsService>(LoadsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('create', () => {
    it('should call loadsService.create with correct parameters', async () => {
      const userId = 'user-123'
      const dto: CreateLoadDto = {
        tonnageRequired: 15.5,
        loadingAddress: 'MIDC Industrial Area, Pune',
        loadingPin: '411018',
        unloadingAddress: 'Electronic City, Bangalore',
        unloadingPin: '560100',
        truckType: 'Open' as any,
      }

      const mockResult = { id: 'load-1', ...dto, userId }
      mockLoadsService.create.mockResolvedValue(mockResult)

      const result = await controller.create(dto, userId)

      expect(loadsService.create).toHaveBeenCalledWith(userId, dto)
      expect(result).toEqual(mockResult)
    })
  })

  describe('findMyLoads', () => {
    it('should call loadsService.findByUser with default pagination when no queries provided', async () => {
      const userId = 'user-123'
      const mockResult = { data: [], total: 0 }
      mockLoadsService.findByUser.mockResolvedValue(mockResult)

      const result = await controller.findMyLoads(userId)

      expect(loadsService.findByUser).toHaveBeenCalledWith(userId, undefined, 1, 50)
      expect(result).toEqual(mockResult)
    })

    it('should call loadsService.findByUser with parsed pagination and status when queries are provided', async () => {
      const userId = 'user-123'
      const status = LoadStatus.Open
      const mockResult = { data: [], total: 0 }
      mockLoadsService.findByUser.mockResolvedValue(mockResult)

      const result = await controller.findMyLoads(userId, status, '2', '20')

      expect(loadsService.findByUser).toHaveBeenCalledWith(userId, status, 2, 20)
      expect(result).toEqual(mockResult)
    })
  })

  describe('findOne', () => {
    it('should call loadsService.findOne with correct parameters', async () => {
      const id = 'load-1'
      const userId = 'user-123'
      const mockResult = { id }
      mockLoadsService.findOne.mockResolvedValue(mockResult)

      const result = await controller.findOne(id, userId)

      expect(loadsService.findOne).toHaveBeenCalledWith(id, userId)
      expect(result).toEqual(mockResult)
    })
  })

  describe('updateStatus', () => {
    it('should call loadsService.updateStatus with correct parameters', async () => {
      const id = 'load-1'
      const userId = 'user-123'
      const status = LoadStatus.Matched
      const mockResult = { id, status }
      mockLoadsService.updateStatus.mockResolvedValue(mockResult)

      const result = await controller.updateStatus(id, status, userId)

      expect(loadsService.updateStatus).toHaveBeenCalledWith(id, userId, status)
      expect(result).toEqual(mockResult)
    })
  })

  describe('delete', () => {
    it('should call loadsService.delete with correct parameters', async () => {
      const id = 'load-1'
      const userId = 'user-123'
      const mockResult = { id }
      mockLoadsService.delete.mockResolvedValue(mockResult)

      const result = await controller.delete(id, userId)

      expect(loadsService.delete).toHaveBeenCalledWith(id, userId)
      expect(result).toEqual(mockResult)
    })
  })
})
