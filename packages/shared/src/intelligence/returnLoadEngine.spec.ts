import { evaluateBackhaulOpportunities, LoadItem, TruckItem } from './matchingEngine'
import { estimateFreightRate } from './pricingEngine'
import {
  rankReturnLoadOpportunities,
  scoreReturnLoadOpportunity,
  RETURN_LOAD_RANK_WEIGHTS,
  DEFAULT_RETURN_LOAD_RADIUS_KM,
} from './returnLoadEngine'

/** Drop-off hub the lorry becomes empty at (Bengaluru Majestic). */
const HUB = { lat: 12.9756, lng: 77.5728, label: 'Bengaluru' }

const truck: TruckItem = {
  id: 'truck-1',
  registrationNumber: 'KA01AB1234',
  bodyType: 'Open',
  tonnageCapacity: 20,
  currentLat: HUB.lat,
  currentLng: HUB.lng,
  serviceableRadiusKm: 150,
  verificationStatus: 'Verified',
  preferredDestinations: ['Chennai'],
}

function buildLoad(overrides: Partial<LoadItem> & { id: string }): LoadItem {
  return {
    tonnageRequired: 18,
    truckType: 'Open',
    loadingAddress: 'Bengaluru Peenya',
    unloadingAddress: 'Chennai Ambattur',
    loadingLat: 12.9719,
    loadingLng: 77.6412,
    unloadingLat: 13.0827,
    unloadingLng: 80.2707,
    ...overrides,
  }
}

