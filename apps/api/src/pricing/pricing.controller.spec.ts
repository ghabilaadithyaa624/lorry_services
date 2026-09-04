import { Test, TestingModule } from '@nestjs/testing'
import { PricingController } from './pricing.controller'
import { PricingService } from './pricing.service'
import { EstimatePriceDto } from './dto/estimate-price.dto'

describe('PricingController', () => {
  let controller: PricingController
  let service: PricingService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [PricingService],
    }).compile()

    controller = module.get<PricingController>(PricingController)
    service = module.get<PricingService>(PricingService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('estimate', () => {
    it('should compute freight price estimate and return all required fields', async () => {
      const dto: EstimatePriceDto = {
        distanceKm: 750,
        tonnage: 12,
        truckType: 'Open',
      }

      const result = controller.estimate(dto)

      expect(result).toBeDefined()

      // 14 required fields check
      expect(result).toHaveProperty('minEstimate')
      expect(result).toHaveProperty('recommendedTarget')
      expect(result).toHaveProperty('maxEstimate')
      expect(result).toHaveProperty('ratePerTonKm')
      expect(result).toHaveProperty('distanceKm')
      expect(result).toHaveProperty('baseHandlingCharge')
      expect(result).toHaveProperty('tonnage')
      expect(result).toHaveProperty('truckType')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('disclaimer')
      expect(result).toHaveProperty('explanation')
      expect(result).toHaveProperty('longHaulAdjustment')
      expect(result).toHaveProperty('truckTypeAdjustment')
      expect(result).toHaveProperty('priceSensitivity')
      expect(result).toHaveProperty('routeComparison')

      // Values check
      expect(result.distanceKm).toBe(750)
      expect(result.tonnage).toBe(12)
      expect(result.truckType).toBe('Open')
      expect(result.minEstimate).toBeLessThanOrEqual(result.recommendedTarget)
      expect(result.recommendedTarget).toBeLessThanOrEqual(result.maxEstimate)
    })

    it('should compute estimate from coordinates when distanceKm is not provided', async () => {
      const dto: EstimatePriceDto = {
        tonnage: 16,
        truckType: 'Container',
        loadingLat: 19.0760,
        loadingLng: 72.8777, // Mumbai
        unloadingLat: 28.7041,
        unloadingLng: 77.1025, // Delhi
      }

      const result = controller.estimate(dto)

      expect(result).toBeDefined()
      expect(result.distanceKm).toBeGreaterThan(1000)
      expect(result.confidence).toBe('MEDIUM')
      expect(result.truckType).toBe('Container')
      expect(result.longHaulAdjustment.applied).toBe(true)
      expect(result.longHaulAdjustment.discountPercent).toBe(12)
    })

    it('should delegate execution to PricingService', () => {
      const spy = jest.spyOn(service, 'estimate')
      const dto: EstimatePriceDto = {
        distanceKm: 300,
        tonnage: 10,
        truckType: 'OpenBody',
      }

      const result = controller.estimate(dto)

      expect(spy).toHaveBeenCalledWith(dto)
      expect(result.distanceKm).toBe(300)
      expect(result.truckType).toBe('OpenBody')
    })
  })
})
