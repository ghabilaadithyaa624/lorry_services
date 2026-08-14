import {
  calculateMatchScore,
  sortMarketplaceItems,
  evaluateBackhaulOpportunities,
  LoadItem,
  TruckItem,
  MatchResult,
  MatchSortOption,
} from './matchingEngine'

describe('Matching Engine — Distance calculation edge cases', () => {
  const baseLoad: LoadItem = {
    id: 'load-1',
    tonnageRequired: 10,
    truckType: 'Open',
  }

  const baseTruck: TruckItem = {
    id: 'truck-1',
    bodyType: 'Open',
    tonnageCapacity: 15,
  }

  it('should use truck.distanceKm when it is explicitly provided as a number', () => {
    const truck: TruckItem = { ...baseTruck, distanceKm: 25 }
    const result = calculateMatchScore(baseLoad, truck)
    expect(result.factors.proximity.score).toBeDefined()
    expect(result.factors.proximity.value).toContain('25.0 km')
  })

  it('should calculate distance from lat/lng when truck.distanceKm is undefined but coordinates are provided', () => {
    const load: LoadItem = { ...baseLoad, loadingLat: 12.9719, loadingLng: 77.6412 }
    const truck: TruckItem = { ...baseTruck, currentLat: 12.9756, currentLng: 77.5728 }

    const result = calculateMatchScore(load, truck)
    expect(result.factors.proximity.value).toContain('10.0 km')
  })

  it('should fallback to 15 km standard estimate when truck.distanceKm is undefined and coordinates are missing', () => {
    const truck: TruckItem = { ...baseTruck, distanceKm: undefined }
    const result = calculateMatchScore(baseLoad, truck)
    expect(result.factors.proximity.value).toContain('15.0 km')
  })
})

