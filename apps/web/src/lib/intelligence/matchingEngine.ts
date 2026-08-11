/**
 * LorryCarry Logistics Intelligence — Smart Matching Engine
 * Deterministic, explainable rule-based matching architecture for truck-load pairing.
 * All scores are calculated from empirical physical parameters, geo-spatial proximity,
 * vehicle compliance status, and corridor return-haul alignments.
 */

import { calculateGeoDistance } from './pricingEngine'

export interface LoadItem {
  id: string
  tonnageRequired: number
  loadingAddress?: string
  loadingPin?: string
  loadingLat?: number
  loadingLng?: number
  unloadingAddress?: string
  unloadingPin?: string
  unloadingLat?: number
  unloadingLng?: number
  truckType: 'Open' | 'Container' | 'OpenBody' | string
  minLengthFt?: number
  minHeightFt?: number
  urgent?: boolean
  maxPrice?: number | null
  createdAt?: string
}

export interface TruckItem {
  id: string
  registrationNumber?: string
  bodyType: 'Open' | 'Container' | 'OpenBody' | string
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  currentLat?: number
  currentLng?: number
  distanceKm?: number
  serviceableRadiusKm?: number
  preferredDestinations?: string[]
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected' | string
  ownerPhone?: string
  ownerName?: string
}

export interface MatchFactorDetail {
  key: 'capacity' | 'bodyType' | 'proximity' | 'verification' | 'corridor'
  label: string
  value: string
  fit: boolean
  score: number
  maxScore: number
  detail: string
}

export interface MatchResult {
  score: number // 0 - 100
  rating: 'PERFECT' | 'STRONG' | 'MODERATE' | 'POOR'
  label: string
  color: string // Tailwind color class
  reasons: string[]
  warnings: string[]
  isCapacityFit: boolean
  isBodyTypeFit: boolean
  isProximityFit: boolean
  isVerified: boolean
  isPreferredCorridor: boolean
  isReturnLoad: boolean
  factors: {
    capacity: MatchFactorDetail
    bodyType: MatchFactorDetail
    proximity: MatchFactorDetail
    verification: MatchFactorDetail
    corridor: MatchFactorDetail
  }
}

export type MatchSortOption =
  | 'BEST_MATCH'
  | 'NEAREST'
  | 'CAPACITY_FIT'
  | 'VERIFIED'
  | 'RETURN_LOAD'

/**
 * Calculates a transparent, explainable match score between a Load and a Truck.
 * Max score breakdown:
 * - Capacity Fit: 35 pts
 * - Body Type Fit: 25 pts
 * - Proximity / Distance: 20 pts
 * - Transporter Verification: 15 pts
 * - Preferred Corridor / Return Load: 5 pts
 * Total: 100 pts
 */
