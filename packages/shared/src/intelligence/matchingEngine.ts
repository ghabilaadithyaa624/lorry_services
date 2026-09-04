/**
 * LorryCarry Logistics Intelligence — Smart Matching Engine
 * Deterministic, explainable rule-based matching architecture for truck-load pairing.
 * All scores are calculated from empirical physical parameters, geo-spatial proximity,
 * vehicle compliance status, and corridor return-haul alignments.
 *
 * This module is the single source of truth for match scoring across API, web,
 * admin and mobile. It is pure: no DOM, React, Prisma or Node-only APIs.
 */

import { calculateGeoDistance } from './geo'
import { estimateFreightRate, normalizeTruckType } from './pricingEngine'

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
  ownerPhone?: string | null
  ownerName?: string | null
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

export type MatchFactorKey =
  | 'capacity'
  | 'bodyType'
  | 'proximity'
  | 'verification'
  | 'corridor'
  | 'budget'

export interface MatchFactorDetail {
  key: MatchFactorKey
  label: string
  value: string
  fit: boolean
  score: number
  maxScore: number
  detail: string
}

export type MatchRating = 'PERFECT' | 'STRONG' | 'MODERATE' | 'POOR'

/** Presentation-neutral tone for a rating. UIs map this to their own colours. */
export type MatchTone = 'success' | 'primary' | 'warning' | 'danger'

export interface MatchFactors {
  capacity: MatchFactorDetail
  bodyType: MatchFactorDetail
  proximity: MatchFactorDetail
  verification: MatchFactorDetail
  corridor: MatchFactorDetail
  /** Only present when budget gating is enabled via {@link MatchScoringOptions.budget}. */
  budget?: MatchFactorDetail
}

export interface MatchResult {
  score: number // 0 - 100
  rating: MatchRating
  tone: MatchTone
  label: string
  reasons: string[]
  warnings: string[]
  isCapacityFit: boolean
  isBodyTypeFit: boolean
  isProximityFit: boolean
  isVerified: boolean
  isPreferredCorridor: boolean
  isReturnLoad: boolean
  /** `true` when budget gating is disabled or the shipper budget accommodates the estimate. */
  isBudgetFit: boolean
  /** Distance used for the proximity factor (explicit, derived from coordinates, or default). */
  distanceKm: number
  factors: MatchFactors
}

export type MatchSortOption =
  | 'BEST_MATCH'
  | 'NEAREST'
  | 'CAPACITY_FIT'
  | 'VERIFIED'
  | 'RETURN_LOAD'

/**
 * Budget compatibility gate.
 *
 * Budget is intentionally NOT part of the 100-point score. It is a commercial
 * gate: when the shipper's `maxPrice` is below the benchmark freight estimate
 * (minus `varianceTolerance`), the final score is capped at `scoreCap` and a
 * warning is emitted. Loads without a `maxPrice` always pass the gate.
 */
export interface BudgetGateConfig {
  /** Fraction of the benchmark estimate the budget may fall short by. Default 0.15 (15%). */
  varianceTolerance?: number
  /** Maximum score allowed when the budget does not fit. Default 65. */
  scoreCap?: number
}

export interface MatchScoringOptions {
  /** Explicit truck→pickup distance; overrides `truck.distanceKm` and coordinate derivation. */
  distanceKm?: number
  /**
   * Hard proximity ceiling (km). When set, the proximity factor treats anything
   * within this ceiling as "in radius" even if the truck's own serviceable radius
   * is smaller, and anything beyond it as "extended". Used by the API which also
   * filters candidates by this radius at query time.
   */
  maxProximityKm?: number
  /** Enable the budget gate. `true` uses defaults; pass a config to tune it. */
  budget?: boolean | BudgetGateConfig
}

export const MATCH_SCORE_WEIGHTS = {
  capacity: 35,
  bodyType: 25,
  proximity: 20,
  verification: 15,
  corridor: 5,
} as const

export const DEFAULT_MATCH_DISTANCE_KM = 15
export const DEFAULT_SERVICEABLE_RADIUS_KM = 50
export const DEFAULT_BUDGET_GATE: Required<BudgetGateConfig> = {
  varianceTolerance: 0.15,
  scoreCap: 65,
}

const MATCH_RATING_THRESHOLDS: Array<{ min: number; rating: MatchRating; tone: MatchTone }> = [
  { min: 85, rating: 'PERFECT', tone: 'success' },
  { min: 70, rating: 'STRONG', tone: 'primary' },
  { min: 50, rating: 'MODERATE', tone: 'warning' },
]