describe('Matching Engine — Scoring compatibility factors', () => {
  const baseLoad: LoadItem = {
    id: 'load-1',
    tonnageRequired: 10,
    truckType: 'Open',
  }

  const baseTruck: TruckItem = {
    id: 'truck-1',
    bodyType: 'Open',
    tonnageCapacity: 10,
    distanceKm: 5,
  }

  describe('Capacity Compatibility', () => {
    it('should award 35 pts for optimal capacity ratio (70% to 100%)', () => {
      const truck: TruckItem = { ...baseTruck, tonnageCapacity: 12 } // 10 / 12 = 83.3%
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.capacity.score).toBe(35)
      expect(result.factors.capacity.fit).toBe(true)
    })

    it('should award 25 pts for fits with excess space capacity ratio (< 70%)', () => {
      const truck: TruckItem = { ...baseTruck, tonnageCapacity: 20 } // 10 / 20 = 50%
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.capacity.score).toBe(25)
      expect(result.factors.capacity.fit).toBe(true)
    })

    it('should award 30 pts when load tonnage requested is 0', () => {
      const load: LoadItem = { ...baseLoad, tonnageRequired: 0 }
      const result = calculateMatchScore(load, baseTruck)
      expect(result.factors.capacity.score).toBe(30)
      expect(result.factors.capacity.fit).toBe(true)
    })

    it('should award penalized score for undersized trucks', () => {
      const truck: TruckItem = { ...baseTruck, tonnageCapacity: 5 } // deficit of 5
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.capacity.score).toBe(5) // Math.max(0, 15 - 5 * 2) = 5
      expect(result.factors.capacity.fit).toBe(false)
    })
  })

  describe('Body Type Compatibility', () => {
    it('should award 25 pts for exact body type match', () => {
      const result = calculateMatchScore(baseLoad, baseTruck)
      expect(result.factors.bodyType.score).toBe(25)
      expect(result.factors.bodyType.fit).toBe(true)
    })

    it('should award 18 pts for compatible body type (Open vs OpenBody)', () => {
      const truck: TruckItem = { ...baseTruck, bodyType: 'OpenBody' }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.bodyType.score).toBe(18)
      expect(result.factors.bodyType.fit).toBe(true)
    })

    it('should award 18 pts for compatible body type (OpenBody vs Open)', () => {
      const load: LoadItem = { ...baseLoad, truckType: 'OpenBody' }
      const truck: TruckItem = { ...baseTruck, bodyType: 'Open' }
      const result = calculateMatchScore(load, truck)
      expect(result.factors.bodyType.score).toBe(18)
      expect(result.factors.bodyType.fit).toBe(true)
    })

    it('should award 0 pts for body type mismatch', () => {
      const truck: TruckItem = { ...baseTruck, bodyType: 'Container' }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.bodyType.score).toBe(0)
      expect(result.factors.bodyType.fit).toBe(false)
    })
  })

  describe('Score Capping and Normalization', () => {
    it('should cap the minimum score at 10 when calculated points are very low', () => {
      const load: LoadItem = {
        id: 'load-1',
        tonnageRequired: 50,
        truckType: 'Container',
      }
      const truck: TruckItem = {
        id: 'truck-1',
        bodyType: 'Open',
        tonnageCapacity: 1,
        distanceKm: 500, // Beyond typical radius
        verificationStatus: 'Pending', // 4 points
      }
      const result = calculateMatchScore(load, truck)
      // calculated: capacity 0, body 0, proximity 0, verification 4, corridor 0. Total = 4.
      expect(result.score).toBe(10)
    })

    it('should return 100 for a perfect match', () => {
      const load: LoadItem = {
        id: 'load-1',
        tonnageRequired: 10,
        truckType: 'Open',
        loadingAddress: 'Bangalore',
        unloadingAddress: 'Chennai',
      }
      const truck: TruckItem = {
        id: 'truck-1',
        bodyType: 'Open',
        tonnageCapacity: 10,
        distanceKm: 5,
        verificationStatus: 'Verified',
        preferredDestinations: ['Chennai'],
      }
      const result = calculateMatchScore(load, truck)
      expect(result.score).toBe(100)
      expect(result.rating).toBe('PERFECT')
    })
  })

  describe('Proximity Fit', () => {
    it('should award 20 pts for immediate proximity (<= 10 km)', () => {
      const truck: TruckItem = { ...baseTruck, distanceKm: 8 }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.proximity.score).toBe(20)
      expect(result.factors.proximity.fit).toBe(true)
    })

    it('should award scaled score for inside serviceable radius', () => {
      const truck: TruckItem = { ...baseTruck, distanceKm: 25, serviceableRadiusKm: 50 }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.proximity.score).toBe(14)
      expect(result.factors.proximity.fit).toBe(true)
    })

    it('should award penalized score for extended/outside serviceable radius', () => {
      const truck: TruckItem = { ...baseTruck, distanceKm: 100, serviceableRadiusKm: 50 }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.proximity.score).toBe(2)
      expect(result.factors.proximity.fit).toBe(false)
    })
  })

  describe('Transporter Verification Status', () => {
    it('should award 15 pts for verified transporters', () => {
      const truck: TruckItem = { ...baseTruck, verificationStatus: 'Verified' }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.verification.score).toBe(15)
      expect(result.isVerified).toBe(true)
    })

    it('should award 4 pts for pending transporters', () => {
      const truck: TruckItem = { ...baseTruck, verificationStatus: 'Pending' }
      const result = calculateMatchScore(baseLoad, truck)
      expect(result.factors.verification.score).toBe(4)
      expect(result.isVerified).toBe(false)
    })
  })

  describe('Corridor and Return Load Fit', () => {
    it('should award 5 pts when preferred destinations match unloading address', () => {
      const load: LoadItem = { ...baseLoad, unloadingAddress: 'Mumbai Port' }
      const truck: TruckItem = { ...baseTruck, preferredDestinations: ['mumbai'] }
      const result = calculateMatchScore(load, truck)
      expect(result.factors.corridor.score).toBe(5)
      expect(result.isPreferredCorridor).toBe(true)
    })

    it('should award 5 pts for return load match (matches loading address)', () => {
      const load: LoadItem = { ...baseLoad, loadingAddress: 'Chennai Terminal' }
      const truck: TruckItem = { ...baseTruck, preferredDestinations: ['chennai'] }
      const result = calculateMatchScore(load, truck)
      expect(result.factors.corridor.score).toBe(5)
      expect(result.isReturnLoad).toBe(true)
    })

    it('should award 0 pts for standard route mismatch', () => {
      const load: LoadItem = { ...baseLoad, loadingAddress: 'Bangalore', unloadingAddress: 'Chennai' }
      const truck: TruckItem = { ...baseTruck, preferredDestinations: ['mumbai'] }
      const result = calculateMatchScore(load, truck)
      expect(result.factors.corridor.score).toBe(0)
      expect(result.isPreferredCorridor).toBe(false)
      expect(result.isReturnLoad).toBe(false)
    })
  })
})