export function calculateMatchScore(load: LoadItem, truck: TruckItem): MatchResult {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  const loadTonnage = Number(load.tonnageRequired) || 0
  const truckTonnage = Number(truck.tonnageCapacity) || 0

  // Determine distance via explicit parameter or lat/lng calculation
  let distanceKm = typeof truck.distanceKm === 'number' ? truck.distanceKm : undefined
  if (
    distanceKm === undefined &&
    truck.currentLat &&
    truck.currentLng &&
    load.loadingLat &&
    load.loadingLng
  ) {
    distanceKm = calculateGeoDistance(
      truck.currentLat,
      truck.currentLng,
      load.loadingLat,
      load.loadingLng
    )
  }
  if (distanceKm === undefined) {
    distanceKm = 15 // Standard default proximity estimate
  }

  // 1. Capacity Compatibility (Max 35 points)
  let isCapacityFit = false
  let capacityScore = 0
  let capacityValue = `${truckTonnage}T / ${loadTonnage}T`
  let capacityDetail = ''

  if (truckTonnage >= loadTonnage && loadTonnage > 0) {
    isCapacityFit = true
    const capacityRatio = loadTonnage / (truckTonnage || 1)
    if (capacityRatio >= 0.7) {
      // Optimal load-to-truck ratio (70% - 100% capacity utilization)
      capacityScore = 35
      capacityValue = `Optimal (${(capacityRatio * 100).toFixed(0)}% payload)`
      capacityDetail = `Optimal capacity match (${loadTonnage}T load in ${truckTonnage}T lorry)`
      reasons.push(capacityDetail)
    } else {
      // Truck is oversized for this load but fits
      capacityScore = 25
      capacityValue = `Fits (${(capacityRatio * 100).toFixed(0)}% space used)`
      capacityDetail = `Capacity fits with excess space (${truckTonnage}T capacity for ${loadTonnage}T load)`
      reasons.push(capacityDetail)
    }
  } else if (loadTonnage === 0) {
    isCapacityFit = true
    capacityScore = 30
    capacityValue = `${truckTonnage}T Capacity Available`
    capacityDetail = `Truck has ${truckTonnage}T payload available`
  } else {
    // Truck undersized
    const deficit = loadTonnage - truckTonnage
    capacityScore = Math.max(0, Math.round(15 - deficit * 2))
    capacityValue = `Under-capacity (-${deficit.toFixed(1)}T)`
    capacityDetail = `Truck capacity is ${deficit.toFixed(1)}T under required tonnage`
    warnings.push(capacityDetail)
  }
  score += capacityScore

  // 2. Body Type Compatibility (Max 25 points)
  let isBodyTypeFit = false
  let bodyTypeScore = 0
  let bodyTypeValue = `${truck.bodyType || 'Open'}`
  let bodyTypeDetail = ''

  const reqType = load.truckType || 'Open'
  const actType = truck.bodyType || 'Open'

  if (actType === reqType) {
    isBodyTypeFit = true
    bodyTypeScore = 25
    bodyTypeValue = `Exact Match (${actType})`
    bodyTypeDetail = `Exact body type match (${actType})`
    reasons.push(bodyTypeDetail)
  } else if (
    (reqType === 'Open' && actType === 'OpenBody') ||
    (reqType === 'OpenBody' && actType === 'Open')
  ) {
    isBodyTypeFit = true
    bodyTypeScore = 18
    bodyTypeValue = `Compatible (${actType})`
    bodyTypeDetail = `Compatible open trailer configuration (${actType})`
    reasons.push(bodyTypeDetail)
  } else {
    bodyTypeScore = 0
    bodyTypeValue = `Mismatch (${actType} vs ${reqType})`
    bodyTypeDetail = `Body type mismatch (Requires ${reqType}, Truck is ${actType})`
    warnings.push(bodyTypeDetail)
  }
  score += bodyTypeScore

  // 3. Proximity / Geo-Distance Fit (Max 20 points)
  let isProximityFit = false
  let proximityScore = 0
  const maxRadius = truck.serviceableRadiusKm || 50
  let proximityValue = `${distanceKm.toFixed(1)} km away`
  let proximityDetail = ''

  if (distanceKm <= 10) {
    isProximityFit = true
    proximityScore = 20
    proximityValue = `${distanceKm.toFixed(1)} km (Immediate)`
    proximityDetail = `Immediate proximity (${distanceKm.toFixed(1)} km from loading hub)`
    reasons.push(proximityDetail)
  } else if (distanceKm <= maxRadius) {
    isProximityFit = true
    proximityScore = Math.max(5, Math.round(20 - (distanceKm / maxRadius) * 12))
    proximityValue = `${distanceKm.toFixed(1)} km (In Radius)`
    proximityDetail = `Within service radius (${distanceKm.toFixed(1)} km away)`
    reasons.push(proximityDetail)
  } else {
    proximityScore = Math.max(0, Math.round(10 - ((distanceKm - maxRadius) / 50) * 8))
    proximityValue = `${distanceKm.toFixed(1)} km (Extended)`
    proximityDetail = `Beyond typical radius (${distanceKm.toFixed(1)} km from pickup)`
    warnings.push(proximityDetail)
  }
  score += proximityScore

  // 4. Verification & Trust Status (Max 15 points)
  const isVerified = truck.verificationStatus === 'Verified'
  let verificationScore = 0
  const verificationValue = isVerified ? 'Verified Transporter' : 'Verification Pending'
  let verificationDetail = ''

  if (isVerified) {
    verificationScore = 15
    verificationDetail = 'Verified transporter (RC and Vahan records verified)'
    reasons.push(verificationDetail)
  } else {
    verificationScore = 4
    verificationDetail = 'Transporter verification is pending approval'
    warnings.push(verificationDetail)
  }
  score += verificationScore

  // 5. Preferred Corridor / Return Load Fit (Max 5 points)
  let isPreferredCorridor = false
  let isReturnLoad = false
  let corridorScore = 0
  let corridorValue = 'Standard Route'
  let corridorDetail = 'Standard operational corridor'

  if (
    truck.preferredDestinations &&
    Array.isArray(truck.preferredDestinations) &&
    truck.preferredDestinations.length > 0
  ) {
    const unloadingText = (load.unloadingAddress || '').toLowerCase()
    const loadingText = (load.loadingAddress || '').toLowerCase()

    const matchesDestination = truck.preferredDestinations.some((dest) =>
      unloadingText.includes(dest.toLowerCase())
    )

    const matchesOrigin = truck.preferredDestinations.some((dest) =>
      loadingText.includes(dest.toLowerCase())
    )

    if (matchesDestination) {
      isPreferredCorridor = true
      corridorScore = 5
      corridorValue = 'Preferred Corridor'
      corridorDetail = 'Matches truck designated preferred freight corridor'
      reasons.push(corridorDetail)
    } else if (matchesOrigin) {
      isReturnLoad = true
      isPreferredCorridor = true
      corridorScore = 5
      corridorValue = 'Potential Return Load'
      corridorDetail = 'Originates from truck destination corridor (Return Haul)'
      reasons.push(corridorDetail)
    }
  }
  score += corridorScore

  // Normalize final score to 10-100 range
  score = Math.min(100, Math.max(10, Math.round(score)))

  let rating: MatchResult['rating'] = 'POOR'
  let color = 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/40 border-danger-200 dark:border-danger-800'

  if (score >= 85) {
    rating = 'PERFECT'
    color = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
  } else if (score >= 70) {
    rating = 'STRONG'
    color = 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800'
  } else if (score >= 50) {
    rating = 'MODERATE'
    color = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
  }

  return {
    score,
    rating,
    label: `${score}% Smart Match`,
    color,
    reasons,
    warnings,
    isCapacityFit,
    isBodyTypeFit,
    isProximityFit,
    isVerified,
    isPreferredCorridor,
    isReturnLoad,
    factors: {
      capacity: {
        key: 'capacity',
        label: 'Capacity Fit',
        value: capacityValue,
        fit: isCapacityFit,
        score: capacityScore,
        maxScore: 35,
        detail: capacityDetail,
      },
      bodyType: {
        key: 'bodyType',
        label: 'Body Type',
        value: bodyTypeValue,
        fit: isBodyTypeFit,
        score: bodyTypeScore,
        maxScore: 25,
        detail: bodyTypeDetail,
      },
      proximity: {
        key: 'proximity',
        label: 'Distance / Proximity',
        value: proximityValue,
        fit: isProximityFit,
        score: proximityScore,
        maxScore: 20,
        detail: proximityDetail,
      },
      verification: {
        key: 'verification',
        label: 'Transporter Verification',
        value: verificationValue,
        fit: isVerified,
        score: verificationScore,
        maxScore: 15,
        detail: verificationDetail,
      },
      corridor: {
        key: 'corridor',
        label: 'Corridor / Return Load',
        value: corridorValue,
        fit: isPreferredCorridor || isReturnLoad,
        score: corridorScore,
        maxScore: 5,
        detail: corridorDetail,
      },
    },
  }
}

