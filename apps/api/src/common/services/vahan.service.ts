import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

// ── Public result shapes ─────────────────────────────────────────────────────

export type VahanSource = 'vahan_api' | 'sandbox' | 'unavailable'

/** Normalized, PII-safe subset of the Vahan (mParivahan) RC record. */
export interface VahanRCData {
  /** Canonical registration number (no spaces/dashes), e.g. MH12QW8842. */
  registrationNumber: string
  /** Registration status at the RTO, e.g. ACTIVE. */
  registrationStatus: string
  /** Masked owner name (first name + initial) — full names are never stored. */
  ownerNameMasked?: string
  makerModel?: string
  vehicleClass?: string
  fuelType?: string
  registrationDate?: string
  fitnessValidUpto?: string
  insuranceValidUpto?: string
  pucValidUpto?: string
  permitType?: string
  permitValidUpto?: string
  rto?: string
  state?: string
  chassisNumberMasked?: string
  engineNumberMasked?: string
}

/** Compliance signals derived from the RC expiry fields. */
export interface VahanExpirySignals {
  fitnessExpired: boolean
  insuranceExpired: boolean
  pucExpired: boolean
  permitExpired: boolean
}

export interface VahanRCValidationResult {
  /** True only when a record was fetched AND the registration is ACTIVE. */
  valid: boolean
  /** True when Vahan responded for the number but the RC is inactive/dead. */
  found: boolean
  registrationNumber: string
  source: VahanSource
  checkedAt: string
  error?: string
  data?: VahanRCData
  signals?: VahanExpirySignals
}

interface CacheEntry {
  expiresAt: number
  result: VahanRCValidationResult
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Production-grade Vahan (mParivahan) RC validation service.
 *
 * - Validates Indian registration number formats before spending API credits.
 * - Calls the configured Vahan data provider (Surepass-style `rc-full`
 *   endpoint by default) and normalizes the response into a stable shape.
 * - Caches results in-memory with a TTL to protect the per-hit billing.
 * - PII-safe: owner names and chassis/engine numbers are masked before they
 *   are ever persisted or returned.
 * - Sandbox mode (deterministic, clearly labelled) is hard-blocked in
 *   production. Without configuration in production the result is
 *   `source: 'unavailable'` — NEVER a fabricated record.
 */
@Injectable()
export class VahanService {
  private readonly logger = new Logger(VahanService.name)
  private readonly requestTimeoutMs = 8000
  private readonly cache = new Map<string, CacheEntry>()

  constructor(private config: ConfigService) {}

  // ── Registration number helpers ────────────────────────────────────────────

