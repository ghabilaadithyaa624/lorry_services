import * as fs from 'fs'
import * as path from 'path'
import { isPublicPath } from '@/lib/publicRoutes'

/**
 * Request Demo truthfulness + public-shell guard.
 *
 * The page is a B2B lead form. It must stay public, must not persist PII in
 * the browser, and must not invent scale, certification or customer-quote claims.
 */

const PAGE_SOURCE = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
const FORM_SOURCE = fs.readFileSync(path.join(__dirname, 'RequestDemo.tsx'), 'utf8')
const COPY = `${PAGE_SOURCE}\n${FORM_SOURCE}`.toLowerCase()

const BANNED_CLAIM_FRAGMENTS = [
  '50 countries',
  '1bn',
  'billion',
  'iso 9001',
  'certified',
  'trusted by',
  'loved by',
  'testimonials',
  'lorem ipsum',
  'john doe',
  'jane doe',
]

const REQUIRED_FIELDS = [
  'full name',
  'company name',
  'mobile number',
  'role / company type',
  'fleet size',
  'monthly loads',
  'city / state',
  'message',
]

describe('request-demo public contract', () => {
  it('is public in the allowlist', () => {
    expect(isPublicPath('/request-demo')).toBe(true)
  })

  it('renders the marketing shell', () => {
    expect(FORM_SOURCE).toContain('<Navbar />')
    expect(FORM_SOURCE).toContain('<Footer />')
    expect(FORM_SOURCE).not.toContain('DashboardLayout')
  })

  it('exports indexable metadata', () => {
    expect(PAGE_SOURCE).toContain('export const metadata')
    expect(PAGE_SOURCE.toLowerCase()).not.toContain('noindex')
  })
})

describe('request-demo form fields', () => {
  it.each(REQUIRED_FIELDS)('includes the field label: %s', (label) => {
    expect(COPY).toContain(label)
  })

  it('marks fleet size and monthly loads as optional', () => {
    expect(FORM_SOURCE).toContain('hint="Optional"')
  })
})

describe('request-demo privacy', () => {
  it('does not persist the form in localStorage or cookies', () => {
    expect(FORM_SOURCE).not.toContain('localStorage.setItem')
    expect(FORM_SOURCE).not.toContain('document.cookie')
  })

  it('hands the request off over WhatsApp instead of storing PII', () => {
    expect(FORM_SOURCE).toContain('submitDemoLead')
    expect(FORM_SOURCE).toContain('demoWhatsAppUrl')
    expect(FORM_SOURCE.toLowerCase()).toContain('do not save this')
  })
})

describe('request-demo truthfulness', () => {
  it.each(BANNED_CLAIM_FRAGMENTS)('contains no fabricated claim: %s', (fragment) => {
    expect(COPY).not.toContain(fragment)
  })
})