describe('Return Load Engine — scoreReturnLoadOpportunity', () => {
  it('awards the full 100 points to a perfect return haul', () => {
    const load = buildLoad({
      id: 'load-perfect',
      tonnageRequired: 20,
      loadingLat: HUB.lat,
      loadingLng: HUB.lng,
      maxPrice: 300000,
    })
    const [opportunity] = evaluateBackhaulOpportunities(truck, [load], HUB, { maxProximityKm: 150 })

    const ranked = scoreReturnLoadOpportunity(opportunity, truck, { radiusKm: 150 })

    expect(ranked.rankScore).toBe(100)
    expect(ranked.preferredCorridor).toBe(true)
    expect(ranked.bodyTypeExact).toBe(true)
    expect(ranked.payloadUtilizationPct).toBe(100)
    expect(ranked.rankFactors.map((f) => f.key)).toEqual([
      'matchScore',
      'pickupProximity',
      'payload',
      'bodyType',
      'rate',
      'corridor',
    ])
  })

  it('never exceeds the declared factor weights', () => {
    const load = buildLoad({ id: 'load-cap', maxPrice: 10_000_000 })
    const [opportunity] = evaluateBackhaulOpportunities(truck, [load], HUB, { maxProximityKm: 150 })
    const ranked = scoreReturnLoadOpportunity(opportunity, truck, { radiusKm: 150 })

    for (const factor of ranked.rankFactors) {
      expect(factor.maxScore).toBe(RETURN_LOAD_RANK_WEIGHTS[factor.key])
      expect(factor.score).toBeLessThanOrEqual(factor.maxScore)
      expect(factor.score).toBeGreaterThanOrEqual(0)
    }
    expect(ranked.rankScore).toBeLessThanOrEqual(100)
  })

  it('penalises deadhead distance from the drop-off hub', () => {
    const near = buildLoad({ id: 'near', loadingLat: HUB.lat, loadingLng: HUB.lng })
    const far = buildLoad({ id: 'far', loadingLat: 13.9756, loadingLng: 77.5728 })

    const [nearOpp] = evaluateBackhaulOpportunities(truck, [near], HUB, { maxProximityKm: 150 })
    const [farOpp] = evaluateBackhaulOpportunities(truck, [far], HUB, { maxProximityKm: 150 })

    const nearProximity = scoreReturnLoadOpportunity(nearOpp, truck, { radiusKm: 150 }).rankFactors.find(
      (f) => f.key === 'pickupProximity'
    )!
    const farProximity = scoreReturnLoadOpportunity(farOpp, truck, { radiusKm: 150 }).rankFactors.find(
      (f) => f.key === 'pickupProximity'
    )!

    expect(nearProximity.score).toBe(RETURN_LOAD_RANK_WEIGHTS.pickupProximity)
    expect(farProximity.score).toBeLessThan(nearProximity.score)
    expect(farProximity.value).toContain('km deadhead')
  })

  it('rewards payload utilisation and zeroes it when the load does not fit', () => {
    const halfEmpty = buildLoad({ id: 'half', tonnageRequired: 10 })
    const oversized = buildLoad({ id: 'oversized', tonnageRequired: 40 })

    const [halfOpp] = evaluateBackhaulOpportunities(truck, [halfEmpty], HUB, { maxProximityKm: 150 })
    const [overOpp] = evaluateBackhaulOpportunities(truck, [oversized], HUB, { maxProximityKm: 150 })

    const halfPayload = scoreReturnLoadOpportunity(halfOpp, truck).rankFactors.find((f) => f.key === 'payload')!
    const overPayload = scoreReturnLoadOpportunity(overOpp, truck).rankFactors.find((f) => f.key === 'payload')!

    expect(halfPayload.score).toBeCloseTo(RETURN_LOAD_RANK_WEIGHTS.payload * 0.5, 1)
    expect(overPayload.score).toBe(0)
    expect(overPayload.detail).toContain('does not fit')
  })

  it('scores an exact body type above a merely compatible one and zero on mismatch', () => {
    const openBody = buildLoad({ id: 'openbody', truckType: 'OpenBody' })
    const container = buildLoad({ id: 'container', truckType: 'Container' })

    const [openOpp] = evaluateBackhaulOpportunities(truck, [openBody], HUB, { maxProximityKm: 150 })
    const [containerOpp] = evaluateBackhaulOpportunities(truck, [container], HUB, { maxProximityKm: 150 })

    const compatible = scoreReturnLoadOpportunity(openOpp, truck).rankFactors.find((f) => f.key === 'bodyType')!
    const mismatch = scoreReturnLoadOpportunity(containerOpp, truck).rankFactors.find((f) => f.key === 'bodyType')!

    expect(compatible.score).toBeCloseTo(RETURN_LOAD_RANK_WEIGHTS.bodyType * 0.6, 1)
    expect(compatible.value).toContain('Compatible')
    expect(mismatch.score).toBe(0)
    expect(mismatch.value).toContain('Mismatch')
  })

  it('compares the offered rate against the shared pricing benchmark', () => {
    const load = buildLoad({ id: 'rate' })
    const [opportunity] = evaluateBackhaulOpportunities(truck, [load], HUB, { maxProximityKm: 150 })
    const ranked = scoreReturnLoadOpportunity(opportunity, truck)

    const expected = estimateFreightRate({
      distanceKm: opportunity.potentialEmptyRunReductionKm,
      tonnage: opportunity.tonnageRequired,
      truckType: 'Open',
    }).recommendedTarget

    expect(ranked.benchmarkFreight).toBe(expected)
    expect(ranked.rankFactors.find((f) => f.key === 'rate')!.value).toContain('% of benchmark')
  })

  it('zeroes the rate factor when the shipper budget fails the budget gate', () => {
    const load = buildLoad({ id: 'lowball', maxPrice: 500 })
    const [opportunity] = evaluateBackhaulOpportunities(truck, [load], HUB, {
      maxProximityKm: 150,
      budget: true,
    })
    const ranked = scoreReturnLoadOpportunity(opportunity, truck)

    expect(ranked.budgetFit).toBe(false)
    expect(ranked.rankFactors.find((f) => f.key === 'rate')!.score).toBe(0)
  })

  it('falls back to the default discovery radius when none is supplied', () => {
    const load = buildLoad({ id: 'default-radius', loadingLat: HUB.lat, loadingLng: HUB.lng })
    const [opportunity] = evaluateBackhaulOpportunities(truck, [load], HUB)

    expect(DEFAULT_RETURN_LOAD_RADIUS_KM).toBe(50)
    expect(scoreReturnLoadOpportunity(opportunity, truck).rankScore).toBeGreaterThan(0)
  })
})