/**
 * Sorts an array of items by the user-selected Match Intelligence criteria.
 */
export function sortMarketplaceItems<
  T extends {
    match?: MatchResult
    distanceKm?: number
    tonnageCapacity?: number
    tonnageRequired?: number
    verificationStatus?: string
  }
>(items: T[], sortBy: MatchSortOption, targetTonnage?: number): T[] {
  const cloned = [...items]

  switch (sortBy) {
    case 'BEST_MATCH':
      return cloned.sort((a, b) => {
        const scoreA = a.match?.score ?? 50
        const scoreB = b.match?.score ?? 50
        return scoreB - scoreA
      })

    case 'NEAREST':
      return cloned.sort((a, b) => {
        const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 9999
        const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 9999
        return distA - distB
      })

    case 'CAPACITY_FIT':
      return cloned.sort((a, b) => {
        if (targetTonnage) {
          const capA = a.tonnageCapacity ?? a.tonnageRequired ?? 0
          const capB = b.tonnageCapacity ?? b.tonnageRequired ?? 0
          const diffA = Math.abs(capA - targetTonnage)
          const diffB = Math.abs(capB - targetTonnage)
          return diffA - diffB
        }
        const fitA = a.match?.isCapacityFit ? 1 : 0
        const fitB = b.match?.isCapacityFit ? 1 : 0
        return fitB - fitA || (b.match?.score ?? 0) - (a.match?.score ?? 0)
      })

    case 'VERIFIED':
      return cloned.sort((a, b) => {
        const verA = a.verificationStatus === 'Verified' ? 1 : 0
        const verB = b.verificationStatus === 'Verified' ? 1 : 0
        if (verA !== verB) return verB - verA
        return (b.match?.score ?? 0) - (a.match?.score ?? 0)
      })

    case 'RETURN_LOAD':
      return cloned.sort((a, b) => {
        const retA = a.match?.isReturnLoad || a.match?.isPreferredCorridor ? 1 : 0
        const retB = b.match?.isReturnLoad || b.match?.isPreferredCorridor ? 1 : 0
        if (retA !== retB) return retB - retA
        return (b.match?.score ?? 0) - (a.match?.score ?? 0)
      })

    default:
      return cloned
  }
}

