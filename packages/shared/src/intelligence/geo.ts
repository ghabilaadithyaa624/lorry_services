/**
 * LorryCarry Logistics Intelligence — Geo utilities
 * Pure, platform-agnostic helpers shared by API, web, admin and mobile.
 */

/** Earth radius in km used by the Haversine formula. */
export const EARTH_RADIUS_KM = 6371

/**
 * Road network factor: Indian highway routes typically range 1.25x - 1.35x
 * the straight-line (great-circle) distance.
 */
export const ROAD_NETWORK_FACTOR = 1.3

/**
 * Approximate road distance in km between two lat/lng pairs.
 * Haversine great-circle distance multiplied by the road network factor and
 * rounded to the nearest kilometre.
 */
export function calculateGeoDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightLineDistance = EARTH_RADIUS_KM * c
  return Math.round(straightLineDistance * ROAD_NETWORK_FACTOR)
}
