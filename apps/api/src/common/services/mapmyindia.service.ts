import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
  pincode: string
  city: string
  state: string
  district?: string
  eLoc?: string
}

export interface PlaceSuggestion {
  placeId: string
  address: string
  pincode?: string
  lat?: number
  lng?: number
  city?: string
  state?: string
}

export interface RoadDistanceResult {
  roadDistanceKm: number
  durationMinutes: number
  source: 'mappls_road_network' | 'straight_line_estimate'
}

/**
 * Production-Grade MapmyIndia (Mappls) Service
 * - Connects to official Mappls Advanced Maps & Atlas APIs
 * - Validates coordinate boundaries and response schemas
 * - Eliminates silent production fallbacks to arbitrary cities (Pune/Bangalore/Mumbai)
 * - Separates Straight-Line (Haversine) and Road-Network distance models
 * - Sanitizes all logs to prevent credential leakage
 */
@Injectable()
export class MapmyIndiaService {
  private readonly logger = new Logger(MapmyIndiaService.name)
  private readonly primaryBaseUrl = 'https://apis.mappls.com/advancedmaps/v1'
  private readonly fallbackBaseUrl = 'https://apis.mapmyindia.com/advancedmaps/v1'
  private readonly atlasBaseUrl = 'https://atlas.mappls.com/api/places'
  private readonly requestTimeoutMs = 5000

  constructor(private config: ConfigService) {}

  /**
   * Helper to retrieve configured Mappls API key safely
   */
  private getApiKey(): string | null {
    const key = this.config.get<string>('MAPMYINDIA_API_KEY') || this.config.get<string>('MAPPLS_API_KEY')
    return key && key.trim().length > 0 ? key.trim() : null
  }

  /**
   * Sanitizes URLs and error messages to ensure API keys are never leaked to logs
   */
  private sanitizeError(error: any, apiKey: string | null): string {
    if (!error) return 'Unknown error'
    let msg = error.message || String(error)
    if (apiKey && apiKey.length > 5) {
      msg = msg.split(apiKey).join('[REDACTED_API_KEY]')
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const dataMsg = error.response?.data?.error_description || error.response?.data?.message || error.response?.data?.error
      return `HTTP ${status || 'Network'}: ${dataMsg || msg}`
    }
    return msg
  }

