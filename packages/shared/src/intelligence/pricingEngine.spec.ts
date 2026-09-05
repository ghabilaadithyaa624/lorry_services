import { calculateGeoDistance } from './geo'
import { estimateFreightRate } from './pricingEngine'

describe('Pricing Engine — calculateGeoDistance', () => {
  it('should return 0 when starting and ending locations are identical', () => {
    const lat = 12.9715987
    const lon = 77.5945627
    const result = calculateGeoDistance(lat, lon, lat, lon)
    expect(result).toBe(0)
  })

  it('should correctly calculate a short-range distance (Majestic to Indiranagar, Bangalore)', () => {
    // Bangalore Majestic: 12.9756, 77.5728
    // Indiranagar: 12.9719, 77.6412
    const result = calculateGeoDistance(12.9756, 77.5728, 12.9719, 77.6412)
    expect(result).toBe(10)
  })

  it('should correctly calculate a long-range interstate distance (Delhi to Mumbai)', () => {
    // Delhi (Connaught Place): 28.6304, 77.2177
    // Mumbai (Gateway of India): 18.9220, 72.8347
    const result = calculateGeoDistance(28.6304, 77.2177, 18.9220, 72.8347)
    expect(result).toBe(1518)
  })

  it('should handle negative and southern/western hemisphere coordinates (Buenos Aires to Sydney)', () => {
    // Buenos Aires (Argentina): -34.6037, -58.3816
    // Sydney (Australia): -33.8688, 151.2093
    const result = calculateGeoDistance(-34.6037, -58.3816, -33.8688, 151.2093)
    expect(result).toBe(15341)
  })

  it('should calculate the maximum possible distance on Earth (Antipodes on equator)', () => {
    // Antipodes: (0, 0) and (0, 180) on the Equator
    const result = calculateGeoDistance(0, 0, 0, 180)
    expect(result).toBe(26020)
  })

  it('should be symmetric and return the same distance regardless of direction', () => {
    const lat1 = 28.6304
    const lon1 = 77.2177
    const lat2 = 18.9220
    const lon2 = 72.8347

    const forwardResult = calculateGeoDistance(lat1, lon1, lat2, lon2)
    const backwardResult = calculateGeoDistance(lat2, lon2, lat1, lon1)

    expect(forwardResult).toBe(backwardResult)
  })
})

