/**
 * Request Demo lead helpers.
 *
 * The public form never writes PII to localStorage, cookies or the
 * marketplace database. After validation the visitor hands the details to
 * the published WhatsApp desk themselves.
 */

export const DEMO_SUPPORT_PHONE = '918072025106'

export const COMPANY_TYPES = [
  { value: 'factory_shipper', label: 'Factory / shipper' },
  { value: 'fleet_owner', label: 'Fleet owner' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'logistics_manager', label: 'Logistics manager' },
  { value: 'other', label: 'Other' },
] as const

export const FLEET_SIZES = [
  { value: '1-5', label: '1 – 5 vehicles' },
  { value: '6-20', label: '6 – 20 vehicles' },
  { value: '21-50', label: '21 – 50 vehicles' },
  { value: '51+', label: '51+ vehicles' },
] as const

export const MONTHLY_LOADS = [
  { value: '1-10', label: '1 – 10 loads' },
  { value: '11-50', label: '11 – 50 loads' },
  { value: '51-200', label: '51 – 200 loads' },
  { value: '200+', label: '200+ loads' },
] as const

export type CompanyType = (typeof COMPANY_TYPES)[number]['value']
export type FleetSize = (typeof FLEET_SIZES)[number]['value']
export type MonthlyLoads = (typeof MONTHLY_LOADS)[number]['value']

export interface DemoLeadInput {
  name: string
  companyName: string
  mobile: string
  companyType: string
  fleetSize: string
  monthlyLoads: string
  cityState: string
  message: string
  /** Honeypot — must stay empty. */
  website: string
}

export type DemoLeadErrors = Partial<Record<keyof DemoLeadInput, string>>

const MOBILE_RE = /^(\+?91[\s-]?)?[6-9]\d{9}$/
const HAS_URL_RE = /https?:\/\/|www\./i

export function emptyDemoLead(): DemoLeadInput {
  return {
    name: '',
    companyName: '',
    mobile: '',
    companyType: '',
    fleetSize: '',
    monthlyLoads: '',
    cityState: '',
    message: '',
    website: '',
  }
}

export function validateDemoLead(input: DemoLeadInput): DemoLeadErrors {
  const errors: DemoLeadErrors = {}
  const name = input.name.trim()
  const company = input.companyName.trim()
  const mobile = input.mobile.replace(/\s/g, '')
  const city = input.cityState.trim()
  const message = input.message.trim()

  if (!name) errors.name = 'Enter your name'
  else if (name.length < 2 || name.length > 80 || HAS_URL_RE.test(name)) {
    errors.name = 'Enter a name — 2 to 80 characters, no links'
  }

  if (!company) errors.companyName = 'Enter your company name'
  else if (company.length < 2 || company.length > 120 || HAS_URL_RE.test(company)) {
    errors.companyName = 'Company name must be 2 to 120 characters'
  }

  if (!mobile) errors.mobile = 'Enter a mobile number'
  else if (!MOBILE_RE.test(mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number'

  if (!COMPANY_TYPES.some((option) => option.value === input.companyType)) {
    errors.companyType = 'Select your role or company type'
  }

  if (input.fleetSize && !FLEET_SIZES.some((option) => option.value === input.fleetSize)) {
    errors.fleetSize = 'Choose a fleet size from the list'
  }

  if (input.monthlyLoads && !MONTHLY_LOADS.some((option) => option.value === input.monthlyLoads)) {
    errors.monthlyLoads = 'Choose a monthly load range from the list'
  }

  if (!city) errors.cityState = 'Enter your city and state'
  else if (city.length < 2 || city.length > 80 || HAS_URL_RE.test(city)) {
    errors.cityState = 'Enter a city and state — 2 to 80 characters'
  }

  if (message.length > 1000) errors.message = 'Keep the note under 1,000 characters'

  return errors
}

export function normalizeDemoMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return mobile.trim()
}

export function composeDemoWhatsAppMessage(input: DemoLeadInput): string {
  const type = COMPANY_TYPES.find((option) => option.value === input.companyType)?.label ?? input.companyType
  const lines = [
    'LorryCarry demo request',
    '',
    `Name: ${input.name.trim()}`,
    `Company: ${input.companyName.trim()}`,
    `Mobile: ${normalizeDemoMobile(input.mobile)}`,
    `Role: ${type}`,
    `City / state: ${input.cityState.trim()}`,
  ]
  if (input.fleetSize) lines.push(`Fleet size: ${input.fleetSize}`)
  if (input.monthlyLoads) lines.push(`Monthly loads: ${input.monthlyLoads}`)
  if (input.message.trim()) {
    lines.push('', input.message.trim())
  }
  return lines.join('\n')
}

export function demoWhatsAppUrl(input: DemoLeadInput): string {
  return `https://wa.me/${DEMO_SUPPORT_PHONE}?text=${encodeURIComponent(composeDemoWhatsAppMessage(input))}`
}

export function toLeadApiPayload(input: DemoLeadInput) {
  return {
    name: input.name.trim(),
    companyName: input.companyName.trim(),
    mobile: input.mobile.replace(/\s/g, ''),
    companyType: input.companyType,
    cityState: input.cityState.trim(),
    ...(input.fleetSize ? { fleetSize: input.fleetSize } : {}),
    ...(input.monthlyLoads ? { monthlyLoads: input.monthlyLoads } : {}),
    ...(input.message.trim() ? { message: input.message.trim() } : {}),
    ...(input.website ? { website: input.website } : {}),
  }
}

export interface LeadSubmitResponse {
  success: boolean
  channel?: 'whatsapp'
  whatsappUrl?: string
  mailtoUrl?: string | null
}

/**
 * POST the validated lead to the public API. `credentials: 'omit'` keeps the
 * request cookieless so CSRF is not required for this anonymous form.
 * Failures are swallowed by the caller, which falls back to a local WhatsApp URL.
 */
export async function submitDemoLead(input: DemoLeadInput): Promise<LeadSubmitResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
  try {
    const response = await fetch(`${apiUrl}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(toLeadApiPayload(input)),
    })
    if (!response.ok) return null
    const data = (await response.json()) as LeadSubmitResponse
    if (!data?.whatsappUrl) return null
    return data
  } catch {
    return null
  }
}
