/**
 * LorryCarry Logistics Intelligence — Smart Matching Engine
 * Deterministic, explainable matching algorithm for truck-load pairing.
 */

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
  truckType: 'Open' | 'Container' | 'OpenBody'
  minLengthFt?: number
  minHeightFt?: number
  urgent?: boolean
  maxPrice?: number
  createdAt?: string
}

export interface TruckItem {
  id: string
  registrationNumber?: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  currentLat?: number
  currentLng?: number
  distanceKm?: number
  serviceableRadiusKm?: number
  preferredDestinations?: string[]
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected'
  ownerPhone?: string
  ownerName?: string
}

export interface MatchResult {
  score: number // 0 - 100
  rating: 'PERFECT' | 'STRONG' | 'MODERATE' | 'POOR'
  color: string // Tailwind color key
  reasons: string[]
  warnings: string[]
  isCapacityFit: boolean
  isBodyTypeFit: boolean
  isProximityFit: boolean
  isVerified: boolean
}

/**
 * Calculates a transparent, explainable match score between a Load and a Truck.
 */
export function calculateMatchScore(load: LoadItem, truck: TruckItem): MatchResult {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  const loadTonnage = Number(load.tonnageRequired) || 0
  const truckTonnage = Number(truck.tonnageCapacity) || 0
  const distanceKm = typeof truck.distanceKm === 'number' ? truck.distanceKm : 25

  // 1. Capacity Compatibility (Max 35 points)
  let isCapacityFit = false
  if (truckTonnage >= loadTonnage) {
    isCapacityFit = true
    const capacityRatio = loadTonnage / (truckTonnage || 1)
    if (capacityRatio >= 0.7) {
      // Optimal load-to-truck ratio (70% - 100% capacity utilization)
      score += 35
      reasons.push(`Optimal capacity match (${loadTonnage}T load in ${truckTonnage}T capacity lorry)`)
    } else {
      // Truck is oversized for this load but fits
      score += 25
      reasons.push(`Capacity fits with excess space (${truckTonnage}T capacity for ${loadTonnage}T load)`)
    }
  } else {
    // Truck undersized
    const deficit = loadTonnage - truckTonnage
    score += 5
    warnings.push(`Truck capacity is ${deficit.toFixed(1)}T under required tonnage`)
  }

  // 2. Body Type Compatibility (Max 25 points)
  let isBodyTypeFit = false
  if (truck.bodyType === load.truckType) {
    isBodyTypeFit = true
    score += 25
    reasons.push(`Exact body type match (${truck.bodyType})`)
  } else if (
    (load.truckType === 'Open' && truck.bodyType === 'OpenBody') ||
    (load.truckType === 'OpenBody' && truck.bodyType === 'Open')
  ) {
    isBodyTypeFit = true
    score += 18
    reasons.push(`Compatible open configuration (${truck.bodyType})`)
  } else {
    warnings.push(`Body type mismatch (Requires ${load.truckType}, Truck is ${truck.bodyType})`)
  }

  // 3. Proximity / Geo-Distance Fit (Max 20 points)
  let isProximityFit = false
  const maxRadius = truck.serviceableRadiusKm || 50
  if (distanceKm <= 10) {
    isProximityFit = true
    score += 20
    reasons.push(`Immediate proximity (${distanceKm.toFixed(1)} km from loading warehouse)`)
  } else if (distanceKm <= maxRadius) {
    isProximityFit = true
    const proximityScore = Math.max(5, Math.round(20 - (distanceKm / maxRadius) * 12))
    score += proximityScore
    reasons.push(`Within service radius (${distanceKm.toFixed(1)} km away)`)
  } else {
    score += 3
    warnings.push(`Beyond typical radius (${distanceKm.toFixed(1)} km from pickup)`)
  }

  // 4. Verification & Trust Status (Max 15 points)
  const isVerified = truck.verificationStatus === 'Verified'
  if (isVerified) {
    score += 15
    reasons.push('Verified transporter (RC & Vahan records checked)')
  } else {
    warnings.push('Transporter verification pending')
  }

  // 5. Preferred Corridor / Route Fit (Max 5 points)
  if (truck.preferredDestinations && Array.isArray(truck.preferredDestinations) && truck.preferredDestinations.length > 0) {
    const unloadingText = (load.unloadingAddress || '').toLowerCase()
    const matchesPreferred = truck.preferredDestinations.some(dest =>
      unloadingText.includes(dest.toLowerCase())
    )
    if (matchesPreferred) {
      score += 5
      reasons.push('Truck has designated this route as a preferred freight corridor')
    }
  }

  // Normalize final score to 0-100 range
  score = Math.min(100, Math.max(10, score))

  let rating: MatchResult['rating'] = 'POOR'
  let color = 'text-danger-600 dark:text-danger-400'

  if (score >= 85) {
    rating = 'PERFECT'
    color = 'text-success-600 dark:text-success-400'
  } else if (score >= 70) {
    rating = 'STRONG'
    color = 'text-primary-600 dark:text-primary-400'
  } else if (score >= 50) {
    rating = 'MODERATE'
    color = 'text-warning-600 dark:text-warning-400'
  }

  return {
    score,
    rating,
    color,
    reasons,
    warnings,
    isCapacityFit,
    isBodyTypeFit,
    isProximityFit,
    isVerified,
  }
}
