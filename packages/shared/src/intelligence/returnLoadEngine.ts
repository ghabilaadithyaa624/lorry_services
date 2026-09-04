/**
 * LorryCarry Logistics Intelligence — Return Load (Backhaul) Ranking Engine
 *
 * `matchingEngine.evaluateBackhaulOpportunities()` answers *which* open loads
 * could become a return haul for a truck. This module answers *in which order*
 * a driver should be shown them, using a deterministic, explainable 100-point
 * ranking composed of the commercial factors a transporter actually cares about:
 *
 * | Factor              | Weight | Meaning                                                   |
 * | :------------------ | -----: | :-------------------------------------------------------- |
 * | Match score         |     55 | The shared 100-point truck↔load compatibility score        |
 * | Pickup proximity    |     15 | Deadhead km from the drop-off hub to the return pickup     |
 * | Payload utilisation |     12 | How much of the lorry's tonnage the return load consumes   |
 * | Body type           |      6 | Exact body match > compatible open configuration > mismatch|
 * | Rate / budget       |      7 | Offered freight vs the shared benchmark estimate           |
 * | Preferred corridor  |      5 | Load runs along the truck's declared home corridor         |
 *
 * Pure module: no DOM, React, Prisma or Node-only APIs. The API ranks server
 * side and the web/mobile clients can rank the same way for optimistic UI.
 */

import type { BackhaulOpportunity, TruckItem } from './matchingEngine'
import { estimateFreightRate, normalizeTruckType } from './pricingEngine'

export const RETURN_LOAD_RANK_WEIGHTS = {
  matchScore: 55,
  pickupProximity: 15,
  payload: 12,
  bodyType: 6,
  rate: 7,
  corridor: 5,
} as const

export type ReturnLoadRankFactorKey = keyof typeof RETURN_LOAD_RANK_WEIGHTS

/** Default discovery radius (km) around the drop-off hub for return freight. */
export const DEFAULT_RETURN_LOAD_RADIUS_KM = 150

export interface ReturnLoadRankFactor {
  key: ReturnLoadRankFactorKey
  label: string
  score: number
  maxScore: number
  value: string
  detail: string
}

export interface ReturnLoadRankingOptions {
  /** Radius the candidates were discovered within; normalises the proximity factor. */
  radiusKm?: number
  /**
   * Tonnage capacity of the truck. Defaults to `truck.tonnageCapacity`; pass it
   * explicitly when the caller already normalised Decimal columns.
   */
  tonnageCapacity?: number
}

/**
 * A backhaul opportunity enriched with its deterministic ranking breakdown.
 * `rank` is 1-based and assigned after sorting.
 */
