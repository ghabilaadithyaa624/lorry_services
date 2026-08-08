var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
/**
 * MapmyIndia (Mappls) Service
 * India-specific geocoding with better accuracy than Google Maps
 * for rural and highway addresses
 */
let MapmyIndiaService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MapmyIndiaService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MapmyIndiaService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        config;
        logger = new Logger(MapmyIndiaService.name);
        baseUrl = 'https://apis.mapmyindia.com/advancedmaps/v1';
        constructor(config) {
            this.config = config;
        }
        /**
         * Geocode an address to lat/lng
         */
        async geocodeAddress(address) {
            const apiKey = this.config.get('MAPMYINDIA_API_KEY');
            if (!apiKey) {
                this.logger.warn('MAPMYINDIA_API_KEY not configured, using fallback geocoding');
                return this.fallbackGeocode(address);
            }
            try {
                const response = await axios.get(`${this.baseUrl}/${apiKey}/geo_code`, {
                    params: { address },
                    timeout: 5000,
                });
                const results = response.data.results;
                if (!results || results.length === 0) {
                    return this.fallbackGeocode(address);
                }
                const result = results[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lng),
                    formattedAddress: result.formatted_address || address,
                    pincode: result.pincode || this.extractPincode(address),
                    city: result.city || '',
                    state: result.state || '',
                };
            }
            catch (error) {
                this.logger.error(`Geocoding failed: ${error.message}`);
                return this.fallbackGeocode(address);
            }
        }
        /**
         * Reverse geocode lat/lng to address
         */
        async reverseGeocode(lat, lng) {
            const apiKey = this.config.get('MAPMYINDIA_API_KEY');
            if (!apiKey) {
                this.logger.warn('MAPMYINDIA_API_KEY not configured');
                return null;
            }
            try {
                const response = await axios.get(`${this.baseUrl}/${apiKey}/rev_geocode`, {
                    params: { lat, lng },
                    timeout: 5000,
                });
                const results = response.data.results;
                if (!results || results.length === 0) {
                    return null;
                }
                const result = results[0];
                return {
                    lat,
                    lng,
                    formattedAddress: result.formatted_address,
                    pincode: result.pincode || '',
                    city: result.city || '',
                    state: result.state || '',
                };
            }
            catch (error) {
                this.logger.error(`Reverse geocoding failed: ${error.message}`);
                return null;
            }
        }
        /**
         * Get address autocomplete suggestions
         */
        async getSuggestions(query, location) {
            const apiKey = this.config.get('MAPMYINDIA_API_KEY');
            if (!apiKey || query.length < 3) {
                return [];
            }
            try {
                const params = {
                    query,
                    region: 'ind',
                    limit: 5,
                };
                if (location) {
                    params.location = `${location.lat},${location.lng}`;
                }
                const response = await axios.get(`https://atlas.mapmyindia.com/api/places/search/json`, {
                    params,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    timeout: 5000,
                });
                const suggestions = response.data.suggestedLocations || [];
                return suggestions.map((s) => ({
                    placeId: s.placeId || s.eLoc,
                    address: s.placeName || s.placeAddress,
                    pincode: s.pinCode,
                    lat: s.latitude,
                    lng: s.longitude,
                }));
            }
            catch (error) {
                this.logger.error(`Autocomplete failed: ${error.message}`);
                return [];
            }
        }
        /**
         * Calculate distance between two points (in km)
         */
        calculateDistance(lat1, lng1, lat2, lng2) {
            const R = 6371; // Earth's radius in km
            const dLat = this.toRadians(lat2 - lat1);
            const dLng = this.toRadians(lng2 - lng1);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c * 10) / 10; // Round to 1 decimal
        }
        toRadians(degrees) {
            return degrees * (Math.PI / 180);
        }
        extractPincode(address) {
            const match = address.match(/\b\d{6}\b/);
            return match ? match[0] : '';
        }
        fallbackGeocode(address) {
            // Provide sensible default coordinates (e.g. Pune/Bangalore area) when API key is missing in dev
            const isBangalore = address.toLowerCase().includes('bangalore') || address.toLowerCase().includes('bengaluru');
            const isMumbai = address.toLowerCase().includes('mumbai');
            let lat = 18.5204;
            let lng = 73.8567;
            if (isBangalore) {
                lat = 12.9716;
                lng = 77.5946;
            }
            else if (isMumbai) {
                lat = 19.0760;
                lng = 72.8777;
            }
            return {
                lat,
                lng,
                formattedAddress: address,
                pincode: this.extractPincode(address) || '400001',
                city: isBangalore ? 'Bangalore' : isMumbai ? 'Mumbai' : 'Pune',
                state: isBangalore ? 'Karnataka' : 'Maharashtra',
            };
        }
    };
    return MapmyIndiaService = _classThis;
})();
export { MapmyIndiaService };
//# sourceMappingURL=mapmyindia.service.js.map