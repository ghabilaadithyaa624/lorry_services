import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CreateLeadDto,
  LEAD_COMPANY_TYPES,
  type LeadCompanyType,
} from './dto/create-lead.dto'

/** Published support desk — same number as the marketing footer / help page. */
export const LEADS_WHATSAPP_NUMBER = '918072025106'

const COMPANY_TYPE_LABELS: Record<LeadCompanyType, string> = {
  factory_shipper: 'Factory / shipper',
  fleet_owner: 'Fleet owner',
  transporter: 'Transporter',
  logistics_manager: 'Logistics manager',
  other: 'Other',
}

export interface LeadSubmitResult {
  success: true
  /** Delivery is user-initiated WhatsApp (and optional mailto) — nothing is stored. */
  channel: 'whatsapp'
  whatsappUrl: string
  mailtoUrl: string | null
}

/**
 * Request Demo intake.
 *
 * Validates the payload and composes a WhatsApp (and optional mailto) hand-off
 * to the published support desk. The form body is **never written to the
 * database, disk, or application logs** — name, mobile and free-text stay
 * inside the URL that the visitor themselves sends.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name)

  constructor(private readonly configService: ConfigService) {}

  submit(dto: CreateLeadDto): LeadSubmitResult {
    // Honeypot: pretend success so bots do not probe further.
    if (dto.website && dto.website.trim().length > 0) {
      return {
        success: true,
        channel: 'whatsapp',
        whatsappUrl: `https://wa.me/${LEADS_WHATSAPP_NUMBER}`,
        mailtoUrl: null,
      }
    }

    // Sanitized operational log — enums and lengths only, never PII.
    this.logger.log(
      `demo_request companyType=${dto.companyType} fleetSize=${dto.fleetSize ?? 'n/a'} monthlyLoads=${dto.monthlyLoads ?? 'n/a'} cityLen=${dto.cityState.length} hasMessage=${Boolean(dto.message?.trim())}`,
    )

    const message = this.composeWhatsAppMessage(dto)
    const whatsappUrl = `https://wa.me/${LEADS_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    const inbox = this.configService.get<string>('LEADS_INBOX_EMAIL')?.trim()
    const mailtoUrl = inbox
      ? `mailto:${inbox}?subject=${encodeURIComponent('LorryCarry demo request')}&body=${encodeURIComponent(message)}`
      : null

    return {
      success: true,
      channel: 'whatsapp',
      whatsappUrl,
      mailtoUrl,
    }
  }

  composeWhatsAppMessage(dto: CreateLeadDto): string {
    const type = COMPANY_TYPE_LABELS[dto.companyType] ?? dto.companyType
    const lines = [
      'LorryCarry demo request',
      '',
      `Name: ${dto.name}`,
      `Company: ${dto.companyName}`,
      `Mobile: ${this.normalizeMobile(dto.mobile)}`,
      `Role: ${type}`,
      `City / state: ${dto.cityState}`,
    ]
    if (dto.fleetSize) lines.push(`Fleet size: ${dto.fleetSize}`)
    if (dto.monthlyLoads) lines.push(`Monthly loads: ${dto.monthlyLoads}`)
    if (dto.message?.trim()) {
      lines.push('', dto.message.trim())
    }
    return lines.join('\n')
  }

  isKnownCompanyType(value: string): value is LeadCompanyType {
    return (LEAD_COMPANY_TYPES as readonly string[]).includes(value)
  }

  private normalizeMobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '')
    if (digits.length === 10) return `+91${digits}`
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
    if (digits.length === 13 && digits.startsWith('91')) return `+${digits.slice(0, 12)}`
    return mobile.trim()
  }
}