describe('Matching Engine — sortMarketplaceItems', () => {
  interface MockItem {
    id: string
    match?: MatchResult
    distanceKm?: number
    tonnageCapacity?: number
    tonnageRequired?: number
    verificationStatus?: string
  }

  const items: MockItem[] = [
    {
      id: 'item-1',
      distanceKm: 30,
      tonnageCapacity: 15,
      verificationStatus: 'Pending',
      match: { score: 60, isCapacityFit: true, isReturnLoad: false, isPreferredCorridor: false } as MatchResult,
    },
    {
      id: 'item-2',
      distanceKm: 10,
      tonnageCapacity: 25,
      verificationStatus: 'Verified',
      match: { score: 85, isCapacityFit: true, isReturnLoad: true, isPreferredCorridor: true } as MatchResult,
    },
    {
      id: 'item-3',
      distanceKm: 50,
      tonnageCapacity: 8,
      verificationStatus: 'Pending',
      match: { score: 40, isCapacityFit: false, isReturnLoad: false, isPreferredCorridor: false } as MatchResult,
    },
  ]

  it('should sort by BEST_MATCH', () => {
    const result = sortMarketplaceItems(items, 'BEST_MATCH')
    expect(result[0].id).toBe('item-2') // score 85
    expect(result[1].id).toBe('item-1') // score 60
    expect(result[2].id).toBe('item-3') // score 40
  })

  it('should sort by NEAREST', () => {
    const result = sortMarketplaceItems(items, 'NEAREST')
    expect(result[0].id).toBe('item-2') // 10 km
    expect(result[1].id).toBe('item-1') // 30 km
    expect(result[2].id).toBe('item-3') // 50 km
  })

  it('should sort by CAPACITY_FIT with targetTonnage', () => {
    const result = sortMarketplaceItems(items, 'CAPACITY_FIT', 14)
    expect(result[0].id).toBe('item-1')
    expect(result[1].id).toBe('item-3')
    expect(result[2].id).toBe('item-2')
  })

  it('should sort by CAPACITY_FIT without targetTonnage', () => {
    const result = sortMarketplaceItems(items, 'CAPACITY_FIT')
    expect(result[0].id).toBe('item-2')
    expect(result[1].id).toBe('item-1')
    expect(result[2].id).toBe('item-3')
  })

  it('should sort by VERIFIED', () => {
    const result = sortMarketplaceItems(items, 'VERIFIED')
    expect(result[0].id).toBe('item-2') // Verified
    expect(result[1].id).toBe('item-1') // Pending, but higher score (60)
    expect(result[2].id).toBe('item-3') // Pending, score 40
  })

  it('should sort by RETURN_LOAD', () => {
    const result = sortMarketplaceItems(items, 'RETURN_LOAD')
    expect(result[0].id).toBe('item-2') // Return Load
    expect(result[1].id).toBe('item-1') // Standard Route, score 60
    expect(result[2].id).toBe('item-3') // Standard Route, score 40
  })

  it('should fall back to score 50 in BEST_MATCH sorting when match is missing', () => {
    const itemsWithoutMatch: MockItem[] = [
      { id: 'item-1', match: { score: 45 } as MatchResult },
      { id: 'item-2' }, // falls back to 50
      { id: 'item-3', match: { score: 55 } as MatchResult },
    ]
    const result = sortMarketplaceItems(itemsWithoutMatch, 'BEST_MATCH')
    expect(result[0].id).toBe('item-3') // 55
    expect(result[1].id).toBe('item-2') // fallback 50
    expect(result[2].id).toBe('item-1') // 45
  })

  it('should fall back to 9999 in NEAREST sorting when distanceKm is missing', () => {
    const itemsWithoutDist: MockItem[] = [
      { id: 'item-1', distanceKm: 150 },
      { id: 'item-2' }, // falls back to 9999
      { id: 'item-3', distanceKm: 10 },
    ]
    const result = sortMarketplaceItems(itemsWithoutDist, 'NEAREST')
    expect(result[0].id).toBe('item-3') // 10
    expect(result[1].id).toBe('item-1') // 150
    expect(result[2].id).toBe('item-2') // fallback 9999
  })

  it('should fall back correctly when tonnage capacity/required is missing in CAPACITY_FIT sorting with targetTonnage', () => {
    const itemsWithoutTonnage: MockItem[] = [
      { id: 'item-1', tonnageCapacity: 10 },
      { id: 'item-2' }, // falls back to 0 capacity
      { id: 'item-3', tonnageRequired: 8 },
    ]
    const result = sortMarketplaceItems(itemsWithoutTonnage, 'CAPACITY_FIT', 5)
    // differences: item-1: |10-5| = 5, item-2: |0-5| = 5, item-3: |8-5| = 3
    expect(result[0].id).toBe('item-3') // diff 3
    expect(result[1].id).toBe('item-1') // diff 5
    expect(result[2].id).toBe('item-2') // diff 5
  })

  it('should sort by match score fallback in CAPACITY_FIT sorting when matches are present but no targetTonnage', () => {
    const itemsNoTarget: MockItem[] = [
      { id: 'item-1', match: { isCapacityFit: true, score: 60 } as MatchResult },
      { id: 'item-2', match: { isCapacityFit: true, score: 80 } as MatchResult },
      { id: 'item-3', match: { isCapacityFit: false, score: 40 } as MatchResult },
    ]
    const result = sortMarketplaceItems(itemsNoTarget, 'CAPACITY_FIT')
    expect(result[0].id).toBe('item-2') // isCapacityFit: true, score 80
    expect(result[1].id).toBe('item-1') // isCapacityFit: true, score 60
    expect(result[2].id).toBe('item-3') // isCapacityFit: false, score 40
  })

  it('should sort by match score fallback in VERIFIED/RETURN_LOAD sorting when status is equal', () => {
    const itemsVerified: MockItem[] = [
      { id: 'item-1', verificationStatus: 'Verified', match: { score: 60 } as MatchResult },
      { id: 'item-2', verificationStatus: 'Verified', match: { score: 80 } as MatchResult },
    ]
    const result = sortMarketplaceItems(itemsVerified, 'VERIFIED')
    expect(result[0].id).toBe('item-2') // score 80
    expect(result[1].id).toBe('item-1') // score 60
  })

  it('should return cloned array unmodified for default sorting option', () => {
    const result = sortMarketplaceItems(items, 'INVALID_SORT_OPTION' as MatchSortOption)
    expect(result).toEqual(items)
    expect(result).not.toBe(items)
  })
})

