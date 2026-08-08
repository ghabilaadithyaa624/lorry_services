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
}

export interface PlaceSuggestion {
  placeId: string
  address: string
  pincode?: string
  lat?: number
  lng?: number
}

/**
 * MapmyIndia (Mappls) Service
 * India-specific geocoding with better accuracy than Google Maps
 * for rural and highway addresses
 */
@Injectable()
export class MapmyIndiaService {
  private readonly logger = new Logger(MapmyIndiaService.name)
  private readonly baseUrl = 'https://apis.mapmyindia.com/advancedmaps/v1'

  constructor(private config: ConfigService) {}

  /**
   * Geocode an address to lat/lng
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    const apiKey = this.config.get('MAPMYINDIA_API_KEY')
    
    if (!apiKey) {
      this.logger.warn('MAPMYINDIA_API_KEY not configured, using fallback geocoding')
      return this.fallbackGeocode(address)
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/${apiKey}/geo_code`,
        {
          params: { address },
          timeout: 5000,
        }
      )

      const results = response.data.results
      if (!results || results.length === 0) {
        return this.fallbackGeocode(address)
      }

      const result = results[0]
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lng),
        formattedAddress: result.formatted_address || address,
        pincode: result.pincode || this.extractPincode(address),
        city: result.city || '',
        state: result.state || '',
      }
    } catch (error: any) {
      this.logger.error(`Geocoding failed: ${error.message}`)
      return this.fallbackGeocode(address)
    }
  }

  /**
   * Reverse geocode lat/lng to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    const apiKey = this.config.get('MAPMYINDIA_API_KEY')
    
    if (!apiKey) {
      this.logger.warn('MAPMYINDIA_API_KEY not configured')
      return null
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/${apiKey}/rev_geocode`,
        {
          params: { lat, lng },
          timeout: 5000,
        }
      )

      const results = response.data.results
      if (!results || results.length === 0) {
        return null
      }

      const result = results[0]
      return {
        lat,
        lng,
        formattedAddress: result.formatted_address,
        pincode: result.pincode || '',
        city: result.city || '',
        state: result.state || '',
      }
    } catch (error: any) {
      this.logger.error(`Reverse geocoding failed: ${error.message}`)
      return null
    }
  }

  /**
   * Get address autocomplete suggestions
   */
  async getSuggestions(query: string, location?: { lat: number; lng: number }): Promise<PlaceSuggestion[]> {
    const apiKey = this.config.get('MAPMYINDIA_API_KEY')
    
    if (!apiKey || query.length < 3) {
      return []
    }

    try {
      const params: any = {
        query,
        region: 'ind',
        limit: 5,
      }

      if (location) {
        params.location = `${location.lat},${location.lng}`
      }

      const response = await axios.get(
        `https://atlas.mapmyindia.com/api/places/search/json`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 5000,
        }
      )

      const suggestions = response.data.suggestedLocations || []
      
      return suggestions.map((s: any) => ({
        placeId: s.placeId || s.eLoc,
        address: s.placeName || s.placeAddress,
        pincode: s.pinCode,
        lat: s.latitude,
        lng: s.longitude,
      }))
    } catch (error: any) {
      this.logger.error(`Autocomplete failed: ${error.message}`)
      return []
    }
  }

  /**
   * Calculate distance between two points (in km)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10 // Round to 1 decimal
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private extractPincode(address: string): string {
    const match = address.match(/\b\d{6}\b/)
    return match ? match[0] : ''
  }

  private fallbackGeocode(address: string): GeocodeResult {
    // Provide sensible default coordinates (e.g. Pune/Bangalore area) when API key is missing in dev
    const isBangalore = address.toLowerCase().includes('bangalore') || address.toLowerCase().includes('bengaluru')
    const isMumbai = address.toLowerCase().includes('mumbai')
    
    let lat = 18.5204
    let lng = 73.8567
    
    if (isBangalore) {
      lat = 12.9716
      lng = 77.5946
    } else if (isMumbai) {
      lat = 19.0760
      lng = 72.8777
    }

    return {
      lat,
      lng,
      formattedAddress: address,
      pincode: this.extractPincode(address) || '400001',
      city: isBangalore ? 'Bangalore' : isMumbai ? 'Mumbai' : 'Pune',
      state: isBangalore ? 'Karnataka' : 'Maharashtra',
    }
  }
}
