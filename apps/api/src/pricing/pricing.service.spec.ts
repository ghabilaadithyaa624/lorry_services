import { Test, TestingModule } from '@nestjs/testing'
import { PricingService } from './pricing.service'
import { EstimatePriceDto } from './dto/estimate-price.dto'

describe('PricingService', () => {
  let service: PricingService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService],
    }).compile()

    service = module.get<PricingService>(PricingService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('estimate', () => {
    it('should compute pricing estimate accurately with explicit distanceKm', () => {
      const dto: EstimatePriceDto = {
        distanceKm: 840,
        tonnage: 14,
        truckType: 'Open',
      }

      const result = service.estimate(dto)

      expect(result).toBeDefined()
      expect(result.distanceKm).toBe(840)
      expect(result.tonnage).toBe(14)
      expect(result.truckType).toBe('Open')
      expect(result.confidence).toBe('HIGH')
      expect(result.baseHandlingCharge).toBe(2500)
      // > 500km triggers 6% discount on base 3.40 => 3.196 rounded to 3.20
      expect(result.ratePerTonKm).toBeCloseTo(3.20, 1)
      expect(result.longHaulAdjustment.applied).toBe(true)
      expect(result.longHaulAdjustment.discountPercent).toBe(6)

      // Verify mathematical consistency: min <= recommended <= max
      expect(result.minEstimate).toBeLessThanOrEqual(result.recommendedTarget)
      expect(result.recommendedTarget).toBeLessThanOrEqual(result.maxEstimate)

      // Verify rounding to nearest 100
      expect(result.recommendedTarget % 100).toBe(0)
      expect(result.minEstimate % 100).toBe(0)
      expect(result.maxEstimate % 100).toBe(0)
    })

    it('should calculate distanceKm from GPS coordinates when distanceKm is not provided', () => {
      const dto: EstimatePriceDto = {
        tonnage: 15,
        truckType: 'Container',
        loadingLat: 18.5204,
        loadingLng: 73.8567, // Pune
        unloadingLat: 12.9716,
        unloadingLng: 77.5946, // Bangalore
      }

      const result = service.estimate(dto)

      expect(result.confidence).toBe('MEDIUM')
      expect(result.distanceKm).toBeGreaterThan(600)
      expect(result.distanceKm).toBeLessThan(1100)
      expect(result.baseHandlingCharge).toBe(3500)
      expect(result.truckType).toBe('Container')
      expect(result.truckTypeAdjustment.baseRatePerTonKm).toBe(4.10)
    })

    it('should apply fallback default corridor distance (350 km) when no distance or coords are provided', () => {
      const dto: EstimatePriceDto = {
        tonnage: 10,
        truckType: 'OpenBody',
      }

      const result = service.estimate(dto)

      expect(result.confidence).toBe('BENCHMARK')
      expect(result.distanceKm).toBe(350)
      expect(result.baseHandlingCharge).toBe(3000)
      expect(result.ratePerTonKm).toBe(3.15)
      expect(result.longHaulAdjustment.applied).toBe(false)
    })

    it('should apply 12% scale discount for long-haul routes > 1000 km', () => {
      const dto: EstimatePriceDto = {
        distanceKm: 1400,
        tonnage: 20,
        truckType: 'Container',
      }

      const result = service.estimate(dto)

      expect(result.longHaulAdjustment.applied).toBe(true)
      expect(result.longHaulAdjustment.discountPercent).toBe(12)
      // 4.10 * 0.88 = 3.608 -> 3.61
      expect(result.ratePerTonKm).toBeCloseTo(3.61, 2)
    })

    it('should normalize truck types correctly (case and format insensitive)', () => {
      const dto1: EstimatePriceDto = { distanceKm: 400, tonnage: 8, truckType: 'Open body' }
      const dto2: EstimatePriceDto = { distanceKm: 400, tonnage: 8, truckType: 'openbody' }
      const dto3: EstimatePriceDto = { distanceKm: 400, tonnage: 8, truckType: 'container' }
      const dto4: EstimatePriceDto = { distanceKm: 400, tonnage: 8, truckType: 'unknown-type' }

      const res1 = service.estimate(dto1)
      const res2 = service.estimate(dto2)
      const res3 = service.estimate(dto3)
      const res4 = service.estimate(dto4)

      expect(res1.truckType).toBe('OpenBody')
      expect(res2.truckType).toBe('OpenBody')
      expect(res3.truckType).toBe('Container')
      expect(res4.truckType).toBe('Open') // fallback
    })

    it('should include complete price sensitivity analysis (±10% payload)', () => {
      const dto: EstimatePriceDto = {
        distanceKm: 600,
        tonnage: 10,
        truckType: 'Open',
      }

      const result = service.estimate(dto)

      expect(result.priceSensitivity).toBeDefined()
      expect(result.priceSensitivity.minus10Percent.tonnage).toBe(9)
      expect(result.priceSensitivity.current.tonnage).toBe(10)
      expect(result.priceSensitivity.plus10Percent.tonnage).toBe(11)
      expect(result.priceSensitivity.minus10Percent.cost).toBeLessThan(result.priceSensitivity.current.cost)
      expect(result.priceSensitivity.current.cost).toBeLessThan(result.priceSensitivity.plus10Percent.cost)
      expect(result.priceSensitivity.costPerAdditionalTon).toBeGreaterThan(0)
    })

    it('should include vehicle and route configuration comparison with active flag', () => {
      const dto: EstimatePriceDto = {
        distanceKm: 500,
        tonnage: 12,
        truckType: 'Container',
      }

      const result = service.estimate(dto)

      expect(result.routeComparison).toBeInstanceOf(Array)
      expect(result.routeComparison.length).toBe(4)

      const containerOpt = result.routeComparison.find((r) => r.type === 'Container')
      const openOpt = result.routeComparison.find((r) => r.type === 'Open')
      const openBodyOpt = result.routeComparison.find((r) => r.type === 'OpenBody')
      const bypassOpt = result.routeComparison.find((r) => r.type === 'Container-bypass')

      expect(containerOpt?.isCurrent).toBe(true)
      expect(openOpt?.isCurrent).toBe(false)
      expect(openBodyOpt?.isCurrent).toBe(false)
      expect(bypassOpt?.isCurrent).toBe(false)
      expect(bypassOpt?.distanceKm).toBe(Math.round(500 * 1.15))
    })

    it('should provide transparent disclaimer and formula explanation', () => {
      const dto: EstimatePriceDto = {
        distanceKm: 250,
        tonnage: 6,
        truckType: 'Open',
      }

      const result = service.estimate(dto)

      expect(result.disclaimer).toContain('Indicative benchmark estimate')
      expect(result.explanation).toContain('Indicative benchmark estimate derived from')
      expect(result.explanation).toContain('250 km')
      expect(result.explanation).toContain('6T')
      expect(result.isEstimated).toBe(true)
      expect(result.isBenchmarkBased).toBe(true)
    })
  })
})
