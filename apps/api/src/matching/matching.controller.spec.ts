import { Test, TestingModule } from '@nestjs/testing'
import { MatchingController } from './matching.controller'
import { MatchingService } from './matching.service'
import { ReturnLoadsService } from './return-loads.service'
import { ReturnLoadsQueryDto } from './dto/return-loads-query.dto'

jest.mock('@lorrycarry/database', () => ({
  prisma: {},
  Prisma: { sql: jest.fn(), raw: jest.fn() },
}))

describe('MatchingController', () => {
  let controller: MatchingController
  let returnLoadsService: jest.Mocked<ReturnLoadsService>

  const matchingServiceMock = {
    getMyMatches: jest.fn(),
    getMatchesForLoad: jest.fn(),
    getMatchesForTruck: jest.fn(),
  }

  const returnLoadsServiceMock = {
    getReturnLoadsForTruck: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [
        { provide: MatchingService, useValue: matchingServiceMock },
        { provide: ReturnLoadsService, useValue: returnLoadsServiceMock },
      ],
    }).compile()

    controller = module.get<MatchingController>(MatchingController)
    returnLoadsService = module.get(ReturnLoadsService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('GET /matches/truck/:truckId/return-loads', () => {
    it('delegates to the return-loads service with the caller identity', async () => {
      const payload = { opportunities: [], radiusKm: 150 }
      returnLoadsServiceMock.getReturnLoadsForTruck.mockResolvedValue(payload)

      const result = await controller.getReturnLoadsForTruck('truck-1', 'driver-1', new ReturnLoadsQueryDto())

      expect(returnLoadsService.getReturnLoadsForTruck).toHaveBeenCalledWith('truck-1', 'driver-1', {
        radiusKm: undefined,
        limit: undefined,
        minScore: undefined,
        destinationLat: undefined,
        destinationLng: undefined,
      })
      expect(result).toBe(payload)
    })

    it('forwards radius, limit, minScore and the destination override', async () => {
      returnLoadsServiceMock.getReturnLoadsForTruck.mockResolvedValue({ opportunities: [] })
      const query = Object.assign(new ReturnLoadsQueryDto(), {
        radius: 200,
        limit: 5,
        minScore: 40,
        destinationLat: 17.385,
        destinationLng: 78.4867,
      })

      await controller.getReturnLoadsForTruck('truck-1', 'driver-1', query)

      expect(returnLoadsService.getReturnLoadsForTruck).toHaveBeenCalledWith('truck-1', 'driver-1', {
        radiusKm: 200,
        limit: 5,
        minScore: 40,
        destinationLat: 17.385,
        destinationLng: 78.4867,
      })
    })
  })

  describe('GET /matches/truck/:truckId', () => {
    it('still serves the live 50 km match feed unchanged', async () => {
      matchingServiceMock.getMatchesForTruck.mockResolvedValue([])

      await controller.getMatchesForTruck('truck-1', 'driver-1', '30')

      expect(matchingServiceMock.getMatchesForTruck).toHaveBeenCalledWith('truck-1', 'driver-1', 30)
    })
  })
})