describe('Return Load Engine — rankReturnLoadOpportunities', () => {
  const loads: LoadItem[] = [
    // Best: pickup at the drop-off hub, fills the lorry, runs the preferred Chennai corridor.
    buildLoad({ id: 'load-best', loadingLat: HUB.lat, loadingLng: HUB.lng, maxPrice: 180000 }),
    // Same corridor and payload, but ~40 km of empty running to reach the pickup.
    buildLoad({ id: 'load-mid', loadingLat: 13.2556, loadingLng: 77.5728 }),
    // Body type mismatch at the hub — should sink to the bottom.
    buildLoad({ id: 'load-container', truckType: 'Container', unloadingAddress: 'Hyderabad' }),
  ]

  it('ranks by composite score, assigning stable 1-based ranks', () => {
    const opportunities = evaluateBackhaulOpportunities(truck, loads, HUB, { maxProximityKm: 150 })
    const ranked = rankReturnLoadOpportunities(opportunities, truck, { radiusKm: 150 })

    expect(ranked.map((o) => o.loadId)).toEqual(['load-best', 'load-mid', 'load-container'])
    expect(ranked.map((o) => o.rank)).toEqual([1, 2, 3])
    expect(ranked[0].rankScore).toBeGreaterThan(ranked[1].rankScore)
    expect(ranked[1].rankScore).toBeGreaterThan(ranked[2].rankScore)
  })

  it('is deterministic across repeated evaluations', () => {
    const first = rankReturnLoadOpportunities(
      evaluateBackhaulOpportunities(truck, loads, HUB, { maxProximityKm: 150 }),
      truck,
      { radiusKm: 150 }
    )
    const second = rankReturnLoadOpportunities(
      evaluateBackhaulOpportunities(truck, loads, HUB, { maxProximityKm: 150 }),
      truck,
      { radiusKm: 150 }
    )

    expect(second.map((o) => [o.loadId, o.rankScore])).toEqual(first.map((o) => [o.loadId, o.rankScore]))
  })

  it('breaks ties on the shorter deadhead to pickup', () => {
    const a = buildLoad({ id: 'tie-a', loadingLat: 12.9719, loadingLng: 77.6412 })
    const b = buildLoad({ id: 'tie-b', loadingLat: HUB.lat, loadingLng: HUB.lng })
    const ranked = rankReturnLoadOpportunities(
      evaluateBackhaulOpportunities(truck, [a, b], HUB, { maxProximityKm: 150 }),
      truck,
      { radiusKm: 150 }
    )

    expect(ranked[0].loadId).toBe('tie-b')
    expect(ranked[0].pickupDistanceFromDestinationKm).toBeLessThan(ranked[1].pickupDistanceFromDestinationKm)
  })

  it('uses the explicit tonnage capacity override when provided', () => {
    const load = buildLoad({ id: 'decimal-capacity', tonnageRequired: 9 })
    const opportunities = evaluateBackhaulOpportunities(truck, [load], HUB, { maxProximityKm: 150 })

    const ranked = rankReturnLoadOpportunities(opportunities, { ...truck, tonnageCapacity: 0 }, {
      radiusKm: 150,
      tonnageCapacity: 18,
    })

    expect(ranked[0].payloadUtilizationPct).toBe(50)
  })

  it('returns an empty list when there are no candidates', () => {
    expect(rankReturnLoadOpportunities([], truck, { radiusKm: 150 })).toEqual([])
  })
})
