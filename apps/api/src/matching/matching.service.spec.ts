import { MatchingService } from './matching.service'
import { calculateMatchScore as sharedCalculateMatchScore, estimateFreightRate } from '@lorrycarry/shared'

jest.mock('@lorrycarry/database', () => ({
  prisma: {},
  Prisma: { sql: jest.fn(), raw: jest.fn() },
}))

describe('MatchingService.calculateMatchScore (shared engine + server-side gates)', () => {
  const service = new MatchingService({ sendTemplate: jest.fn() } as any)

  const load = {
    id: 'load-1',
    tonnageRequired: 14,
    truckType: 'Open',
    loadingAddress: 'Chennai',
    unloadingAddress: 'Bengaluru',
    maxPrice: null,
  }

  const truck = {
    id: 'truck-1',
    bodyType: 'Open',
    tonnageCapacity: 15,
    verificationStatus: 'Verified',
    preferredDestinations: ['Bengaluru'],
  }

  it('produces the same breakdown as the shared engine with the API options applied', () => {
    const api = service.calculateMatchScore(load, truck, 5)
    const shared = sharedCalculateMatchScore(
      { ...load, maxPrice: null },
      truck,
      { distanceKm: 5, maxProximityKm: 50, budget: true },
    )
    expect(api.score).toBe(100)
    expect(api.score).toBe(shared.score)
    expect(api.factors.capacity.score).toBe(shared.factors.capacity.score)
    expect(api.factors.proximity.score).toBe(shared.factors.proximity.score)
    expect(api.factors.corridor.score).toBe(shared.factors.corridor.score)
  })

  it('always includes the budget factor (server-side gate enabled)', () => {
    const result = service.calculateMatchScore(load, truck, 5)
    expect(result.factors.budget).toBeDefined()
    expect(result.factors.budget.fit).toBe(true)
    expect(result.isBudgetFit).toBe(true)
    expect(result.reasons).toContain('No budget cap specified — open to market rate')
  })

  it('caps the score at 65 when the shipper budget is below benchmark', () => {
    const result = service.calculateMatchScore({ ...load, maxPrice: 100 }, truck, 5)
    expect(result.isBudgetFit).toBe(false)
    expect(result.score).toBe(65)
    expect(result.rating).toBe('MODERATE')
  })

  it('normalises snake_case raw SQL rows and Decimal-like strings', () => {
    const estimate = estimateFreightRate({ distanceKm: 5, tonnage: 14, truckType: 'Open' })
    const rawLoad = {
      id: 'load-raw',
      tonnage_required: '14.00',
      truck_type: 'Open',
      loading_address: 'Chennai',
      unloading_address: 'Bengaluru',
      max_price: String(estimate.recommendedTarget),
    }
    const rawTruck = {
      id: 'truck-raw',
      body_type: 'Open',
      tonnage_capacity: '15.00',
      verification_status: 'Verified',
      preferred_destinations: ['Bengaluru'],
      distanceKm: '5',
    }
    const result = service.calculateMatchScore(rawLoad, rawTruck)
    expect(result.score).toBe(100)
    expect(result.distanceKm).toBe(5)
    expect(result.isBudgetFit).toBe(true)
  })

  it('applies the 50 km proximity ceiling used by candidate discovery', () => {
    const wideTruck = { ...truck, serviceableRadiusKm: 500 }
    const result = service.calculateMatchScore(load, wideTruck, 80)
    expect(result.isProximityFit).toBe(false)
    expect(result.factors.proximity.detail).toContain('Beyond 50km proximity filter')
  })
})
