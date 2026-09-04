import {
  calculateMatchScore,
  evaluateBudgetFit,
  rateMatchScore,
  DEFAULT_BUDGET_GATE,
  LoadItem,
  TruckItem,
} from './matchingEngine'
import { estimateFreightRate, normalizeTruckType } from './pricingEngine'

const perfectLoad: LoadItem = {
  id: 'load-1',
  tonnageRequired: 14,
  truckType: 'Open',
  loadingAddress: 'Chennai',
  unloadingAddress: 'Bengaluru',
}

const perfectTruck: TruckItem = {
  id: 'truck-1',
  bodyType: 'Open',
  tonnageCapacity: 15,
  distanceKm: 5,
  verificationStatus: 'Verified',
  preferredDestinations: ['Bengaluru'],
}

describe('Shared matching — budget gate (server-side compatibility)', () => {
  it('does not evaluate budget when the gate is disabled (client default)', () => {
    const result = calculateMatchScore({ ...perfectLoad, maxPrice: 1 }, perfectTruck)
    expect(result.score).toBe(100)
    expect(result.isBudgetFit).toBe(true)
    expect(result.factors.budget).toBeUndefined()
    expect(result.warnings.some((w) => w.includes('Budget'))).toBe(false)
  })

  it('reports budget compatible and keeps the full score when maxPrice covers the estimate', () => {
    const estimate = estimateFreightRate({ distanceKm: 5, tonnage: 14, truckType: 'Open' })
    const load = { ...perfectLoad, maxPrice: estimate.recommendedTarget }
    const result = calculateMatchScore(load, perfectTruck, { budget: true })
    expect(result.score).toBe(100)
    expect(result.isBudgetFit).toBe(true)
    expect(result.factors.budget?.fit).toBe(true)
    expect(result.factors.budget?.score).toBe(5)
    expect(result.reasons.some((r) => r.includes('Budget accommodates'))).toBe(true)
  })

  it('caps the score at 65 when the budget falls short by more than 15%', () => {
    const load = { ...perfectLoad, maxPrice: 100 }
    const result = calculateMatchScore(load, perfectTruck, { budget: true })
    expect(result.score).toBe(DEFAULT_BUDGET_GATE.scoreCap)
    expect(result.rating).toBe('MODERATE')
    expect(result.isBudgetFit).toBe(false)
    expect(result.factors.budget?.fit).toBe(false)
    expect(result.warnings.some((w) => w.includes('Budget below'))).toBe(true)
  })

  it('allows a 15% variance below the estimate', () => {
    const estimate = estimateFreightRate({ distanceKm: 5, tonnage: 14, truckType: 'Open' })
    const justInside = Math.ceil(estimate.recommendedTarget * 0.85)
    const justOutside = Math.floor(estimate.recommendedTarget * 0.84)
    expect(evaluateBudgetFit(justInside, 14, 'Open', 5).fit).toBe(true)
    expect(evaluateBudgetFit(justOutside, 14, 'Open', 5).fit).toBe(false)
  })

  it('treats missing budgets as open to market rate', () => {
    expect(evaluateBudgetFit(null, 14, 'Open', 5)).toEqual({
      fit: true,
      detail: 'No budget cap specified — open to market rate',
      estimated: 0,
    })
    expect(evaluateBudgetFit(undefined, 14, 'Open', 5).fit).toBe(true)
  })

  it('reproduces the legacy backend estimate formula (handling + km × t × rate, <10km ⇒ 350km)', () => {
    // Legacy backend: baseRate 3.4, handling 2500, distance < 10 falls back to 350 km.
    const legacy = Math.round((2500 + 350 * 14 * 3.4) / 100) * 100
    expect(evaluateBudgetFit(legacy, 14, 'Open', 5).estimated).toBe(legacy)

    // Long haul discount applied for > 1000 km with Container rates.
    const legacyLong = Math.round((3500 + 1200 * 10 * 4.1 * 0.88) / 100) * 100
    expect(evaluateBudgetFit(legacyLong, 10, 'Container', 1200).estimated).toBe(legacyLong)
  })

  it('accepts a custom gate config', () => {
    const load = { ...perfectLoad, maxPrice: 100 }
    const result = calculateMatchScore(load, perfectTruck, { budget: { scoreCap: 40 } })
    expect(result.score).toBe(40)
    expect(result.rating).toBe('POOR')
  })

  it('caches results separately per scoring option set', () => {
    const load = { ...perfectLoad, maxPrice: 100 }
    const gated = calculateMatchScore(load, perfectTruck, { budget: true })
    const open = calculateMatchScore(load, perfectTruck)
    expect(gated.score).toBe(65)
    expect(open.score).toBe(100)
    expect(calculateMatchScore(load, perfectTruck, { budget: true })).toBe(gated)
  })
})