  /**
   * Canonicalize any user-typed Indian registration number:
   * 'mh 12 qw 8842', 'MH-12-QW-8842', 'mh12qw8842' → 'MH12QW8842'.
   */
  normalizeRegistrationNumber(input: string): string {
    if (!input || typeof input !== 'string') return ''
    return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  /**
   * Indian RC format validation:
   *  - Classic: 2 state letters + 1-2 district digits + 0-3 series letters + 1-4 number digits (MH12QW8842, DL3CAB1234)
   *  - BH series: 2 digits + 'BH' + 4 digits + 2 letters (21BH0000AA)
   */
  isValidRegistrationFormat(input: string): boolean {
    const reg = this.normalizeRegistrationNumber(input)
    if (reg.length < 6 || reg.length > 12) return false
    const classic = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/
    const bhSeries = /^\d{2}BH\d{4}[A-Z]{2}$/
    return classic.test(reg) || bhSeries.test(reg)
  }

  /** State code (first two letters) for classic plates, if present. */
  getStateCode(input: string): string | null {
    const reg = this.normalizeRegistrationNumber(input)
    const match = reg.match(/^([A-Z]{2})\d/)
    return match ? match[1] : null
  }

  // ── Main validation entry point ────────────────────────────────────────────

  /**
   * Validate a vehicle RC against the Vahan database.
   * Never throws for provider failures — failures are reported in the result
   * so callers can degrade gracefully (registration must not break because
   * an external registry is down).
   */
  async validateRC(registrationNumberInput: string): Promise<VahanRCValidationResult> {
    const registrationNumber = this.normalizeRegistrationNumber(registrationNumberInput)

    if (!this.isValidRegistrationFormat(registrationNumber)) {
      return {
        valid: false,
        found: false,
        registrationNumber,
        source: 'unavailable',
        checkedAt: new Date().toISOString(),
        error: 'Invalid Indian vehicle registration number format',
      }
    }

    const cached = this.getCached(registrationNumber)
    if (cached) return cached

    let result: VahanRCValidationResult

    const apiKey = this.getApiKey()
    if (apiKey) {
      result = await this.validateViaProvider(registrationNumber, apiKey)
    } else if (this.isSandboxAllowed()) {
      result = this.buildSandboxResult(registrationNumber)
    } else {
      result = {
        valid: false,
        found: false,
        registrationNumber,
        source: 'unavailable',
        checkedAt: new Date().toISOString(),
        error: 'VAHAN_API_KEY is not configured',
      }
      this.logger.warn(
        'Vahan RC validation skipped: VAHAN_API_KEY is not configured (production-safe refusal to fabricate data)',
      )
    }

    this.setCached(registrationNumber, result)
    return result
  }

  /**
   * Persistable snapshot for the `trucks.vahan_details` JSONB column.
   * Returns null when validation failed so we never store garbage.
   */
  toPersistableSnapshot(result: VahanRCValidationResult): Record<string, unknown> | null {
    if (!result.found || !result.data) return null
    return {
      registrationNumber: result.data.registrationNumber,
      registrationStatus: result.data.registrationStatus,
      ownerNameMasked: result.data.ownerNameMasked ?? null,
      makerModel: result.data.makerModel ?? null,
      vehicleClass: result.data.vehicleClass ?? null,
      fuelType: result.data.fuelType ?? null,
      registrationDate: result.data.registrationDate ?? null,
      fitnessValidUpto: result.data.fitnessValidUpto ?? null,
      insuranceValidUpto: result.data.insuranceValidUpto ?? null,
      pucValidUpto: result.data.pucValidUpto ?? null,
      permitType: result.data.permitType ?? null,
      permitValidUpto: result.data.permitValidUpto ?? null,
      rto: result.data.rto ?? null,
      state: result.data.state ?? null,
      chassisNumberMasked: result.data.chassisNumberMasked ?? null,
      engineNumberMasked: result.data.engineNumberMasked ?? null,
      source: result.source,
      checkedAt: result.checkedAt,
    }
  }

  /** Derive expiry compliance signals from a normalized RC record. */
  computeExpirySignals(data: VahanRCData, now: Date = new Date()): VahanExpirySignals {
    return {
      fitnessExpired: this.isExpired(data.fitnessValidUpto, now),
      insuranceExpired: this.isExpired(data.insuranceValidUpto, now),
      pucExpired: this.isExpired(data.pucValidUpto, now),
      permitExpired: this.isExpired(data.permitValidUpto, now),
    }
  }

  // ── Provider call ──────────────────────────────────────────────────────────

  private getApiKey(): string | null {
    const key =
      this.config.get<string>('VAHAN_API_KEY') || this.config.get<string>('VAHAN_API_TOKEN')
    return key && key.trim().length > 0 ? key.trim() : null
  }

  private getProviderUrl(): string {
    return (
      this.config.get<string>('VAHAN_API_URL') ||
      'https://kyc-api.surepass.io/api/v1/vehicle-rc/rc-full'
    )
  }

  /**
   * Sandbox mode: deterministic mock data so local/dev environments can demo
   * the full verification & compliance flow without paid API credits.
   * Hard-blocked in production, and explicitly opt-out via VAHAN_ALLOW_SANDBOX.
   */
  private isSandboxAllowed(): boolean {
    if (this.config.get<string>('NODE_ENV') === 'production') return false
    const allow = this.config.get<string>('VAHAN_ALLOW_SANDBOX')
    if (allow === 'false' || allow === '0') return false
    return true
  }

  private async validateViaProvider(
    registrationNumber: string,
    apiKey: string,
  ): Promise<VahanRCValidationResult> {
    const url = this.getProviderUrl()
    try {
      const response = await axios.post(
        url,
        { id_number: registrationNumber },
        {
          timeout: this.requestTimeoutMs,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'LorryCarry-Logistics-Platform/1.0',
          },
        },
      )

      const payload = response.data?.data ?? response.data
      if (!payload || typeof payload !== 'object') {
        return {
          valid: false,
          found: false,
          registrationNumber,
          source: 'vahan_api',
          checkedAt: new Date().toISOString(),
          error: 'Vahan provider returned an unrecognized response',
        }
      }

      if (response.data?.success === false || payload?.status === 'not_found') {
        return {
          valid: false,
          found: false,
          registrationNumber,
          source: 'vahan_api',
          checkedAt: new Date().toISOString(),
          error: 'RC not found in the Vahan database',
        }
      }

      const data = this.normalizeProviderRecord(payload, registrationNumber)
      const registrationActive = this.isRegistrationActive(data.registrationStatus)
      if (!registrationActive) {
        this.logger.warn(
          `Vahan RC ${registrationNumber} is not ACTIVE (status: ${data.registrationStatus || 'unknown'})`,
        )
      }

      return {
        valid: registrationActive,
        found: true,
        registrationNumber,
        source: 'vahan_api',
        checkedAt: new Date().toISOString(),
        data,
        signals: this.computeExpirySignals(data),
      }
    } catch (err: any) {
      let message = err?.message || 'Unknown error'
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const providerMsg =
          err.response?.data?.message || err.response?.data?.error || err.response?.data?.error_description
        if (status === 404 || (typeof providerMsg === 'string' && providerMsg.toLowerCase().includes('not found'))) {
          return {
            valid: false,
            found: false,
            registrationNumber,
            source: 'vahan_api',
            checkedAt: new Date().toISOString(),
            error: 'RC not found in the Vahan database',
          }
        }
        if (status === 401 || status === 403) {
          message = `Vahan provider rejected credentials (HTTP ${status})`
        } else {
          message = `HTTP ${status || 'Network'}: ${providerMsg || message}`
        }
      }
      // Never leak the bearer token through error strings.
      message = message.split(apiKey).join('[REDACTED_API_KEY]')
      this.logger.warn(`Vahan RC validation failed for ${registrationNumber}: ${message}`)
      return {
        valid: false,
        found: false,
        registrationNumber,
        source: 'vahan_api',
        checkedAt: new Date().toISOString(),
        error: message,
      }
    }
  }