export interface BackhaulOpportunity {
  loadId: string
  loadingAddress: string
  unloadingAddress: string
  routeLabel: string
  tonnageRequired: number
  truckType: string
  estimatedFreight: number
  matchScore: number
  matchResult: MatchResult
  pickupDistanceFromDestinationKm: number
  potentialEmptyRunReductionKm: number
  pickupTiming?: string
  ownerPhone?: string | null
  ownerName?: string | null
  isReturnLoad: true
  disclaimer: string
}

/**
 * Discovers potential return load opportunities to reduce empty deadhead runs.
 * Evaluates real open loads against completed/current truck destination hubs.
 */
export function evaluateBackhaulOpportunities(
  truck: TruckItem,
  loads: LoadItem[],
  destinationLocation?: { lat: number; lng: number; label?: string }
): BackhaulOpportunity[] {
  const opportunities: BackhaulOpportunity[] = []

  for (const load of loads) {
    const match = calculateMatchScore(load, truck)

    // Calculate pickup distance from destination hub
    let pickupDistanceFromDestinationKm = 15
    if (
      destinationLocation &&
      destinationLocation.lat &&
      destinationLocation.lng &&
      load.loadingLat &&
      load.loadingLng
    ) {
      pickupDistanceFromDestinationKm = calculateGeoDistance(
        destinationLocation.lat,
        destinationLocation.lng,
        load.loadingLat,
        load.loadingLng
      )
    } else if (typeof truck.distanceKm === 'number') {
      pickupDistanceFromDestinationKm = truck.distanceKm
    }

    // Potential empty-run reduction is the freight transit distance of the return load
    let potentialEmptyRunReductionKm = 300
    if (load.loadingLat && load.loadingLng && load.unloadingLat && load.unloadingLng) {
      potentialEmptyRunReductionKm = calculateGeoDistance(
        load.loadingLat,
        load.loadingLng,
        load.unloadingLat,
        load.unloadingLng
      )
    } else if (load.unloadingAddress && load.loadingAddress) {
      potentialEmptyRunReductionKm = 350
    }

    // Target estimated freight
    const estimatedFreight = Number(load.maxPrice) || Math.round((2500 + potentialEmptyRunReductionKm * (Number(load.tonnageRequired) || 10) * 3.4) / 100) * 100

    opportunities.push({
      loadId: load.id,
      loadingAddress: load.loadingAddress || 'Origin Hub',
      unloadingAddress: load.unloadingAddress || 'Destination Terminal',
      routeLabel: `${load.loadingAddress || 'Origin'} ➔ ${load.unloadingAddress || 'Destination'}`,
      tonnageRequired: Number(load.tonnageRequired) || 10,
      truckType: load.truckType || 'Open',
      estimatedFreight,
      matchScore: match.score,
      matchResult: match,
      pickupDistanceFromDestinationKm,
      potentialEmptyRunReductionKm,
      pickupTiming: load.createdAt ? `Posted recently` : 'Immediate Loading',
      ownerPhone: (load as any).ownerPhone || null,
      ownerName: (load as any).ownerName || null,
      isReturnLoad: true,
      disclaimer: 'Potential Return Load — Subject to shipper confirmation and pickup schedule.',
    })
  }

  // Rank opportunities by match score & empty-run reduction
  return opportunities.sort((a, b) => b.matchScore - a.matchScore)
}