describe('Matching Engine — evaluateBackhaulOpportunities', () => {
  const truck: TruckItem = {
    id: 'truck-1',
    bodyType: 'Open',
    tonnageCapacity: 15,
    distanceKm: 20,
  }

  const loads: LoadItem[] = [
    {
      id: 'load-1',
      tonnageRequired: 10,
      truckType: 'Open',
      loadingLat: 12.9719,
      loadingLng: 77.6412,
      unloadingLat: 12.9756,
      unloadingLng: 77.5728,
      loadingAddress: 'Indiranagar',
      unloadingAddress: 'Majestic',
      maxPrice: 5000,
    },
    {
      id: 'load-2',
      tonnageRequired: 8,
      truckType: 'Container',
      unloadingAddress: 'Whitefield',
      loadingAddress: 'Koramangala',
    },
  ]

  it('should evaluate and return potential backhaul opportunities', () => {
    const destination = { lat: 12.9756, lng: 77.5728, label: 'Majestic' }
    const result = evaluateBackhaulOpportunities(truck, loads, destination)

    expect(result.length).toBe(2)

    // Check specific fields of load-1 opportunity
    const opp1 = result.find((opp) => opp.loadId === 'load-1')
    expect(opp1).toBeDefined()
    expect(opp1?.pickupDistanceFromDestinationKm).toBe(10) // Majestic to Indiranagar
    expect(opp1?.potentialEmptyRunReductionKm).toBe(10) // Indiranagar to Majestic
    expect(opp1?.estimatedFreight).toBe(5000) // Uses load maxPrice
    expect(opp1?.routeLabel).toBe('Indiranagar ➔ Majestic')

    // Check specific fields of load-2 opportunity with coordinates missing
    const opp2 = result.find((opp) => opp.loadId === 'load-2')
    expect(opp2).toBeDefined()
    expect(opp2?.pickupDistanceFromDestinationKm).toBe(20) // Falls back to truck.distanceKm
    expect(opp2?.potentialEmptyRunReductionKm).toBe(350) // Falls back to 350
    expect(opp2?.estimatedFreight).toBeGreaterThan(0) // Default calculated estimation
  })

  it('performance benchmark of evaluateBackhaulOpportunities', () => {
    const manyLoads: LoadItem[] = []
    for (let i = 0; i < 1000; i++) {
      manyLoads.push({
        id: `load-${i}`,
        tonnageRequired: 10 + (i % 10),
        truckType: i % 2 === 0 ? 'Open' : 'Container',
        loadingLat: 12.9719 + (i % 100) * 0.001,
        loadingLng: 77.6412 + (i % 100) * 0.001,
        unloadingLat: 12.9756 + (i % 100) * 0.001,
        unloadingLng: 77.5728 + (i % 100) * 0.001,
        loadingAddress: `Load Address ${i}`,
        unloadingAddress: `Unload Address ${i}`,
        maxPrice: 3000 + (i % 5) * 1000,
      })
    }

    const testTruck: TruckItem = {
      id: 'truck-perf',
      bodyType: 'Open',
      tonnageCapacity: 15,
      currentLat: 12.9716,
      currentLng: 77.5946,
      distanceKm: 20,
    }

    const destination = { lat: 12.9756, lng: 77.5728, label: 'Majestic' }

    // Run a warm up
    evaluateBackhaulOpportunities(testTruck, manyLoads.slice(0, 50), destination)

    const start = performance.now()
    // Call evaluateBackhaulOpportunities 20 times over 1000 loads
    for (let run = 0; run < 20; run++) {
      evaluateBackhaulOpportunities(testTruck, manyLoads, destination)
    }
    const end = performance.now()
    console.log(`[MATCH_ENGINE_BENCHMARK] Elapsed time for 20k matches: ${(end - start).toFixed(2)} ms`)
  })
})
