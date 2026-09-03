export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface OTPRequestDTO {
  phone: string;
}

export interface OTPVerifyDTO {
  phone: string;
  code: string;
  role?: 'load_owner' | 'truck_owner' | 'driver' | 'factory_owner' | 'truck_driver' | 'admin';
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    name?: string | null;
    role: string;
  };
}

export interface CreateLoadDTO {
  tonnageRequired: number;
  loadingAddress: string;
  loadingPin: string;
  loadingPoint?: GeoLocation;
  unloadingAddress: string;
  unloadingPin: string;
  unloadingPoint?: GeoLocation;
  truckType: 'Open' | 'Container' | 'OpenBody';
  minLengthFt?: number;
  minHeightFt?: number;
  urgent?: boolean;
  maxPrice?: number;
  expectedDeliveryAt?: string;
  advancePayable?: number;
}

export interface CreateTruckDTO {
  registrationNumber: string;
  bodyType: 'Open' | 'Container' | 'OpenBody';
  lengthFt: number;
  heightFt: number;
  tonnageCapacity: number;
  currentLocation?: GeoLocation;
  serviceableRadiusKm?: number;
  preferredDestinations?: string[];
}

export interface SearchTrucksFilter {
  loadingPoint?: GeoLocation;
  destinationName?: string;
  truckType?: 'Open' | 'Container' | 'OpenBody';
  minTonnage?: number;
  radiusKm?: number;
}
