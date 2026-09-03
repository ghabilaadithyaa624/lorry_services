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

// ── Verification & Compliance (Vahan RC / FASTag / E-Way Bill) ──────────────

export type FastagStatus = 'Unknown' | 'Active' | 'LowBalance' | 'Inactive';

export type EwayBillStatus = 'Pending' | 'Active' | 'Expired' | 'Invalid';

/** Normalized, PII-safe subset of a Vahan (mParivahan) RC record. */
export interface VahanRCData {
  registrationNumber: string;
  registrationStatus: string;
  ownerNameMasked?: string;
  makerModel?: string;
  vehicleClass?: string;
  fuelType?: string;
  registrationDate?: string;
  fitnessValidUpto?: string;
  insuranceValidUpto?: string;
  pucValidUpto?: string;
  permitType?: string;
  permitValidUpto?: string;
  rto?: string;
  state?: string;
  chassisNumberMasked?: string;
  engineNumberMasked?: string;
}

export interface VahanRCValidationResult {
  valid: boolean;
  found: boolean;
  registrationNumber: string;
  source: 'vahan_api' | 'sandbox' | 'unavailable';
  checkedAt: string;
  error?: string;
  data?: VahanRCData;
}

export type ComplianceItemStatus = 'compliant' | 'action_required' | 'pending' | 'expired';

export interface ComplianceItem {
  key: string;
  label: string;
  status: ComplianceItemStatus;
  detail: string;
  source: 'vahan_api' | 'sandbox' | 'booking' | 'manual' | 'document';
  verifiedAt?: string;
  expiresAt?: string;
}

export interface ComplianceChecklist {
  scope: 'truck' | 'booking';
  scopeId: string;
  registrationNumber?: string;
  overall: ComplianceItemStatus;
  items: ComplianceItem[];
  checkedAt: string;
}