/** Maps a 0-100 score to a rating tier and presentation tone. */
export function rateMatchScore(score: number): { rating: MatchRating; tone: MatchTone } {
  for (const tier of MATCH_RATING_THRESHOLDS) {
    if (score >= tier.min) return { rating: tier.rating, tone: tier.tone }
  }
  return { rating: 'POOR', tone: 'danger' }
}

export interface BudgetFitResult {
  fit: boolean
  detail: string
  estimated: number
}

/**
 * Evaluates whether a shipper budget accommodates the benchmark freight estimate.
 * Uses the shared pricing engine so API and clients agree on the estimate.
 */
export function evaluateBudgetFit(
  loadMaxPrice: number | null | undefined,
  tonnage: number,
  truckType: string,
  distanceKm: number,
  config: BudgetGateConfig = {}
): BudgetFitResult {
  if (loadMaxPrice === null || loadMaxPrice === undefined || loadMaxPrice === ('' as any)) {
    return { fit: true, detail: 'No budget cap specified — open to market rate', estimated: 0 }
  }
  const maxPrice = toNumber(loadMaxPrice)
  const tolerance = config.varianceTolerance ?? DEFAULT_BUDGET_GATE.varianceTolerance
  const estimated = estimateFreightRate({
    distanceKm,
    tonnage,
    truckType: normalizeTruckType(truckType),
  }).recommendedTarget
  const fit = maxPrice >= estimated * (1 - tolerance)
  const detail = fit
    ? `Budget accommodates estimated freight (₹${formatINR(estimated)} ≤ ₹${formatINR(maxPrice)})`
    : `Budget below estimated freight (₹${formatINR(estimated)} > ₹${formatINR(maxPrice)})`
  return { fit, detail, estimated }
}

// ── Memoisation ──────────────────────────────────────────────────────────────
// Results are cached per (load, truck, options) triple. WeakMaps keep the cache
// from retaining objects that the caller has already dropped.
const matchScoreCache = new WeakMap<LoadItem, WeakMap<TruckItem, Map<string, MatchResult>>>()
const emptyRunCache = new WeakMap<LoadItem, number>()
const pickupDistanceCache = new WeakMap<LoadItem, Map<string, number>>()

function optionsCacheKey(options?: MatchScoringOptions): string {
  if (!options) return ''
  const budget =
    options.budget === undefined || options.budget === false
      ? '0'
      : options.budget === true
        ? '1'
        : `${options.budget.varianceTolerance ?? ''}/${options.budget.scoreCap ?? ''}`
  return `${options.distanceKm ?? ''}|${options.maxProximityKm ?? ''}|${budget}`
}

/**
 * Calculates a transparent, explainable match score between a Load and a Truck.
 * Max score breakdown:
 * - Capacity Fit: 35 pts
 * - Body Type Fit: 25 pts
 * - Proximity / Distance: 20 pts
 * - Transporter Verification: 15 pts
 * - Preferred Corridor / Return Load: 5 pts
 * Total: 100 pts
 *
 * Budget compatibility (optional) is a gate that caps the score; see {@link BudgetGateConfig}.
 */
