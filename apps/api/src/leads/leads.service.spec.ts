import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { LeadsService, LEADS_WHATSAPP_NUMBER } from './leads.service'
import { CreateLeadDto } from './dto/create-lead.dto'

function validDto(overrides: Partial<CreateLeadDto> = {}): CreateLeadDto {
  return {
    name: 'Priya Sharma',
    companyName: 'Aarav Textiles Pvt Ltd',
    mobile: '9876543210',
    companyType: 'factory_shipper',
    cityState: 'Pune, Maharashtra',
    ...overrides,
  }
}

describe('LeadsService', () => {
  let service: LeadsService
  let config: { get: jest.Mock }

  beforeEach(async () => {
    config = { get: jest.fn().mockReturnValue(undefined) }
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadsService, { provide: ConfigService, useValue: config }],
    }).compile()

    service = module.get(LeadsService)
  })

  it('returns a WhatsApp hand-off URL and does not invent an inbox', () => {
    const result = service.submit(validDto())

    expect(result.success).toBe(true)
    expect(result.channel).toBe('whatsapp')
    expect(result.mailtoUrl).toBeNull()
    expect(result.whatsappUrl).toContain(`https://wa.me/${LEADS_WHATSAPP_NUMBER}?text=`)
    expect(decodeURIComponent(result.whatsappUrl)).toContain('Priya Sharma')
    expect(decodeURIComponent(result.whatsappUrl)).toContain('Aarav Textiles')
  })

  it('includes optional fleet size, monthly loads and message in the hand-off', () => {
    const result = service.submit(
      validDto({
        fleetSize: '6-20',
        monthlyLoads: '11-50',
        message: 'We run Pune–Chennai FTLs.',
        mobile: '+91 98765 43210',
      }),
    )

    const decoded = decodeURIComponent(result.whatsappUrl)
    expect(decoded).toContain('Fleet size: 6-20')
    expect(decoded).toContain('Monthly loads: 11-50')
    expect(decoded).toContain('We run Pune–Chennai FTLs.')
    expect(decoded).toContain('+919876543210')
  })

  it('returns a mailto URL only when LEADS_INBOX_EMAIL is configured', () => {
    config.get.mockReturnValue('desk@example.com')
    const result = service.submit(validDto())

    expect(result.mailtoUrl).toMatch(/^mailto:desk@example.com\?subject=/)
    expect(result.mailtoUrl).toContain(encodeURIComponent('LorryCarry demo request'))
  })

  it('short-circuits honeypot submissions without embedding the payload', () => {
    const result = service.submit(validDto({ website: 'https://spam.example' }))

    expect(result.success).toBe(true)
    expect(result.whatsappUrl).toBe(`https://wa.me/${LEADS_WHATSAPP_NUMBER}`)
    expect(result.whatsappUrl).not.toContain('Priya')
    expect(result.mailtoUrl).toBeNull()
  })

  it('never logs or returns a persistence handle', () => {
    const result = service.submit(validDto())
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('leadId')
    expect(JSON.stringify(result)).not.toMatch(/password|otp|document/i)
  })
})