export interface RankedReturnLoad extends BackhaulOpportunity {
  rank: number
  rankScore: number
  rankFactors: ReturnLoadRankFactor[]
  payloadUtilizationPct: number
  bodyTypeCompatible: boolean
  bodyTypeExact: boolean
  budgetFit: boolean
  preferredCorridor: boolean
  /** Shared pricing-engine benchmark for the return leg, used by the rate factor. */
  benchmarkFreight: number
  /** Offered freight vs benchmark, e.g. `1.08` = 8% above benchmark. */
  rateVsBenchmark: number
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Scores a single backhaul opportunity on the 100-point return-load scale.
 * Deterministic: the same inputs always yield the same breakdown.
 */
export function scoreReturnLoadOpportunity(
  opportunity: BackhaulOpportunity,
  truck: TruckItem,
  options: ReturnLoadRankingOptions = {}
): Omit<RankedReturnLoad, 'rank'> {
  const radiusKm = Math.max(1, toNumber(options.radiusKm) || DEFAULT_RETURN_LOAD_RADIUS_KM)
  const capacity = toNumber(options.tonnageCapacity ?? truck.tonnageCapacity)
  const tonnage = toNumber(opportunity.tonnageRequired)
  const match = opportunity.matchResult
  const factors: ReturnLoadRankFactor[] = []

  // 1. Shared match score (55) — capacity, body type, proximity, verification, corridor.
  const matchComponent = (clamp(toNumber(match?.score), 0, 100) / 100) * RETURN_LOAD_RANK_WEIGHTS.matchScore
  factors.push({
    key: 'matchScore',
    label: 'Match score',
    score: round1(matchComponent),
    maxScore: RETURN_LOAD_RANK_WEIGHTS.matchScore,
    value: `${Math.round(toNumber(match?.score))}/100 ${match?.rating ?? ''}`.trim(),
    detail: 'Shared truck-load compatibility score (capacity, body, proximity, verification, corridor)',
  })

  // 2. Pickup proximity (15) — deadhead km from the drop-off hub to the pickup.
  const pickupKm = Math.max(0, toNumber(opportunity.pickupDistanceFromDestinationKm))
  const proximityRatio = clamp(1 - pickupKm / radiusKm, 0, 1)
  const proximityComponent = proximityRatio * RETURN_LOAD_RANK_WEIGHTS.pickupProximity
  factors.push({
    key: 'pickupProximity',
    label: 'Pickup proximity',
    score: round1(proximityComponent),
    maxScore: RETURN_LOAD_RANK_WEIGHTS.pickupProximity,
    value: `${round1(pickupKm)} km deadhead`,
    detail: `Empty running from the drop-off hub to the return pickup, normalised over the ${radiusKm} km discovery radius`,
  })

  // 3. Payload utilisation (12) — how full the lorry runs on the return leg.
  const utilisation = capacity > 0 ? tonnage / capacity : 0
  const payloadCompatible = capacity > 0 && tonnage > 0 && tonnage <= capacity
  const payloadComponent = payloadCompatible
    ? clamp(utilisation, 0, 1) * RETURN_LOAD_RANK_WEIGHTS.payload
    : 0
  factors.push({
    key: 'payload',
    label: 'Payload utilisation',
    score: round1(payloadComponent),
    maxScore: RETURN_LOAD_RANK_WEIGHTS.payload,
    value: payloadCompatible ? `${Math.round(utilisation * 100)}% of ${round1(capacity)}T` : 'Incompatible payload',
    detail: payloadCompatible
      ? `Return load consumes ${round1(tonnage)}T of the ${round1(capacity)}T available payload`
      : `Return load tonnage (${round1(tonnage)}T) does not fit the ${round1(capacity)}T lorry`,
  })

  // 4. Body type (6) — exact configuration beats a compatible open trailer.
  const requiredType = String(opportunity.truckType || 'Open')
  const actualType = String(truck.bodyType || 'Open')
  const bodyTypeExact = requiredType === actualType
  const bodyTypeCompatible = bodyTypeExact || Boolean(match?.isBodyTypeFit)
  const bodyTypeComponent = bodyTypeExact
    ? RETURN_LOAD_RANK_WEIGHTS.bodyType
    : bodyTypeCompatible
      ? RETURN_LOAD_RANK_WEIGHTS.bodyType * 0.6
      : 0
  factors.push({
    key: 'bodyType',
    label: 'Body type',
    score: round1(bodyTypeComponent),
    maxScore: RETURN_LOAD_RANK_WEIGHTS.bodyType,
    value: bodyTypeExact ? `Exact (${actualType})` : bodyTypeCompatible ? `Compatible (${actualType})` : `Mismatch (${actualType} vs ${requiredType})`,
    detail: `Shipper requires ${requiredType}; lorry is ${actualType}`,
  })

  // 5. Rate vs benchmark (7) — offered freight against the shared pricing engine.
  const benchmark = estimateFreightRate({
    distanceKm: Math.max(10, toNumber(opportunity.potentialEmptyRunReductionKm)),
    tonnage: Math.max(1, tonnage),
    truckType: normalizeTruckType(requiredType),
  }).recommendedTarget
  const offered = toNumber(opportunity.estimatedFreight)
  const rateVsBenchmark = benchmark > 0 ? offered / benchmark : 0
  const budgetFit = match?.isBudgetFit !== false
  // 0.8x benchmark → 0 pts, 1.1x benchmark and above → full marks.
  const rateRatioScore = clamp((rateVsBenchmark - 0.8) / 0.3, 0, 1)
  const rateComponent = budgetFit ? rateRatioScore * RETURN_LOAD_RANK_WEIGHTS.rate : 0
  factors.push({
    key: 'rate',
    label: 'Rate vs benchmark',
    score: round1(rateComponent),
    maxScore: RETURN_LOAD_RANK_WEIGHTS.rate,
    value: benchmark > 0 ? `${Math.round(rateVsBenchmark * 100)}% of benchmark` : 'No benchmark',
    detail: budgetFit
      ? `Indicative freight ₹${Math.round(offered)} against ₹${Math.round(benchmark)} benchmark for the return leg`
      : 'Shipper budget is below the benchmark freight estimate for this lane',
  })

  // 6. Preferred corridor (5) — the load runs the truck's declared home lane.
  const preferredCorridor = Boolean(match?.isPreferredCorridor)
  const corridorComponent = preferredCorridor ? RETURN_LOAD_RANK_WEIGHTS.corridor : 0
  factors.push({
    key: 'corridor',
    label: 'Preferred corridor',
    score: corridorComponent,
    maxScore: RETURN_LOAD_RANK_WEIGHTS.corridor,
    value: preferredCorridor ? 'On preferred corridor' : 'Off preferred corridor',
    detail: preferredCorridor
      ? 'Delivers into a destination the operator declared as a preferred corridor'
      : 'Destination is outside the declared preferred corridors',
  })

  const rankScore = round1(factors.reduce((sum, factor) => sum + factor.score, 0))

  return {
    ...opportunity,
    rankScore,
    rankFactors: factors,
    payloadUtilizationPct: capacity > 0 ? Math.round(clamp(utilisation, 0, 10) * 100) : 0,
    bodyTypeCompatible,
    bodyTypeExact,
    budgetFit,
    preferredCorridor,
    benchmarkFreight: benchmark,
    rateVsBenchmark: round1(rateVsBenchmark * 100) / 100,
  }
}

/**
 * Ranks return-load opportunities for a truck.
 *
 * Ordering is fully deterministic: descending `rankScore`, then the shorter
 * deadhead to pickup, then the higher match score, then `loadId` so identical
 * candidates never shuffle between requests (important for paginated UIs).
 */
export function rankReturnLoadOpportunities(
  opportunities: BackhaulOpportunity[],
  truck: TruckItem,
  options: ReturnLoadRankingOptions = {}
): RankedReturnLoad[] {
  return opportunities
    .map((opportunity) => scoreReturnLoadOpportunity(opportunity, truck, options))
    .sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore
      const distanceDelta =
        toNumber(a.pickupDistanceFromDestinationKm) - toNumber(b.pickupDistanceFromDestinationKm)
      if (distanceDelta !== 0) return distanceDelta
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      return String(a.loadId).localeCompare(String(b.loadId))
    })
    .map((opportunity, index) => ({ ...opportunity, rank: index + 1 }))
}
