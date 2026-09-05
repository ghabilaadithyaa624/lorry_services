import { calculateMatchScore } from '@lorrycarry/shared'
import type { ReturnLoadsResponse } from '@/lib/api'

/** Test-only API response; production components never import this fixture. */
export function returnLoadsFixture(overrides: Partial<ReturnLoadsResponse> = {}): ReturnLoadsResponse {
  const matchResult = calculateMatchScore(
    { id: 'load-1', tonnageRequired: 18, truckType: 'Open' },
    { id: 'truck-1', bodyType: 'Open', tonnageCapacity: 20, verificationStatus: 'Verified' },
    { distanceKm: 8 },
  )
  return {
    truck: {
      id: 'truck-1', registrationNumber: 'KA01AB1234', bodyType: 'Open', tonnageCapacity: 20,
      verificationStatus: 'Verified', currentLat: 12.9756, currentLng: 77.5728, preferredDestinations: ['Chennai'],
    },
    anchor: { lat: 12.9756, lng: 77.5728, label: 'Bengaluru hub', source: 'truck_current_location', detail: 'Using GPS' },
    radiusKm: 50, candidatesEvaluated: 1, totalRanked: 1, contactUnlocked: false,
    generatedAt: '2026-09-04T12:00:00.000Z', disclaimer: 'Indicative opportunities, subject to confirmation.',
    opportunities: [{
      loadId: 'load-1', rank: 1, rankScore: 94.5, rankFactors: [{
        key: 'pickupProximity', label: 'Pickup proximity', score: 12.6, maxScore: 15, value: '8 km', detail: 'From hub',
      }],
      matchScore: matchResult.score, matchRating: matchResult.rating, matchResult,
      routeLabel: 'Bengaluru → Chennai', loadingAddress: 'Bengaluru', unloadingAddress: 'Chennai',
      tonnageRequired: 18, truckType: 'Open', estimatedFreight: 18000, benchmarkFreight: 18000, rateVsBenchmark: 1,
      pickupDistanceFromDestinationKm: 8, potentialEmptyRunReductionKm: 350, payloadUtilizationPct: 90,
      payloadCompatible: true, bodyTypeCompatible: true, bodyTypeExact: true, budgetFit: true, preferredCorridor: true,
      urgent: false, postedAt: null, isReturnLoad: true,
      contact: { locked: true, name: null, phone: null }, disclaimer: 'Subject to shipper confirmation.',
    }],
    ...overrides,
  }
}
