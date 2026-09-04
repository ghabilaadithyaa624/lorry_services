import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { VahanService } from './vahan.service'

jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  const mocked: any = { ...actual, post: jest.fn() }
  // Keep the interop `default` pointing at the mocked surface, not the real
  // axios instance (the CJS build self-references `default`).
  mocked.default = mocked
  return mocked
})
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('VahanService', () => {
  let service: VahanService

  const buildService = async (config: Record<string, string> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VahanService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile()

    return module.get<VahanService>(VahanService)
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    service = await buildService({ NODE_ENV: 'test' })
  })

  // ── Normalization & format validation ─────────────────────────────────────

  describe('normalizeRegistrationNumber', () => {
    it('should strip spaces, dashes and lowercase input', () => {
      expect(service.normalizeRegistrationNumber('mh 12 qw 8842')).toBe('MH12QW8842')
      expect(service.normalizeRegistrationNumber('MH-12-QW-8842')).toBe('MH12QW8842')
      expect(service.normalizeRegistrationNumber('mh12qw8842')).toBe('MH12QW8842')
    })

    it('should return empty string for invalid input', () => {
      expect(service.normalizeRegistrationNumber('')).toBe('')
      expect(service.normalizeRegistrationNumber(undefined as any)).toBe('')
    })
  })

  describe('isValidRegistrationFormat', () => {
    it('should accept classic Indian RC formats', () => {
      expect(service.isValidRegistrationFormat('MH12QW8842')).toBe(true)
      expect(service.isValidRegistrationFormat('DL 3C AB 1234')).toBe(true)
      expect(service.isValidRegistrationFormat('KA01AB1234')).toBe(true)
    })

    it('should accept BH-series formats', () => {
      expect(service.isValidRegistrationFormat('21BH0000AA')).toBe(true)
    })

    it('should reject malformed numbers', () => {
      expect(service.isValidRegistrationFormat('12345')).toBe(false)
      expect(service.isValidRegistrationFormat('MHI2QW8842')).toBe(false)
      expect(service.isValidRegistrationFormat('MH12')).toBe(false)
      expect(service.isValidRegistrationFormat('')).toBe(false)
    })
  })

  // ── Sandbox mode ──────────────────────────────────────────────────────────

  describe('validateRC (sandbox)', () => {
    it('should return a deterministic valid sandbox record in dev without an API key', async () => {
      const first = await service.validateRC('MH12QW8842')
      const second = await service.validateRC('MH12QW8842')

      expect(first.source).toBe('sandbox')
      expect(first.found).toBe(true)
      expect(first.valid).toBe(true)
      expect(first.data?.registrationNumber).toBe('MH12QW8842')
      expect(first.data?.registrationStatus).toBe('ACTIVE')
      expect(first.data?.ownerNameMasked).not.toContain('Sharma')
      expect(second.checkedAt).toBeDefined()
      // Deterministic payload (same maker across calls)
      expect(second.data?.makerModel).toBe(first.data?.makerModel)
    })

    it('should mask chassis and engine identifiers', async () => {
      const result = await service.validateRC('KA01AB1234')
      expect(result.data?.chassisNumberMasked).toMatch(/^\w{2}\*+\w{3}$/)
      expect(result.data?.engineNumberMasked).toMatch(/^\w{2}\*+\w{3}$/)
    })

    it('should report VAHAN_SANDBOX_INVALID numbers as not found', async () => {
      const sandbox = await buildService({ NODE_ENV: 'development', VAHAN_SANDBOX_INVALID: 'MH01XX0000' })
      const result = await sandbox.validateRC('MH 01 XX 0000')
      expect(result.found).toBe(false)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should refuse to fabricate data in production without an API key', async () => {
      const prodService = await buildService({ NODE_ENV: 'production' })
      const result = await prodService.validateRC('MH12QW8842')

      expect(result.source).toBe('unavailable')
      expect(result.valid).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.error).toContain('VAHAN_API_KEY')
    })

    it('should respect VAHAN_ALLOW_SANDBOX=false in dev', async () => {
      const strictDev = await buildService({ NODE_ENV: 'development', VAHAN_ALLOW_SANDBOX: 'false' })
      const result = await strictDev.validateRC('MH12QW8842')
      expect(result.source).toBe('unavailable')
    })
  })

  // ── Format gate ───────────────────────────────────────────────────────────

  it('should short-circuit invalid formats without calling the provider', async () => {
    const result = await service.validateRC('NOT-A-PLATE')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid Indian vehicle registration')
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  // ── Provider integration ──────────────────────────────────────────────────

  describe('validateRC (provider)', () => {
    const apiConfig = {
      NODE_ENV: 'production',
      VAHAN_API_KEY: 'test-api-key',
      VAHAN_API_URL: 'https://provider.test/rc-full',
    }

    it('should POST id_number with bearer auth and normalize a Surepass-style response', async () => {
      const providerService = await buildService(apiConfig)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            registration_number: 'mh 12 qw 8842',
            full_name: 'Ramesh Kumar Sharma',
            maker_model: 'Tata LPT 3118',
            vehicle_class: 'Heavy Goods Vehicle',
            fuel_type: 'DIESEL',
            status: 'ACTIVE',
            registration_date: '01-03-2019',
            fitness_upto: '15-08-2027',
            insurance_upto: '22-01-2027',
            puc_upto: '05-12-2026',
            rto: 'MH12',
            chassis_number: 'MAT447895H9932112',
          },
        },
      })

      const result = await providerService.validateRC('MH12QW8842')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://provider.test/rc-full',
        { id_number: 'MH12QW8842' },
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-api-key' }) }),
      )
      expect(result.valid).toBe(true)
      expect(result.found).toBe(true)
      expect(result.source).toBe('vahan_api')
      expect(result.data?.registrationNumber).toBe('MH12QW8842')
      expect(result.data?.ownerNameMasked).toBe('Ramesh S.')
      expect(result.data?.fitnessValidUpto).toBe('2027-08-15')
      expect(result.data?.insuranceValidUpto).toBe('2027-01-22')
      expect(result.signals?.insuranceExpired).toBe(false)
    })

    it('should mark a genuinely expired insurance date in signals', async () => {
      const providerService = await buildService(apiConfig)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: { registration_number: 'MH12QW8842', insurance_upto: '01-01-2020', status: 'ACTIVE' },
        },
      })

      const result = await providerService.validateRC('MH12QW8842')
      expect(result.signals?.insuranceExpired).toBe(true)
    })

    it('should treat a non-ACTIVE registration as found but not valid', async () => {
      const providerService = await buildService(apiConfig)
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: { registration_number: 'MH12QW8842', status: 'INACTIVE' } },
      })

      const result = await providerService.validateRC('MH12QW8842')
      expect(result.found).toBe(true)
      expect(result.valid).toBe(false)
    })

    it('should report not-found for HTTP 404', async () => {
      const providerService = await buildService(apiConfig)
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404, data: { message: 'RC not found' } },
        message: 'Request failed',
      })

      const result = await providerService.validateRC('MH12QW8842')
      expect(result.found).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should redact the API key from provider error messages', async () => {
      const providerService = await buildService(apiConfig)
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { message: 'gateway error for key test-api-key' } },
        message: 'Request failed',
      })

      const result = await providerService.validateRC('MH12QW8842')
      expect(result.error).not.toContain('test-api-key')
      expect(result.error).toContain('[REDACTED_API_KEY]')
    })
  })

  // ── Snapshot helper ───────────────────────────────────────────────────────

  describe('toPersistableSnapshot', () => {
    it('should return null when validation did not resolve a record', () => {
      expect(service.toPersistableSnapshot({ valid: false, found: false, registrationNumber: 'X', source: 'unavailable', checkedAt: '' })).toBeNull()
    })

    it('should include compliance-relevant fields when found', async () => {
      const result = await service.validateRC('MH12QW8842')
      const snapshot = service.toPersistableSnapshot(result)
      expect(snapshot).toMatchObject({
        registrationNumber: 'MH12QW8842',
        registrationStatus: 'ACTIVE',
        source: 'sandbox',
      })
      expect(snapshot?.insuranceValidUpto).toBeDefined()
    })
  })
})
