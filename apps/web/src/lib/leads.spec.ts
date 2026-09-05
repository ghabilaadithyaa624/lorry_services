import {
  COMPANY_TYPES,
  composeDemoWhatsAppMessage,
  demoWhatsAppUrl,
  emptyDemoLead,
  normalizeDemoMobile,
  toLeadApiPayload,
  validateDemoLead,
} from './leads'

function filled(overrides: Record<string, string> = {}) {
  return {
    ...emptyDemoLead(),
    name: 'Priya Sharma',
    companyName: 'Aarav Textiles',
    mobile: '9876543210',
    companyType: 'factory_shipper',
    cityState: 'Pune, Maharashtra',
    ...overrides,
  }
}

describe('validateDemoLead', () => {
  it('accepts a complete required payload', () => {
    expect(validateDemoLead(filled())).toEqual({})
  })

  it('requires name, company, mobile, role and city', () => {
    const errors = validateDemoLead(emptyDemoLead())
    expect(errors.name).toBeDefined()
    expect(errors.companyName).toBeDefined()
    expect(errors.mobile).toBeDefined()
    expect(errors.companyType).toBeDefined()
    expect(errors.cityState).toBeDefined()
  })

  it('rejects a non-Indian mobile number', () => {
    expect(validateDemoLead(filled({ mobile: '12345' })).mobile).toBeDefined()
    expect(validateDemoLead(filled({ mobile: '+1 2025550147' })).mobile).toBeDefined()
  })

  it('accepts +91 formatted numbers', () => {
    expect(validateDemoLead(filled({ mobile: '+91 98765 43210' })).mobile).toBeUndefined()
  })

  it('treats fleet size and monthly loads as optional', () => {
    expect(validateDemoLead(filled({ fleetSize: '', monthlyLoads: '' }))).toEqual({})
    expect(validateDemoLead(filled({ fleetSize: '6-20', monthlyLoads: '11-50' }))).toEqual({})
  })
})

describe('demo WhatsApp hand-off', () => {
  it('composes a message with every filled field and no extra claims', () => {
    const message = composeDemoWhatsAppMessage(
      filled({ fleetSize: '6-20', monthlyLoads: '11-50', message: 'Need a 25 min walkthrough.' }),
    )
    expect(message).toContain('LorryCarry demo request')
    expect(message).toContain('Priya Sharma')
    expect(message).toContain('Fleet size: 6-20')
    expect(message).toContain('Need a 25 min walkthrough.')
    expect(message.toLowerCase()).not.toContain('iso')
    expect(message.toLowerCase()).not.toContain('trusted by')
  })

  it('builds a wa.me URL against the published support number', () => {
    const url = demoWhatsAppUrl(filled())
    expect(url.startsWith('https://wa.me/918072025106?text=')).toBe(true)
  })

  it('normalizes a 10-digit mobile to +91', () => {
    expect(normalizeDemoMobile('9876543210')).toBe('+919876543210')
    expect(normalizeDemoMobile('+91 98765 43210')).toBe('+919876543210')
  })

  it('omits empty optional fields from the API payload', () => {
    const payload = toLeadApiPayload(filled())
    expect(payload).not.toHaveProperty('fleetSize')
    expect(payload).not.toHaveProperty('message')
    expect(payload).not.toHaveProperty('website')
    expect(COMPANY_TYPES.map((option) => option.value)).toContain(payload.companyType)
  })
})
