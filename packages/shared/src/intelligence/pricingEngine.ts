/**
 * LorryCarry Logistics Intelligence — Freight Rate Estimation Architecture
 * Transparent, rule-based pricing estimator grounded in Indian freight transport economics.
 * Pure and platform-agnostic: shared by API, web, admin and mobile.
 */

import { calculateGeoDistance } from './geo'

export interface PricingInput {
  distanceKm?: number
  tonnage: number
  truckType: 'Open' | 'Container' | 'OpenBody'
  loadingLat?: number
  loadingLng?: number
  unloadingLat?: number
  unloadingLng?: number
}

export interface LongHaulAdjustment {
  applied: boolean
  discountPercent: number
  label: string
  description: string
}

export interface TruckTypeAdjustment {
  baseRatePerTonKm: number
  handlingFee: number
  description: string
}

export interface PriceSensitivityPoint {
  tonnage: number
  cost: number
  label: string
}

export interface PriceSensitivity {
  minus10Percent: PriceSensitivityPoint
  current: PriceSensitivityPoint
  plus10Percent: PriceSensitivityPoint
  costPerAdditionalTon: number
}

export interface RouteComparisonOption {
  type: string
  label: string
  distanceKm: number
  ratePerTonKm: number
  handlingFee: number
  recommendedTarget: number
  isCurrent: boolean
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
  isBenchmarkBased: boolean
  disclaimer: string
  explanation: string
  longHaulAdjustment: LongHaulAdjustment
  truckTypeAdjustment: TruckTypeAdjustment
  priceSensitivity: PriceSensitivity
  routeComparison: RouteComparisonOption[]
}

export type PricingTruckType = PricingInput['truckType']

/**
 * Normalises free-form truck/body type labels coming from the DB or user input
 * ("Open body", "open_body", "container") into the canonical pricing types.
 * Unknown values fall back to 'Open' (base benchmark).
 */
export function normalizeTruckType(value: string | null | undefined): PricingTruckType {
  const key = String(value ?? '').toLowerCase().replace(/[\s_-]/g, '')
  if (key === 'container') return 'Container'
  if (key === 'openbody') return 'OpenBody'
  return 'Open'
}

/**
 * Calculates an explainable indicative benchmark freight rate estimate for a given route and tonnage.
 * Preserves core pricing benchmark formulas while providing transparent economic factors.
 */
