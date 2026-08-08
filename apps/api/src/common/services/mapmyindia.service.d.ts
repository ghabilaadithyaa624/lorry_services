import { ConfigService } from '@nestjs/config';
export interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress: string;
    pincode: string;
    city: string;
    state: string;
}
export interface PlaceSuggestion {
    placeId: string;
    address: string;
    pincode?: string;
    lat?: number;
    lng?: number;
}
/**
 * MapmyIndia (Mappls) Service
 * India-specific geocoding with better accuracy than Google Maps
 * for rural and highway addresses
 */
export declare class MapmyIndiaService {
    private config;
    private readonly logger;
    private readonly baseUrl;
    constructor(config: ConfigService);
    /**
     * Geocode an address to lat/lng
     */
    geocodeAddress(address: string): Promise<GeocodeResult | null>;
    /**
     * Reverse geocode lat/lng to address
     */
    reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null>;
    /**
     * Get address autocomplete suggestions
     */
    getSuggestions(query: string, location?: {
        lat: number;
        lng: number;
    }): Promise<PlaceSuggestion[]>;
    /**
     * Calculate distance between two points (in km)
     */
    calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
    private toRadians;
    private extractPincode;
    private fallbackGeocode;
}
//# sourceMappingURL=mapmyindia.service.d.ts.map