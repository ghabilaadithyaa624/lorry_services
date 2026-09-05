import { matchesApi, trucksApi } from '@/lib/api'
import type { AssistantResponse, StructuredIntent } from './aiAssistantEngine'

/** Never fall back to sample trucks, client scoring or a less restrictive contact API. */
export async function fetchReturnLoadsAnswer(intent: StructuredIntent): Promise<AssistantResponse> {
  const emptyAnswer = (message: string): AssistantResponse => ({ intent, message, returnLoads: [], isRealDataOnly: true })
  try {
    const { data } = await trucksApi.getMyTrucks()
    const trucks: Array<{ id: string; registrationNumber: string; verificationStatus: string }> = Array.isArray(data) ? data : []
    const primaryTruck = trucks.find((truck) => truck.verificationStatus === 'Verified') || trucks[0]
    if (!primaryTruck?.id) {
      return emptyAnswer('Register a truck with its current location to discover return loads for your vehicle.')
    }

    const { data: result } = await matchesApi.getReturnLoads(primaryTruck.id, { limit: 5 })
    if (result.anchor.source === 'unresolved') return emptyAnswer(result.anchor.detail)
    const hub = result.anchor.label
    const locationNote = ' Using the recorded drop-off/GPS hub; a city mentioned in your question is not automatically geocoded.'
    if (result.opportunities.length === 0) {
      return emptyAnswer(`No eligible open return loads were found within ${result.radiusKm} km of ${hub} for ${primaryTruck.registrationNumber}.${locationNote}`)
    }

    return {
      intent,
      message: `Found ${result.opportunities.length} ranked return load(s) within ${result.radiusKm} km of ${hub} for ${primaryTruck.registrationNumber}. Top opportunity ranks ${result.opportunities[0].rankScore}/100 for pickup distance, match score, payload, body type, budget and corridor.${result.contactUnlocked ? '' : ' An active subscription is required to reveal shipper contacts.'}${locationNote}`,
      returnLoads: result.opportunities,
      isRealDataOnly: true,
    }
  } catch {
    return emptyAnswer('Return-load discovery is unavailable. Sign in with your truck account and try again. No local or sample recommendations have been substituted.')
  }
}
