import { calculateGeoDistance } from './pricingEngine'

describe('Pricing Engine — calculateGeoDistance', () => {
  it('should return 0 when starting and ending locations are identical', () => {
    const lat = 12.9715987
    const lon = 77.5945627
    const result = calculateGeoDistance(lat, lon, lat, lon)
    expect(result).toBe(0)
  })

  it('should correctly calculate a short-range distance (Majestic to Indiranagar, Bangalore)', () => {
    // Bangalore Majestic: 12.9756, 77.5728
    // Indiranagar: 12.9719, 77.6412
    const result = calculateGeoDistance(12.9756, 77.5728, 12.9719, 77.6412)
    expect(result).toBe(10)
  })

  it('should correctly calculate a long-range interstate distance (Delhi to Mumbai)', () => {
    // Delhi (Connaught Place): 28.6304, 77.2177
    // Mumbai (Gateway of India): 18.9220, 72.8347
    const result = calculateGeoDistance(28.6304, 77.2177, 18.9220, 72.8347)
    expect(result).toBe(1518)
  })

  it('should handle negative and southern/western hemisphere coordinates (Buenos Aires to Sydney)', () => {
    // Buenos Aires (Argentina): -34.6037, -58.3816
    // Sydney (Australia): -33.8688, 151.2093
    const result = calculateGeoDistance(-34.6037, -58.3816, -33.8688, 151.2093)
    expect(result).toBe(15341)
  })

  it('should calculate the maximum possible distance on Earth (Antipodes on equator)', () => {
    // Antipodes: (0, 0) and (0, 180) on the Equator
    const result = calculateGeoDistance(0, 0, 0, 180)
    expect(result).toBe(26020)
  })

  it('should be symmetric and return the same distance regardless of direction', () => {
    const lat1 = 28.6304
    const lon1 = 77.2177
    const lat2 = 18.9220
    const lon2 = 72.8347

    const forwardResult = calculateGeoDistance(lat1, lon1, lat2, lon2)
    const backwardResult = calculateGeoDistance(lat2, lon2, lat1, lon1)

    expect(forwardResult).toBe(backwardResult)
  })
})
