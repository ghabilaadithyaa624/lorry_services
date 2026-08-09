/**
 * LorryCarry Logistics Intelligence — Freight Rate Estimation Architecture
 * Transparent, rule-based pricing estimator grounded in Indian freight transport economics.
 */

export interface PricingInput {
  distanceKm?: number
  tonnage: number
  truckType: 'Open' | 'Container' | 'OpenBody'
  loadingLat?: number
  loadingLng?: number
  unloadingLat?: number
  unloadingLng?: number
}

export interface FreightEstimate {
  minEstimate: number
  recommendedTarget: number
  maxEstimate: number
  ratePerTonKm: number
  distanceKm: number
  baseHandlingCharge: number
  tonnage: number
  truckType: string
  confidence: 'HIGH' | 'MEDIUM' | 'BENCHMARK'
  isEstimated: true
  explanation: string
}

/**
 * Approximate Haversine distance in km between two lat/lng pairs
 */
export function calculateGeoDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightLineDistance = R * c
  // Road network factor: Indian highway routes typically range 1.25x - 1.35x straight-line distance
  return Math.round(straightLineDistance * 1.3)
}

/**
 * Calculates a transparent freight rate estimate for a given route and tonnage.
 */
export function estimateFreightRate(input: PricingInput): FreightEstimate {
  let distanceKm = input.distanceKm || 0

  if (!distanceKm && input.loadingLat && input.loadingLng && input.unloadingLat && input.unloadingLng) {
    distanceKm = calculateGeoDistance(
      input.loadingLat,
      input.loadingLng,
      input.unloadingLat,
      input.unloadingLng
    )
  }

  // Default fallback corridor distance if distance cannot be computed
  if (!distanceKm || distanceKm < 10) {
    distanceKm = 350
  }

  const tonnage = Math.max(1, Number(input.tonnage) || 5)

  // Standard Indian freight benchmark rates per ton-km by vehicle configuration:
  // Open Body: ₹3.20 - ₹3.60 / ton-km
  // Closed Container: ₹3.80 - ₹4.40 / ton-km
  // Heavy Trailer / OpenBody: ₹2.90 - ₹3.40 / ton-km
  let ratePerTonKm = 3.40
  let baseHandlingCharge = 2500

  if (input.truckType === 'Container') {
    ratePerTonKm = 4.10
    baseHandlingCharge = 3500
  } else if (input.truckType === 'OpenBody') {
    ratePerTonKm = 3.15
    baseHandlingCharge = 3000
  }

  // Long haul efficiency curve: routes > 800km enjoy scale economies
  if (distanceKm > 1000) {
    ratePerTonKm *= 0.88
  } else if (distanceKm > 500) {
    ratePerTonKm *= 0.94
  }

  const rawEstimatedCost = baseHandlingCharge + distanceKm * tonnage * ratePerTonKm

  // Round to nearest hundred rupees for clean commercial presentation
  const recommendedTarget = Math.round(rawEstimatedCost / 100) * 100
  const minEstimate = Math.round((rawEstimatedCost * 0.90) / 100) * 100
  const maxEstimate = Math.round((rawEstimatedCost * 1.15) / 100) * 100

  const confidence: FreightEstimate['confidence'] =
    input.distanceKm ? 'HIGH' : input.loadingLat ? 'MEDIUM' : 'BENCHMARK'

  const explanation = `Estimate derived from ₹${ratePerTonKm.toFixed(2)}/ton-km base freight for ${tonnage}T ${input.truckType} across ${distanceKm} km transit with ₹${baseHandlingCharge.toLocaleString('en-IN')} loading/unloading buffer.`

  return {
    minEstimate,
    recommendedTarget,
    maxEstimate,
    ratePerTonKm,
    distanceKm,
    baseHandlingCharge,
    tonnage,
    truckType: input.truckType,
    confidence,
    isEstimated: true,
    explanation,
  }
}