describe('Pricing Engine — estimateFreightRate', () => {
  it('should use default fallback distance of 350 when distance is missing or <= 10 km', () => {
    const estimate = estimateFreightRate({
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimate.distanceKm).toBe(350)
    expect(estimate.confidence).toBe('BENCHMARK')
  })

  it('should calculate a route when a valid coordinate is zero', () => {
    const estimate = estimateFreightRate({
      tonnage: 10,
      truckType: 'Open',
      loadingLat: 0,
      loadingLng: 0,
      unloadingLat: 1,
      unloadingLng: 1,
    })

    // Straight-line (0,0)→(1,1) ≈ 157 km; the shared geo helper multiplies by
    // ROAD_NETWORK_FACTOR (1.3) ≈ 204 km road distance.
    expect(estimate.distanceKm).toBeGreaterThan(100)
    expect(estimate.distanceKm).toBeLessThan(300)
    expect(estimate.confidence).toBe('MEDIUM')
  })

  it('should use default fallback distance of 350 when distance is missing and some or all coordinates are missing', () => {
    // 1. Completely missing coordinates and no distance
    const estimateNoCoords = estimateFreightRate({
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimateNoCoords.distanceKm).toBe(350)
    expect(estimateNoCoords.confidence).toBe('BENCHMARK')

    // 2. Partial coordinates (cannot compute distance)
    const estimatePartialCoords = estimateFreightRate({
      tonnage: 10,
      truckType: 'Open',
      loadingLat: 12.9715987,
      loadingLng: 77.5945627,
      // unloading coordinates are missing
    })
    expect(estimatePartialCoords.distanceKm).toBe(350)
    expect(estimatePartialCoords.confidence).toBe('MEDIUM') // confidence uses loadingLat check
  })

  it('should use default fallback distance of 350 when distanceKm is explicitly < 10', () => {
    const estimate = estimateFreightRate({
      distanceKm: 5,
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimate.distanceKm).toBe(350)
    // Providing distanceKm (even if <10 and falling back) still results in HIGH confidence
    expect(estimate.confidence).toBe('HIGH')
  })

  it('should calculate distance using coordinates when distanceKm is not provided', () => {
    const estimate = estimateFreightRate({
      tonnage: 10,
      truckType: 'Open',
      loadingLat: 28.6304,
      loadingLng: 77.2177,
      unloadingLat: 18.9220,
      unloadingLng: 72.8347,
    })
    // Delhi to Mumbai is calculated at 1518 km
    expect(estimate.distanceKm).toBe(1518)
    expect(estimate.confidence).toBe('MEDIUM')
  })

  it('should fallback to 350 km if coordinates are provided but calculated distance is < 10 km', () => {
    const estimate = estimateFreightRate({
      tonnage: 10,
      truckType: 'Open',
      loadingLat: 12.9715987,
      loadingLng: 77.5945627,
      unloadingLat: 12.9715987,
      unloadingLng: 77.5945627,
    })
    expect(estimate.distanceKm).toBe(350)
    expect(estimate.confidence).toBe('MEDIUM')
  })

  it('should use default tonnage of 5 when tonnage is not provided or invalid', () => {
    const estimate = estimateFreightRate({
      tonnage: 0,
      truckType: 'Open',
      distanceKm: 100,
    })
    expect(estimate.tonnage).toBe(5)
  })

  it('should floor tonnage to 1 when tonnage is below 1', () => {
    const estimate = estimateFreightRate({
      tonnage: 0.5,
      truckType: 'Open',
      distanceKm: 100,
    })
    expect(estimate.tonnage).toBe(1)
  })

  it('should correctly configure truckType parameters for Standard Open Body (Open)', () => {
    const estimate = estimateFreightRate({
      distanceKm: 100,
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimate.truckTypeAdjustment.baseRatePerTonKm).toBe(3.40)
    expect(estimate.truckTypeAdjustment.handlingFee).toBe(2500)
    expect(estimate.truckTypeAdjustment.description).toContain('Standard Open Body Lorry')
  })

  it('should correctly configure truckType parameters for Closed Container (Container)', () => {
    const estimate = estimateFreightRate({
      distanceKm: 100,
      tonnage: 10,
      truckType: 'Container',
    })
    expect(estimate.truckTypeAdjustment.baseRatePerTonKm).toBe(4.10)
    expect(estimate.truckTypeAdjustment.handlingFee).toBe(3500)
    expect(estimate.truckTypeAdjustment.description).toContain('Closed Weatherproof Container')
  })

  it('should correctly configure truckType parameters for Heavy Open Body Flatbed Trailer (OpenBody)', () => {
    const estimate = estimateFreightRate({
      distanceKm: 100,
      tonnage: 10,
      truckType: 'OpenBody',
    })
    expect(estimate.truckTypeAdjustment.baseRatePerTonKm).toBe(3.15)
    expect(estimate.truckTypeAdjustment.handlingFee).toBe(3000)
    expect(estimate.truckTypeAdjustment.description).toContain('Heavy Open Body Flatbed Trailer')
  })

  it('should apply no discount (Standard corridor) for distance <= 500 km', () => {
    const estimate = estimateFreightRate({
      distanceKm: 400,
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimate.longHaulAdjustment.applied).toBe(false)
    expect(estimate.longHaulAdjustment.discountPercent).toBe(0)
    expect(estimate.ratePerTonKm).toBe(3.40)
  })

  it('should apply 6% regional long-haul discount for distance between 500 and 1000 km', () => {
    const estimate = estimateFreightRate({
      distanceKm: 600,
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimate.longHaulAdjustment.applied).toBe(true)
    expect(estimate.longHaulAdjustment.discountPercent).toBe(6)
    // 3.40 * 0.94 = 3.196 -> rounded to 3.20 (ratePerTonKm in response is formatted with toFixed(2))
    expect(estimate.ratePerTonKm).toBe(3.20)
  })

  it('should apply 12% scale discount for distance > 1000 km', () => {
    const estimate = estimateFreightRate({
      distanceKm: 1200,
      tonnage: 10,
      truckType: 'Open',
    })
    expect(estimate.longHaulAdjustment.applied).toBe(true)
    expect(estimate.longHaulAdjustment.discountPercent).toBe(12)
    // 3.40 * 0.88 = 2.992 -> rounded to 2.99
    expect(estimate.ratePerTonKm).toBe(2.99)
  })

  it('should accurately calculate pricing targets (recommended, min, max)', () => {
    const estimate = estimateFreightRate({
      distanceKm: 100,
      tonnage: 10,
      truckType: 'Open',
    })
    // rawCost = 2500 + 100 * 10 * 3.4 = 2500 + 3400 = 5900
    // recommendedTarget = Math.round(5900 / 100) * 100 = 5900
    // minEstimate = Math.round((5900 * 0.90) / 100) * 100 = Math.round(5310 / 100) * 100 = 5300
    // maxEstimate = Math.round((5900 * 1.15) / 100) * 100 = Math.round(6785 / 100) * 100 = 6800
    expect(estimate.recommendedTarget).toBe(5900)
    expect(estimate.minEstimate).toBe(5300)
    expect(estimate.maxEstimate).toBe(6800)
  })

  it('should perform price sensitivity calculations properly', () => {
    const estimate = estimateFreightRate({
      distanceKm: 100,
      tonnage: 10,
      truckType: 'Open',
    })
    const sensitivity = estimate.priceSensitivity
    expect(sensitivity.current.tonnage).toBe(10)
    expect(sensitivity.current.cost).toBe(5900)

    // minus10Percent: 10 * 0.9 = 9
    expect(sensitivity.minus10Percent.tonnage).toBe(9)
    // rawMinus = 2500 + 100 * 9 * 3.4 = 2500 + 3060 = 5560
    // rounded = 5600
    expect(sensitivity.minus10Percent.cost).toBe(5600)

    // plus10Percent: 10 * 1.1 = 11
    expect(sensitivity.plus10Percent.tonnage).toBe(11)
    // rawPlus = 2500 + 100 * 11 * 3.4 = 2500 + 3740 = 6240
    // rounded = 6200
    expect(sensitivity.plus10Percent.cost).toBe(6200)

    // costPerAdditionalTon = distance * rate = 100 * 3.4 = 340
    expect(sensitivity.costPerAdditionalTon).toBe(340)
  })

  it('should produce appropriate route comparisons, and calculate bypass rates correctly', () => {
    const estimate = estimateFreightRate({
      distanceKm: 100,
      tonnage: 10,
      truckType: 'Open',
    })

    const comparisons = estimate.routeComparison
    expect(comparisons).toHaveLength(4)

    const openTruck = comparisons.find(c => c.type === 'Open')!
    expect(openTruck.isCurrent).toBe(true)
    expect(openTruck.recommendedTarget).toBe(5900)

    const containerTruck = comparisons.find(c => c.type === 'Container')!
    expect(containerTruck.isCurrent).toBe(false)
    // raw = 3500 + 100 * 10 * 4.10 = 7600
    expect(containerTruck.recommendedTarget).toBe(7600)

    const openBodyTruck = comparisons.find(c => c.type === 'OpenBody')!
    expect(openBodyTruck.isCurrent).toBe(false)
    // raw = 3000 + 100 * 10 * 3.15 = 6150 -> rounded to 6200
    expect(openBodyTruck.recommendedTarget).toBe(6200)

    // Bypass route: dist = Math.round(100 * 1.15) = 115 km
    // truckType is 'Open' so bypass uses baseRatePerTonKm=3.40, baseHandlingCharge=2500
    // raw = 2500 + 115 * 10 * 3.40 = 2500 + 3910 = 6410 -> rounded to 6400
    const bypassRoute = comparisons.find(c => c.type === 'Open-bypass')!
    expect(bypassRoute.isCurrent).toBe(false)
    expect(bypassRoute.distanceKm).toBe(115)
    expect(bypassRoute.recommendedTarget).toBe(6400)
  })

  it('should apply correct discount rate-per-ton-km values within route comparisons for long journeys (> 1000 km)', () => {
    const estimate = estimateFreightRate({
      distanceKm: 1200,
      tonnage: 10,
      truckType: 'Container',
    })

    const comparisons = estimate.routeComparison
    const openTruck = comparisons.find(c => c.type === 'Open')!
    // 3.40 * 0.88 = 2.99
    expect(openTruck.ratePerTonKm).toBe(2.99)

    const containerTruck = comparisons.find(c => c.type === 'Container')!
    // 4.10 * 0.88 = 3.61
    expect(containerTruck.ratePerTonKm).toBe(3.61)

    const openBodyTruck = comparisons.find(c => c.type === 'OpenBody')!
    // 3.15 * 0.88 = 2.77
    expect(openBodyTruck.ratePerTonKm).toBe(2.77)

    // Bypass distance = 1200 * 1.15 = 1380 km
    const bypassRoute = comparisons.find(c => c.type === 'Container-bypass')!
    // 4.10 * 0.88 = 3.61
    expect(bypassRoute.ratePerTonKm).toBe(3.61)
  })

  it('should apply correct discount rate-per-ton-km values within route comparisons for medium journeys (between 500 and 1000 km)', () => {
    const estimate = estimateFreightRate({
      distanceKm: 600,
      tonnage: 10,
      truckType: 'OpenBody',
    })

    const comparisons = estimate.routeComparison
    const openTruck = comparisons.find(c => c.type === 'Open')!
    // 3.40 * 0.94 = 3.20
    expect(openTruck.ratePerTonKm).toBe(3.20)

    const containerTruck = comparisons.find(c => c.type === 'Container')!
    // 4.10 * 0.94 = 3.85
    expect(containerTruck.ratePerTonKm).toBe(3.85)

    const openBodyTruck = comparisons.find(c => c.type === 'OpenBody')!
    // 3.15 * 0.94 = 2.96
    expect(openBodyTruck.ratePerTonKm).toBe(2.96)

    // Bypass distance = 600 * 1.15 = 690 km
    const bypassRoute = comparisons.find(c => c.type === 'OpenBody-bypass')!
    // 3.15 * 0.94 = 2.96
    expect(bypassRoute.ratePerTonKm).toBe(2.96)
  })
})