  /**
   * Executes hedged HTTP GET requests across multiple URLs.
   * - Starts by firing the request to the primary URL.
   * - If the primary request does not resolve within `hedgingDelayMs` (e.g., 1000ms), a speculative request to the fallback URL is sent.
   * - If the primary request fails before the delay, the fallback request is triggered immediately.
   * - The first successful response wins and aborts any outstanding/pending requests using AbortControllers.
   * - If all requests fail or timeout, throws/returns appropriate errors/results.
   */
  private async executeHedgedGet(
    endpoint: string,
    params: Record<string, any>,
    apiKey: string
  ): Promise<any> {
    const urls = [
      { baseUrl: this.primaryBaseUrl, isPrimary: true },
      { baseUrl: this.fallbackBaseUrl, isPrimary: false }
    ]

    const controllers = urls.map(() => new AbortController())
    const hedgingDelayMs = 1000

    return new Promise((resolve, reject) => {
      let resolved = false
      let completedCount = 0
      let fallbackStarted = false
      let timer: any = null
      const errors: any[] = []

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        controllers.forEach(controller => {
          try {
            controller.abort()
          } catch {
            // ignore abort failures
          }
        })
      }

      const runRequest = async (index: number) => {
        const item = urls[index]
        const controller = controllers[index]
        const requestUrl = `${item.baseUrl}/${apiKey}/${endpoint}`

        try {
          const response = await axios.get(requestUrl, {
            params,
            timeout: this.requestTimeoutMs,
            headers: {
              'User-Agent': 'LorryCarry-Logistics-Platform/1.0',
            },
            signal: controller.signal
          })

          if (!resolved) {
            resolved = true
            cleanup()
            resolve(response)
          }
        } catch (err: any) {
          if (axios.isCancel(err) || err.name === 'AbortError' || err.message === 'canceled') {
            // Ignore aborted requests
            return
          }

          const sanitized = this.sanitizeError(err, apiKey)
          this.logger.warn(`Mappls request attempt failed on ${item.baseUrl}: ${sanitized}`)

          errors[index] = err
          completedCount++

          // If primary request failed and fallback has not started yet, trigger fallback immediately
          if (index === 0 && !resolved && !fallbackStarted) {
            fallbackStarted = true
            if (timer) {
              clearTimeout(timer)
              timer = null
            }
            runRequest(1)
          }

          // If all attempts failed, reject with the primary request error
          if (completedCount === urls.length && !resolved) {
            resolved = true
            cleanup()
            reject(errors[0] || err)
          }
        }
      }

      // Start primary request
      runRequest(0)

      // Start fallback speculatively if primary takes too long
      timer = setTimeout(() => {
        if (!resolved && !fallbackStarted) {
          fallbackStarted = true
          runRequest(1)
        }
      }, hedgingDelayMs)
    })
  }

  /**
   * Geocode an address to verified geographic coordinates
   * Production rule: Returns null on failure. NEVER returns fake/arbitrary city coordinates.
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address || typeof address !== 'string' || address.trim().length < 2) {
      this.logger.warn('Mappls geocode rejected: address is empty or too short')
      return null
    }

    const apiKey = this.getApiKey()
    const cleanAddress = address.trim()

    if (!apiKey) {
      this.logger.warn('Mappls geocode aborted: MAPMYINDIA_API_KEY is not configured')
      return this.handleDevFallback(cleanAddress, 'API key missing')
    }

    try {
      const response = await this.executeHedgedGet('geo_code', { address: cleanAddress }, apiKey)
      const data = response.data
      const results = data?.results || (Array.isArray(data?.copResults) ? data.copResults : null)

      if (!results || results.length === 0) {
        this.logger.debug(`Mappls returned zero geocoding results for query`)
        return this.handleDevFallback(cleanAddress, 'No results found')
      }

      const result = results[0]
      const lat = parseFloat(result.lat ?? result.latitude)
      const lng = parseFloat(result.lng ?? result.longitude)

      // Strict validation: Coordinates must be valid numbers within realistic Indian bounding box
      // India bounding box approx: Lat 6.0 to 38.0, Lng 68.0 to 98.0
      if (isNaN(lat) || isNaN(lng) || lat < 6.0 || lat > 38.0 || lng < 68.0 || lng > 98.0) {
        this.logger.warn(`Mappls returned out-of-bounds coordinates (${lat}, ${lng}) for query`)
        return this.handleDevFallback(cleanAddress, 'Invalid coordinates returned')
      }

      return {
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
        formattedAddress: result.formatted_address || result.formattedAddress || cleanAddress,
        pincode: result.pincode || result.pinCode || this.extractPincode(cleanAddress),
        city: result.city || result.district || '',
        state: result.state || '',
        district: result.district || result.subDistrict || '',
        eLoc: result.eLoc || result.placeId,
      }
    } catch (err: any) {
      // Try both primary Mappls API and legacy MapmyIndia endpoints concurrently to improve response time
      const baseUrls = [this.primaryBaseUrl, this.fallbackBaseUrl]

      const requests = baseUrls.map(async (baseUrl) => {
        try {
          const response = await axios.get(
            `${baseUrl}/${apiKey}/geo_code`,
            {
              params: { address: cleanAddress },
              timeout: this.requestTimeoutMs,
              headers: {
                'User-Agent': 'LorryCarry-Logistics-Platform/1.0',
              },
            }
          )

          const data = response.data
          const results = data?.results || (Array.isArray(data?.copResults) ? data.copResults : null)

          if (!results || results.length === 0) {
            throw new Error('No results found')
          }

          const result = results[0]
          const lat = parseFloat(result.lat ?? result.latitude)
          const lng = parseFloat(result.lng ?? result.longitude)

          // Strict validation: Coordinates must be valid numbers within realistic Indian bounding box
          if (isNaN(lat) || isNaN(lng) || lat < 6.0 || lat > 38.0 || lng < 68.0 || lng > 98.0) {
            throw new Error('Invalid coordinates returned')
          }

          return {
            lat: Math.round(lat * 1000000) / 1000000,
            lng: Math.round(lng * 1000000) / 1000000,
            formattedAddress: result.formatted_address || result.formattedAddress || cleanAddress,
            pincode: result.pincode || result.pinCode || this.extractPincode(cleanAddress),
            city: result.city || result.district || '',
            state: result.state || '',
            district: result.district || result.subDistrict || '',
            eLoc: result.eLoc || result.placeId,
          }
        } catch (err: any) {
          const sanitized = this.sanitizeError(err, apiKey)
          this.logger.warn(`Mappls geocoding attempt failed on ${baseUrl}: ${sanitized}`)
          throw err
        }
      })

      try {
        return await Promise.any(requests)
      } catch (err: any) {
        this.logger.warn(`All Mappls geocoding attempts failed concurrently`)
        return this.handleDevFallback(cleanAddress, 'All Mappls geocoding attempts failed')
      }
    }
  }

  /**
   * Reverse geocode verified lat/lng coordinates to a normalized address
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      this.logger.warn('Mappls reverse geocode rejected: invalid numeric coordinates')
      return null
    }

    // Check India bounding box
    if (lat < 6.0 || lat > 38.0 || lng < 68.0 || lng > 98.0) {
      this.logger.warn(`Mappls reverse geocode rejected: coordinates (${lat}, ${lng}) outside India boundaries`)
      return null
    }

    const apiKey = this.getApiKey()
    if (!apiKey) {
      this.logger.warn('Mappls reverse geocode aborted: MAPMYINDIA_API_KEY is not configured')
      return null
    }

    try {
      const response = await this.executeHedgedGet('rev_geocode', { lat, lng }, apiKey)
      const data = response.data
      const results = data?.results || (Array.isArray(data?.copResults) ? data.copResults : null)

      if (!results || results.length === 0) {
        this.logger.debug(`Mappls reverse geocode returned no address for (${lat}, ${lng})`)
        return null
      }

      const result = results[0]
      return {
        lat,
        lng,
        formattedAddress: result.formatted_address || result.formattedAddress || `${lat}, ${lng}`,
        pincode: result.pincode || result.pinCode || '',
        city: result.city || result.district || '',
        state: result.state || '',
        district: result.district || '',
        eLoc: result.eLoc || result.placeId,
      }
    } catch (err: any) {
      const baseUrls = [this.primaryBaseUrl, this.fallbackBaseUrl]

      const requests = baseUrls.map(async (baseUrl) => {
        try {
          const response = await axios.get(
            `${baseUrl}/${apiKey}/rev_geocode`,
            {
              params: { lat, lng },
              timeout: this.requestTimeoutMs,
              headers: {
                'User-Agent': 'LorryCarry-Logistics-Platform/1.0',
              },
            }
          )

          const data = response.data
          const results = data?.results || (Array.isArray(data?.copResults) ? data.copResults : null)

          if (!results || results.length === 0) {
            throw new Error(`Mappls reverse geocode returned no address for (${lat}, ${lng})`)
          }

          const result = results[0]
          return {
            lat,
            lng,
            formattedAddress: result.formatted_address || result.formattedAddress || `${lat}, ${lng}`,
            pincode: result.pincode || result.pinCode || '',
            city: result.city || result.district || '',
            state: result.state || '',
            district: result.district || '',
            eLoc: result.eLoc || result.placeId,
          }
        } catch (err: any) {
          const sanitized = this.sanitizeError(err, apiKey)
          this.logger.warn(`Mappls reverse geocode attempt failed on ${baseUrl}: ${sanitized}`)
          throw err
        }
      })

      try {
        return await Promise.any(requests)
      } catch (err: any) {
        this.logger.warn(`All Mappls reverse geocoding attempts failed concurrently`)
        return null
      }
    }
  }

  /**
   * Place Autosuggest / Search suggestions
   * Returns place name, address, pincode, and coordinates when available
   */
  async getSuggestions(query: string, location?: { lat: number; lng: number }): Promise<PlaceSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return []
    }

    const apiKey = this.getApiKey()
    if (!apiKey) {
      return []
    }

    const cleanQuery = query.trim()

    try {
      const params: any = {
        query: cleanQuery,
        region: 'ind',
        limit: 5,
      }

      if (location && !isNaN(location.lat) && !isNaN(location.lng)) {
        params.location = `${location.lat},${location.lng}`
      }

      const response = await axios.get(
        `${this.atlasBaseUrl}/search/json`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'LorryCarry-Logistics-Platform/1.0',
          },
          timeout: this.requestTimeoutMs,
        }
      )

      const suggestions = response.data?.suggestedLocations || []
      
      return suggestions.map((s: any) => ({
        placeId: s.placeId || s.eLoc || '',
        address: s.placeName || s.placeAddress || s.formattedAddress || cleanQuery,
        pincode: s.pinCode || s.pincode,
        lat: typeof s.latitude === 'number' ? s.latitude : parseFloat(s.latitude) || undefined,
        lng: typeof s.longitude === 'number' ? s.longitude : parseFloat(s.longitude) || undefined,
        city: s.city || s.district,
        state: s.state,
      }))
    } catch (err: any) {
      const sanitized = this.sanitizeError(err, apiKey)
      this.logger.warn(`Mappls autosuggest failed: ${sanitized}`)
      return []
    }
  }

  /**
   * Straight-Line Distance Calculation (Haversine Formula)
   * Units: Kilometers (km)
   * Note: This represents geographical great-circle straight-line distance, not truck highway road distance.
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.calculateStraightLineDistance(lat1, lng1, lat2, lng2)
  }

  calculateStraightLineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's mean radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10 // Rounded to 1 decimal place
  }

  /**
   * Calculate Actual Road Distance & Travel Duration via Mappls Routing / Distance Matrix
   * Uses real Indian highway and road topology.
   */
  async calculateRoadDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<RoadDistanceResult | null> {
    const apiKey = this.getApiKey()
    const straightLineKm = this.calculateStraightLineDistance(originLat, originLng, destLat, destLng)

    if (!apiKey) {
      // Fallback estimate for road network: 1.25x straight-line factor
      return {
        roadDistanceKm: Math.round(straightLineKm * 1.25 * 10) / 10,
        durationMinutes: Math.round((straightLineKm * 1.25 / 45) * 60), // Avg 45 km/h truck speed
        source: 'straight_line_estimate',
      }
    }

    try {
      // Mappls Distance Matrix API: /distance_matrix/driving/{origin_lng},{origin_lat};{dest_lng},{dest_lat}
      const coordinates = `${originLng},${originLat};${destLng},${destLat}`
      const response = await axios.get(
        `${this.primaryBaseUrl}/${apiKey}/distance_matrix/driving/${coordinates}`,
        {
          timeout: this.requestTimeoutMs,
          headers: {
            'User-Agent': 'LorryCarry-Logistics-Platform/1.0',
          },
        }
      )

      const distances = response.data?.results?.distances
      const durations = response.data?.results?.durations

      if (Array.isArray(distances) && distances[0] && distances[0][1] !== undefined) {
        const roadDistanceMeters = distances[0][1]
        const durationSeconds = (Array.isArray(durations) && durations[0] && durations[0][1] !== undefined)
          ? durations[0][1]
          : (roadDistanceMeters / 1000 / 45) * 3600

        return {
          roadDistanceKm: Math.round((roadDistanceMeters / 1000) * 10) / 10,
          durationMinutes: Math.round(durationSeconds / 60),
          source: 'mappls_road_network',
        }
      }
    } catch (err: any) {
      const sanitized = this.sanitizeError(err, apiKey)
      this.logger.warn(`Mappls road distance API failed: ${sanitized}. Falling back to estimated factor.`)
    }

    // Graceful fallback to estimated road factor (1.25x Haversine)
    return {
      roadDistanceKm: Math.round(straightLineKm * 1.25 * 10) / 10,
      durationMinutes: Math.round((straightLineKm * 1.25 / 45) * 60),
      source: 'straight_line_estimate',
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private extractPincode(address: string): string {
    const match = address.match(/\b\d{6}\b/)
    return match ? match[0] : ''
  }

  /**
   * Development Fallback Handler
   * CRITICAL SECURITY & DATA INTEGRITY RULE:
   * This handler MUST NEVER execute in production or when ENABLE_GEOCODE_DEV_FALLBACK is not 'true'.
   * In production, this method strictly returns null to prevent corrupting logistics matching.
   */
  private handleDevFallback(address: string, reason: string): GeocodeResult | null {
    const nodeEnv = this.config.get<string>('NODE_ENV') || process.env.NODE_ENV || 'development'
    const allowDevFallback = this.config.get<string>('ENABLE_GEOCODE_DEV_FALLBACK') === 'true'

    // Strict Production Gate: NEVER return fabricated coordinates in production
    if (nodeEnv === 'production' || !allowDevFallback) {
      this.logger.warn(`Geocoding failed for "${address}" (${reason}). Returning null (Safe Production Mode).`)
      return null
    }

    this.logger.warn(
      `[DEV ONLY WARNING] Simulating geocode for "${address}" due to "${reason}". ` +
      `Ensure ENABLE_GEOCODE_DEV_FALLBACK is FALSE in production environments.`
    )

    const lower = address.toLowerCase()
    const isBangalore = lower.includes('bangalore') || lower.includes('bengaluru')
    const isMumbai = lower.includes('mumbai')
    const isChennai = lower.includes('chennai')
    const isDelhi = lower.includes('delhi') || lower.includes('ncr')
    const isHosur = lower.includes('hosur')

    let lat = 18.5204
    let lng = 73.8567
    let city = 'Pune'
    let state = 'Maharashtra'

    if (isBangalore) {
      lat = 12.9716; lng = 77.5946; city = 'Bengaluru'; state = 'Karnataka'
    } else if (isMumbai) {
      lat = 19.0760; lng = 72.8777; city = 'Mumbai'; state = 'Maharashtra'
    } else if (isChennai) {
      lat = 13.0827; lng = 80.2707; city = 'Chennai'; state = 'Tamil Nadu'
    } else if (isDelhi) {
      lat = 28.6139; lng = 77.2090; city = 'New Delhi'; state = 'Delhi'
    } else if (isHosur) {
      lat = 12.7409; lng = 77.8253; city = 'Hosur'; state = 'Tamil Nadu'
    }

    return {
      lat,
      lng,
      formattedAddress: address,
      pincode: this.extractPincode(address) || '400001',
      city,
      state,
    }
  }
}
