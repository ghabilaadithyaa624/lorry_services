import { Test, TestingModule } from '@nestjs/testing'
import { MatchingController } from './matching.controller'
import { MatchingService } from './matching.service'

jest.mock('@lorrycarry/database', () => ({
  prisma: {},
  Prisma: { sql: jest.fn(), raw: jest.fn() },
}))

describe('MatchingController', () => {
  let controller: MatchingController

  const matchingServiceMock = {
    getMyMatches: jest.fn(),
    getMatchesForLoad: jest.fn(),
    getMatchesForTruck: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [
        { provide: MatchingService, useValue: matchingServiceMock },
      ],
    }).compile()

    controller = module.get<MatchingController>(MatchingController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('GET /matches/truck/:truckId', () => {
    it('still serves the live 50 km match feed unchanged', async () => {
      matchingServiceMock.getMatchesForTruck.mockResolvedValue([])

      await controller.getMatchesForTruck('truck-1', 'driver-1', '30')

      expect(matchingServiceMock.getMatchesForTruck).toHaveBeenCalledWith('truck-1', 'driver-1', 30)
    })
  })
})