export function calculateMatchScore(
  load: LoadItem,
  truck: TruckItem,
  options?: MatchScoringOptions
): MatchResult {
  const cacheKey = optionsCacheKey(options)
  let loadCache = matchScoreCache.get(load)
  if (!loadCache) {
    loadCache = new WeakMap<TruckItem, Map<string, MatchResult>>()
    matchScoreCache.set(load, loadCache)
  }
  let truckCache = loadCache.get(truck)
  if (!truckCache) {
    truckCache = new Map<string, MatchResult>()
    loadCache.set(truck, truckCache)
  }
  const cached = truckCache.get(cacheKey)
  if (cached) {
    return cached
  }

  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  const loadTonnage = toNumber(load.tonnageRequired)
  const truckTonnage = toNumber(truck.tonnageCapacity)

  // Determine distance via explicit option, explicit truck parameter, or lat/lng calculation
  let distanceKm: number | undefined =
    typeof options?.distanceKm === 'number'
      ? options.distanceKm
      : typeof truck.distanceKm === 'number'
        ? truck.distanceKm
        : undefined
  if (
    distanceKm === undefined &&
    truck.currentLat &&
    truck.currentLng &&
    load.loadingLat &&
    load.loadingLng
  ) {
    distanceKm = calculateGeoDistance(
      toNumber(truck.currentLat),
      toNumber(truck.currentLng),
      toNumber(load.loadingLat),
      toNumber(load.loadingLng)
    )
  }
  if (distanceKm === undefined) {
    distanceKm = DEFAULT_MATCH_DISTANCE_KM // Standard default proximity estimate
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
  const maxRadius = toNumber(truck.serviceableRadiusKm) || DEFAULT_SERVICEABLE_RADIUS_KM
  const maxProximityKm = options?.maxProximityKm
  let proximityValue = `${distanceKm.toFixed(1)} km away`
  let proximityDetail = ''

  if (distanceKm <= 10) {
    isProximityFit = true
    proximityScore = 20
    proximityValue = `${distanceKm.toFixed(1)} km (Immediate)`
    proximityDetail = `Immediate proximity (${distanceKm.toFixed(1)} km from loading hub)`
    reasons.push(proximityDetail)
  } else if (distanceKm <= maxRadius && (maxProximityKm === undefined || distanceKm <= maxProximityKm)) {
    isProximityFit = true
    proximityScore = Math.max(5, Math.round(20 - (distanceKm / maxRadius) * 12))
    proximityValue = `${distanceKm.toFixed(1)} km (In Radius)`
    proximityDetail = `Within service radius (${distanceKm.toFixed(1)} km away)`
    reasons.push(proximityDetail)
  } else if (maxProximityKm !== undefined && distanceKm <= maxProximityKm) {
    isProximityFit = true
    proximityScore = Math.max(5, Math.round(20 - (distanceKm / maxProximityKm) * 12))
    proximityValue = `${distanceKm.toFixed(1)} km (In Radius)`
    proximityDetail = `Within ${maxProximityKm}km proximity filter (${distanceKm.toFixed(1)} km away)`
    reasons.push(proximityDetail)
  } else if (maxProximityKm !== undefined) {
    proximityScore = Math.max(0, Math.round(10 - ((distanceKm - maxProximityKm) / 50) * 8))
    proximityValue = `${distanceKm.toFixed(1)} km (Extended)`
    proximityDetail = `Beyond ${maxProximityKm}km proximity filter (${distanceKm.toFixed(1)} km from pickup)`
    warnings.push(proximityDetail)
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
      unloadingText.includes(String(dest).toLowerCase())
    )

    const matchesOrigin = truck.preferredDestinations.some((dest) =>
      loadingText.includes(String(dest).toLowerCase())
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

  // 6. Budget gate (optional; not part of the 100 points)
  let isBudgetFit = true
  let budgetFactor: MatchFactorDetail | undefined
  const budgetConfig: Required<BudgetGateConfig> | undefined =
    options?.budget === true
      ? DEFAULT_BUDGET_GATE
      : options?.budget && typeof options.budget === 'object'
        ? { ...DEFAULT_BUDGET_GATE, ...options.budget }
        : undefined

  if (budgetConfig) {
    const budgetCheck = evaluateBudgetFit(load.maxPrice, loadTonnage, actType, distanceKm, budgetConfig)
    isBudgetFit = budgetCheck.fit
    if (isBudgetFit) reasons.push(budgetCheck.detail)
    else warnings.push(budgetCheck.detail)
    budgetFactor = {
      key: 'budget',
      label: 'Budget Compatibility',
      value: isBudgetFit ? 'Budget Compatible' : 'Budget Mismatch',
      fit: isBudgetFit,
      score: isBudgetFit ? 5 : 0,
      maxScore: 5,
      detail: budgetCheck.detail,
    }
  }

  // Normalize final score to 10-100 range
  score = Math.min(100, Math.max(10, Math.round(score)))
  // Apply budget penalty: cap the score when the budget does not fit
  if (budgetConfig && !isBudgetFit && score > budgetConfig.scoreCap) {
    score = budgetConfig.scoreCap
  }

  const { rating, tone } = rateMatchScore(score)

  const factors: MatchFactors = {
    capacity: {
      key: 'capacity',
      label: 'Capacity Fit',
      value: capacityValue,
      fit: isCapacityFit,
      score: capacityScore,
      maxScore: MATCH_SCORE_WEIGHTS.capacity,
      detail: capacityDetail,
    },
    bodyType: {
      key: 'bodyType',
      label: 'Body Type',
      value: bodyTypeValue,
      fit: isBodyTypeFit,
      score: bodyTypeScore,
      maxScore: MATCH_SCORE_WEIGHTS.bodyType,
      detail: bodyTypeDetail,
    },
    proximity: {
      key: 'proximity',
      label: 'Distance / Proximity',
      value: proximityValue,
      fit: isProximityFit,
      score: proximityScore,
      maxScore: MATCH_SCORE_WEIGHTS.proximity,
      detail: proximityDetail,
    },
    verification: {
      key: 'verification',
      label: 'Transporter Verification',
      value: verificationValue,
      fit: isVerified,
      score: verificationScore,
      maxScore: MATCH_SCORE_WEIGHTS.verification,
      detail: verificationDetail,
    },
    corridor: {
      key: 'corridor',
      label: 'Corridor / Return Load',
      value: corridorValue,
      fit: isPreferredCorridor || isReturnLoad,
      score: corridorScore,
      maxScore: MATCH_SCORE_WEIGHTS.corridor,
      detail: corridorDetail,
    },
  }
  if (budgetFactor) factors.budget = budgetFactor

  const result: MatchResult = {
    score,
    rating,
    tone,
    label: `${score}% Smart Match`,
    reasons,
    warnings,
    isCapacityFit,
    isBodyTypeFit,
    isProximityFit,
    isVerified,
    isPreferredCorridor,
    isReturnLoad,
    isBudgetFit,
    distanceKm,
    factors,
  }

  truckCache.set(cacheKey, result)
  return result
}

/**
 * Sorts an array of items by the user-selected Match Intelligence criteria.
 */
export function sortMarketplaceItems<
  T extends {
    match?: Pick<MatchResult, 'score' | 'isCapacityFit' | 'isReturnLoad' | 'isPreferredCorridor'>
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
  destinationLocation?: { lat: number; lng: number; label?: string },
  options?: MatchScoringOptions
): BackhaulOpportunity[] {
  const opportunities: BackhaulOpportunity[] = []

  for (const load of loads) {
    const match = calculateMatchScore(load, truck, options)

    // Calculate pickup distance from destination hub
    let pickupDistanceFromDestinationKm = DEFAULT_MATCH_DISTANCE_KM
    if (
      destinationLocation &&
      destinationLocation.lat &&
      destinationLocation.lng &&
      load.loadingLat &&
      load.loadingLng
    ) {
      const destKey = `${destinationLocation.lat}_${destinationLocation.lng}`
      let loadPickupCache = pickupDistanceCache.get(load)
      if (!loadPickupCache) {
        loadPickupCache = new Map<string, number>()
        pickupDistanceCache.set(load, loadPickupCache)
      }
      let cachedDistance = loadPickupCache.get(destKey)
      if (cachedDistance === undefined) {
        cachedDistance = calculateGeoDistance(
          destinationLocation.lat,
          destinationLocation.lng,
          load.loadingLat,
          load.loadingLng
        )
        loadPickupCache.set(destKey, cachedDistance)
      }
      pickupDistanceFromDestinationKm = cachedDistance
    } else if (typeof truck.distanceKm === 'number') {
      pickupDistanceFromDestinationKm = truck.distanceKm
    }

    // Potential empty-run reduction is the freight transit distance of the return load
    let potentialEmptyRunReductionKm = 300
    if (load.loadingLat && load.loadingLng && load.unloadingLat && load.unloadingLng) {
      let cachedEmptyRun = emptyRunCache.get(load)
      if (cachedEmptyRun === undefined) {
        cachedEmptyRun = calculateGeoDistance(
          load.loadingLat,
          load.loadingLng,
          load.unloadingLat,
          load.unloadingLng
        )
        emptyRunCache.set(load, cachedEmptyRun)
      }
      potentialEmptyRunReductionKm = cachedEmptyRun
    } else if (load.unloadingAddress && load.loadingAddress) {
      potentialEmptyRunReductionKm = 350
    }

    // Target estimated freight
    const estimatedFreight =
      Number(load.maxPrice) ||
      Math.round((2500 + potentialEmptyRunReductionKm * (Number(load.tonnageRequired) || 10) * 3.4) / 100) * 100

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
      ownerPhone: load.ownerPhone || null,
      ownerName: load.ownerName || null,
      isReturnLoad: true,
      disclaimer: 'Potential Return Load — Subject to shipper confirmation and pickup schedule.',
    })
  }

  // Rank opportunities by match score & empty-run reduction
  return opportunities.sort((a, b) => b.matchScore - a.matchScore)
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function formatINR(n: number): string {
  return n.toLocaleString('en-IN')
}