  /**
   * Normalize the differing field names used by Vahan data providers
   * (Surepass `rc-full`, NIC parivahan dumps, IDfy/Karza variants).
   */
  private normalizeProviderRecord(payload: Record<string, any>, fallbackReg: string): VahanRCData {
    const pick = (...keys: string[]): string | undefined => {
      for (const key of keys) {
        const value = payload[key]
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim()
        }
      }
      return undefined
    }

    const data: VahanRCData = {
      registrationNumber: this.normalizeRegistrationNumber(
        pick('registration_number', 'reg_number', 'reg_no', 'rc_number', 'number') ?? fallbackReg,
      ),
      registrationStatus: (pick('status', 'registration_status', 'rc_status') ?? 'ACTIVE').toUpperCase(),
      ownerNameMasked: this.maskOwnerName(pick('owner_name', 'full_name', 'owner', 'name')),
      makerModel: pick('maker_model', 'model', 'maker_description', 'vehicle_model'),
      vehicleClass: pick('vehicle_class', 'class', 'class_description'),
      fuelType: pick('fuel_type', 'fuel'),
      registrationDate: this.toIsoDate(pick('registration_date', 'reg_date', 'registrationDate')),
      fitnessValidUpto: this.toIsoDate(pick('fitness_upto', 'fitness_valid_upto', 'fitness_upto_original')),
      insuranceValidUpto: this.toIsoDate(pick('insurance_upto', 'insurance_valid_upto', 'insurance_expiry')),
      pucValidUpto: this.toIsoDate(pick('puc_upto', 'puc_valid_upto', 'pucc_upto')),
      permitType: pick('permit_type', 'permit_code', 'norms_type'),
      permitValidUpto: this.toIsoDate(pick('permit_valid_upto', 'national_permit_upto', 'permit_expiry')),
      rto: pick('rto', 'rto_number', 'registered_at'),
      state: pick('state', 'reg_state'),
      chassisNumberMasked: this.maskIdentifier(pick('chassis_number', 'chasi_number', 'chassis')),
      engineNumberMasked: this.maskIdentifier(pick('engine_number', 'engine_no', 'engine')),
    }