export function estimateFreightRate(input: PricingInput): FreightEstimate {
  let distanceKm = input.distanceKm || 0

  // Coordinates may legitimately be zero (for example, a point on the equator
  // or prime meridian), so use null/undefined checks rather than truthiness.
  if (
    !distanceKm &&
    input.loadingLat != null &&
    input.loadingLng != null &&
    input.unloadingLat != null &&
    input.unloadingLng != null
  ) {
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
  // Open Body: ₹3.40 / ton-km, Handling ₹2,500
  // Closed Container: ₹4.10 / ton-km, Handling ₹3,500
  // Heavy Trailer / OpenBody: ₹3.15 / ton-km, Handling ₹3,000
  let baseRatePerTonKm = 3.40
  let baseHandlingCharge = 2500
  let truckTypeDesc = 'Standard Open Body Lorry (Base freight benchmark)'

  if (input.truckType === 'Container') {
    baseRatePerTonKm = 4.10
    baseHandlingCharge = 3500
    truckTypeDesc = 'Closed Weatherproof Container (+20% protection & security premium)'
  } else if (input.truckType === 'OpenBody') {
    baseRatePerTonKm = 3.15
    baseHandlingCharge = 3000
    truckTypeDesc = 'Heavy Open Body Flatbed Trailer (Bulk volume discount)'
  }

  // Long haul efficiency curve: routes > 800km / 500km enjoy scale economies
  let ratePerTonKm = baseRatePerTonKm
  let longHaulApplied = false
  let discountPercent = 0
  let longHaulLabel = 'Standard Corridor Rate (<500 km)'
  let longHaulDesc = 'Short to medium regional transit corridor.'

  if (distanceKm > 1000) {
    ratePerTonKm = baseRatePerTonKm * 0.88
    longHaulApplied = true
    discountPercent = 12
    longHaulLabel = '12% Long-Haul Scale Discount (>1000 km)'
    longHaulDesc = 'Long-haul interstate routes (>1000 km) achieve fuel & operational cost economies.'
  } else if (distanceKm > 500) {
    ratePerTonKm = baseRatePerTonKm * 0.94
    longHaulApplied = true
    discountPercent = 6
    longHaulLabel = '6% Regional Long-Haul Discount (>500 km)'
    longHaulDesc = 'Regional highway transit (>500 km) reflects distance scale efficiencies.'
  }

  const rawEstimatedCost = baseHandlingCharge + distanceKm * tonnage * ratePerTonKm

  // Round to nearest hundred rupees for clean commercial presentation
  const recommendedTarget = Math.round(rawEstimatedCost / 100) * 100
  const minEstimate = Math.round((rawEstimatedCost * 0.90) / 100) * 100
  const maxEstimate = Math.round((rawEstimatedCost * 1.15) / 100) * 100

  const confidence: FreightEstimate['confidence'] =
    input.distanceKm ? 'HIGH' : input.loadingLat != null && input.loadingLng != null ? 'MEDIUM' : 'BENCHMARK'

  const isBenchmarkBased = true
  const disclaimer = 'Indicative benchmark estimate. Rule-based model grounded in Indian freight economics — not a guaranteed spot market quote.'

  const explanation = `Indicative benchmark estimate derived from ₹${ratePerTonKm.toFixed(2)}/ton-km rate for ${tonnage}T ${input.truckType} across ${distanceKm} km transit with ₹${baseHandlingCharge.toLocaleString('en-IN')} loading/unloading buffer.`

  // 1. Price Sensitivity Analysis (Tonnage variations ±10%)
  const tonnageMinus = Math.max(0.5, Math.round(tonnage * 0.9 * 10) / 10)
  const tonnagePlus = Math.round(tonnage * 1.1 * 10) / 10
  const rawMinus = baseHandlingCharge + distanceKm * tonnageMinus * ratePerTonKm
  const rawPlus = baseHandlingCharge + distanceKm * tonnagePlus * ratePerTonKm

  const costMinus = Math.round(rawMinus / 100) * 100
  const costPlus = Math.round(rawPlus / 100) * 100
  const costPerAdditionalTon = Math.round(distanceKm * ratePerTonKm)

  const priceSensitivity: PriceSensitivity = {
    minus10Percent: {
      tonnage: tonnageMinus,
      cost: costMinus,
      label: `-10% Payload (${tonnageMinus}T)`,
    },
    current: {
      tonnage,
      cost: recommendedTarget,
      label: `Current (${tonnage}T)`,
    },
    plus10Percent: {
      tonnage: tonnagePlus,
      cost: costPlus,
      label: `+10% Payload (${tonnagePlus}T)`,
    },
    costPerAdditionalTon,
  }

  // 2. Route & Vehicle Configuration Comparison
  const calcRouteCost = (baseRate: number, handling: number, dist: number) => {
    let rate = baseRate
    if (dist > 1000) rate *= 0.88
    else if (dist > 500) rate *= 0.94
    return Math.round((handling + dist * tonnage * rate) / 100) * 100
  }

  const altDistanceKm = Math.round(distanceKm * 1.15) // Bypass route (+15% distance)

  const routeComparison: RouteComparisonOption[] = [
    {
      type: 'Open',
      label: 'Open Body Truck',
      distanceKm,
      ratePerTonKm: Number((3.40 * (distanceKm > 1000 ? 0.88 : distanceKm > 500 ? 0.94 : 1)).toFixed(2)),
      handlingFee: 2500,
      recommendedTarget: calcRouteCost(3.40, 2500, distanceKm),
      isCurrent: input.truckType === 'Open',
    },
    {
      type: 'Container',
      label: 'Closed Container',
      distanceKm,
      ratePerTonKm: Number((4.10 * (distanceKm > 1000 ? 0.88 : distanceKm > 500 ? 0.94 : 1)).toFixed(2)),
      handlingFee: 3500,
      recommendedTarget: calcRouteCost(4.10, 3500, distanceKm),
      isCurrent: input.truckType === 'Container',
    },
    {
      type: 'OpenBody',
      label: 'Open Flatbed Trailer',
      distanceKm,
      ratePerTonKm: Number((3.15 * (distanceKm > 1000 ? 0.88 : distanceKm > 500 ? 0.94 : 1)).toFixed(2)),
      handlingFee: 3000,
      recommendedTarget: calcRouteCost(3.15, 3000, distanceKm),
      isCurrent: input.truckType === 'OpenBody',
    },
    {
      type: `${input.truckType}-bypass`,
      label: `Bypass Route (${altDistanceKm} km)`,
      distanceKm: altDistanceKm,
      ratePerTonKm: Number((baseRatePerTonKm * (altDistanceKm > 1000 ? 0.88 : altDistanceKm > 500 ? 0.94 : 1)).toFixed(2)),
      handlingFee: baseHandlingCharge,
      recommendedTarget: calcRouteCost(baseRatePerTonKm, baseHandlingCharge, altDistanceKm),
      isCurrent: false,
    },
  ]

  return {
    minEstimate,
    recommendedTarget,
    maxEstimate,
    ratePerTonKm: Number(ratePerTonKm.toFixed(2)),
    distanceKm,
    baseHandlingCharge,
    tonnage,
    truckType: input.truckType,
    confidence,
    isEstimated: true,
    isBenchmarkBased,
    disclaimer,
    explanation,
    longHaulAdjustment: {
      applied: longHaulApplied,
      discountPercent,
      label: longHaulLabel,
      description: longHaulDesc,
    },
    truckTypeAdjustment: {
      baseRatePerTonKm,
      handlingFee: baseHandlingCharge,
      description: truckTypeDesc,
    },
    priceSensitivity,
    routeComparison,
  }
}