describe('Shared matching — explicit distance & proximity ceiling', () => {
  const truck: TruckItem = { id: 't', bodyType: 'Open', tonnageCapacity: 15, distanceKm: 5, serviceableRadiusKm: 20 }
  const load: LoadItem = { id: 'l', tonnageRequired: 10, truckType: 'Open' }

  it('prefers options.distanceKm over truck.distanceKm', () => {
    const result = calculateMatchScore(load, truck, { distanceKm: 30 })
    expect(result.distanceKm).toBe(30)
    expect(result.factors.proximity.value).toContain('30.0 km')
  })

  it('treats distances within maxProximityKm but beyond the truck radius as in-radius', () => {
    const result = calculateMatchScore(load, truck, { distanceKm: 30, maxProximityKm: 50 })
    expect(result.isProximityFit).toBe(true)
    expect(result.factors.proximity.score).toBe(Math.max(5, Math.round(20 - (30 / 50) * 12)))
    expect(result.factors.proximity.detail).toContain('Within 50km proximity filter')
  })

  it('penalises distances beyond maxProximityKm', () => {
    const result = calculateMatchScore(load, { ...truck, serviceableRadiusKm: 200 }, { distanceKm: 80, maxProximityKm: 50 })
    expect(result.isProximityFit).toBe(false)
    expect(result.factors.proximity.score).toBe(Math.max(0, Math.round(10 - ((80 - 50) / 50) * 8)))
    expect(result.factors.proximity.detail).toContain('Beyond 50km proximity filter')
  })

  it('exposes the resolved distance on the result', () => {
    expect(calculateMatchScore(load, { ...truck, distanceKm: undefined }).distanceKm).toBe(15)
  })
})

describe('Shared matching — rating tone', () => {
  it('maps score tiers to presentation-neutral tones', () => {
    expect(rateMatchScore(100)).toEqual({ rating: 'PERFECT', tone: 'success' })
    expect(rateMatchScore(85)).toEqual({ rating: 'PERFECT', tone: 'success' })
    expect(rateMatchScore(70)).toEqual({ rating: 'STRONG', tone: 'primary' })
    expect(rateMatchScore(50)).toEqual({ rating: 'MODERATE', tone: 'warning' })
    expect(rateMatchScore(49)).toEqual({ rating: 'POOR', tone: 'danger' })
  })
})

describe('Shared pricing — normalizeTruckType', () => {
  it('normalises DB / user variants into canonical pricing types', () => {
    expect(normalizeTruckType('Container')).toBe('Container')
    expect(normalizeTruckType('container')).toBe('Container')
    expect(normalizeTruckType('OpenBody')).toBe('OpenBody')
    expect(normalizeTruckType('Open body')).toBe('OpenBody')
    expect(normalizeTruckType('open_body')).toBe('OpenBody')
    expect(normalizeTruckType('Open')).toBe('Open')
    expect(normalizeTruckType(undefined)).toBe('Open')
    expect(normalizeTruckType('Tanker')).toBe('Open')
  })
})