    return data
  }

  private isRegistrationActive(status: string): boolean {
    const normalized = (status || '').toUpperCase()
    if (!normalized) return true // Providers omit status when the RC is live.
    return !['INACTIVE', 'SUSPENDED', 'CANCELLED', 'REVOKED', 'NOT_ACTIVE'].includes(normalized)
  }

  private toIsoDate(value?: string): string | undefined {
    if (!value) return undefined
    const trimmed = value.trim()
    // Providers commonly return DD-MM-YYYY or DD/MM/YYYY.
    const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (dmy) {
      const [, d, m, y] = dmy
      const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
      return isNaN(date.getTime()) ? trimmed : date.toISOString().slice(0, 10)
    }
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10)
  }

  private isExpired(dateStr?: string, now: Date = new Date()): boolean {
    if (!dateStr) return false
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return false
    return date.getTime() < now.getTime()
  }

  /** 'Ramesh Kumar Sharma' → 'Ramesh S.' — store identity, not full PII. */
  private maskOwnerName(name?: string): string | undefined {
    if (!name) return undefined
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return undefined
    if (parts.length === 1) return `${parts[0][0]}.`
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  }

  /** 'MAT447895H9932112' → 'MA****112' style mask. */
  private maskIdentifier(id?: string): string | undefined {
    if (!id) return undefined
    const clean = id.replace(/\s+/g, '')
    if (clean.length <= 4) return '****'
    return `${clean.slice(0, 2)}****${clean.slice(-3)}`
  }

  // ── Sandbox result ─────────────────────────────────────────────────────────

  /**
   * Deterministic sandbox RC record derived from the registration number so
   * demos are stable across runs. Every 4th vehicle is given an expired
   * insurance date so non-compliant checklist states are demoable.
   */
  private buildSandboxResult(registrationNumber: string): VahanRCValidationResult {
    const forcedInvalid = (this.config.get<string>('VAHAN_SANDBOX_INVALID') || '')
      .split(',')
      .map((s) => this.normalizeRegistrationNumber(s))
      .filter(Boolean)
    if (forcedInvalid.includes(registrationNumber)) {
      return {
        valid: false,
        found: false,
        registrationNumber,
        source: 'sandbox',
        checkedAt: new Date().toISOString(),
        error: 'RC not found in the Vahan database',
      }
    }

    const hash = this.stableHash(registrationNumber)
    const dayMs = 24 * 60 * 60 * 1000
    const now = Date.now()
    const data: VahanRCData = {
      registrationNumber,
      registrationStatus: 'ACTIVE',
      ownerNameMasked: `Transporter ${String.fromCharCode(65 + (hash % 26))}.`,
      makerModel: ['Tata LPT 3118', 'Ashok Leyland 2820', 'BharatBenz 2823C', 'Eicher Pro 3015'][hash % 4],
      vehicleClass: 'Heavy Goods Vehicle (HGV)',
      fuelType: ['DIESEL', 'DIESEL', 'CNG', 'DIESEL'][hash % 4],
      registrationDate: new Date(now - (4 + (hash % 6)) * 365 * dayMs).toISOString().slice(0, 10),
      fitnessValidUpto: new Date(now + (120 + (hash % 200)) * dayMs).toISOString().slice(0, 10),
      // Every 4th sandbox vehicle carries an expired insurance to exercise the
      // compliance checklist "action required" path.
      insuranceValidUpto: new Date(now + (hash % 4 === 3 ? -20 : 200 + (hash % 100)) * dayMs)
        .toISOString()
        .slice(0, 10),
      pucValidUpto: new Date(now + (90 + (hash % 150)) * dayMs).toISOString().slice(0, 10),
      permitType: 'National Permit',
      permitValidUpto: new Date(now + (150 + (hash % 150)) * dayMs).toISOString().slice(0, 10),
      rto: `RTO-${registrationNumber.slice(0, 4)}`,
      state: registrationNumber.slice(0, 2),
      chassisNumberMasked: `ME****${String(hash % 1000).padStart(3, '0')}`,
      engineNumberMasked: `EN****${String((hash >> 3) % 1000).padStart(3, '0')}`,
    }

    return {
      valid: true,
      found: true,
      registrationNumber,
      source: 'sandbox',
      checkedAt: new Date().toISOString(),
      data,
      signals: this.computeExpirySignals(data),
    }
  }

  // ── Cache ──────────────────────────────────────────────────────────────────

  private getCached(registrationNumber: string): VahanRCValidationResult | null {
    const entry = this.cache.get(registrationNumber)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(registrationNumber)
      return null
    }
    return entry.result
  }

  private setCached(registrationNumber: string, result: VahanRCValidationResult): void {
    const ttlHours = Number(this.config.get<string>('VAHAN_CACHE_TTL_HOURS') || 6)
    const ttlMs = (isNaN(ttlHours) || ttlHours <= 0 ? 6 : ttlHours) * 60 * 60 * 1000
    // Simple size guard — validation results are tiny, cap memory at ~5k entries.
    if (this.cache.size >= 5000) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    this.cache.set(registrationNumber, { expiresAt: Date.now() + ttlMs, result })
  }

  private stableHash(input: string): number {
    let hash = 5381
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 33) ^ input.charCodeAt(i)
    }
    return Math.abs(hash)
  }
}
