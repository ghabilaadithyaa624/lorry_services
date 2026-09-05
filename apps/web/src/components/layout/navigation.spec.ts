import { translate } from '@/lib/i18n'
import { UI_LANGUAGES } from '@/lib/language'
import {
  CTA_ROUTES,
  NAV_SECTIONS,
  PRODUCT_MODULES,
  isPricingActive,
  isSectionActive,
} from './navigation'

/**
 * Public navigation guard rails (Prompt 1 — navbar & Products mega menu):
 * - the required CTA routes stay wired to real surfaces,
 * - the Products mega menu lists exactly the six LorryCarry modules,
 * - every label resolves in all three UI languages,
 * - no fabricated marketing claims ("50 countries", "1Bn data points",
 *   certifications, testimonials) sneak into the public chrome.
 */

const REQUIRED_MODULE_ROUTES: Record<string, string> = {
  marketplace: '/search?type=load',
  fleet: '/search?type=truck',
  controlTower: '/tracking',
  compliance: '/documents',
  payments: '/subscription',
  admin: '/admin',
}

/** Phrases that must never appear in public navigation copy. */
const BANNED_CLAIM_FRAGMENTS = [
  '50 countries',
  '1bn',
  'billion',
  'iso ',
  'iso9001',
  'iso 9001',
  'certified',
  'testimonials',
  'trusted by',
  'million',
  'thousands',
]

function collectNavCopy(): string[] {
  const copy: string[] = []
  for (const section of NAV_SECTIONS) {
    copy.push(translate(section.labelKey, 'en'))
    for (const module of section.modules ?? []) {
      copy.push(translate(module.titleKey, 'en'), translate(module.descKey, 'en'))
    }
    for (const link of section.links ?? []) {
      copy.push(translate(link.labelKey, 'en'))
      if (link.descKey) copy.push(translate(link.descKey, 'en'))
    }
  }
  return copy
}

describe('navigation structure', () => {
  it('exposes Products, Solutions, Resources and Company in order', () => {
    expect(NAV_SECTIONS.map((section) => section.key)).toEqual([
      'products',
      'solutions',
      'resources',
      'company',
    ])
  })

  it('lists exactly the six LorryCarry modules in the Products mega menu', () => {
    expect(PRODUCT_MODULES.map((module) => module.key)).toEqual([
      'marketplace',
      'fleet',
      'controlTower',
      'compliance',
      'payments',
      'admin',
    ])
  })

  it('routes every mega-menu module to its existing product surface', () => {
    for (const [key, expectedHref] of Object.entries(REQUIRED_MODULE_ROUTES)) {
      const module = PRODUCT_MODULES.find((entry) => entry.key === key)
      expect(module).toBeDefined()
      expect(module?.href).toBe(expectedHref)
    }
  })

  it('keeps the shared CTA routes correct', () => {
    expect(CTA_ROUTES.findTrucks).toBe('/search?type=truck')
    expect(CTA_ROUTES.findLoads).toBe('/search?type=load')
    expect(CTA_ROUTES.pricing).toBe('/subscribe')
    expect(CTA_ROUTES.signIn).toBe('/login')
    expect(CTA_ROUTES.postFreight).toBe('/post-load')
  })

  it('links every nav item to an existing app surface', () => {
    // Pages that actually exist under src/app/**. Query strings are stripped
    // before comparison because middleware treats /search?type=… as /search.
    const existingPages = [
      '/',
      '/search',
      '/tracking',
      '/documents',
      '/subscription',
      '/subscribe',
      '/admin',
      '/post-load',
      '/corridors',
      '/procurement',
      '/analytics',
      '/help',
      '/security',
      '/privacy',
      '/terms',
      '/login',
    ]

    const hrefs = NAV_SECTIONS.flatMap((section) => [
      ...(section.modules ?? []).map((module) => module.href),
      ...(section.links ?? []).map((link) => link.href),
    ])

    for (const href of hrefs) {
      const pathname = href.split('?')[0]
      expect(existingPages).toContain(pathname)
    }
  })
})

describe('navigation i18n coverage', () => {
  it('resolves every nav label and description in all UI languages', () => {
    for (const section of NAV_SECTIONS) {
      for (const language of UI_LANGUAGES) {
        expect(translate(section.labelKey, language.value as 'en')).not.toBe(section.labelKey)
        for (const module of section.modules ?? []) {
          expect(translate(module.titleKey, language.value as 'en')).not.toBe(module.titleKey)
          expect(translate(module.descKey, language.value as 'en')).not.toBe(module.descKey)
        }
        for (const link of section.links ?? []) {
          expect(translate(link.labelKey, language.value as 'en')).not.toBe(link.labelKey)
          if (link.descKey) {
            expect(translate(link.descKey, language.value as 'en')).not.toBe(link.descKey)
          }
        }
      }
    }
  })
})

describe('navigation truthfulness', () => {
  it('contains no fabricated scale, certification or testimonial claims', () => {
    const copy = collectNavCopy().join(' \n ').toLowerCase()
    for (const fragment of BANNED_CLAIM_FRAGMENTS) {
      expect(copy).not.toContain(fragment)
    }
  })

  it('marks the admin console as a restricted surface', () => {
    const admin = PRODUCT_MODULES.find((module) => module.key === 'admin')
    expect(admin?.badge).toBe('admin')
  })
})

describe('active-state helpers', () => {
  it('highlights Pricing only on subscribe surfaces', () => {
    expect(isPricingActive('/subscribe')).toBe(true)
    expect(isPricingActive('/subscribe/callback')).toBe(true)
    expect(isPricingActive('/subscription')).toBe(false)
    expect(isPricingActive('/')).toBe(false)
  })

  it('highlights Products on its module surfaces', () => {
    const products = NAV_SECTIONS[0]
    expect(isSectionActive(products, '/search')).toBe(true)
    expect(isSectionActive(products, '/tracking')).toBe(true)
    expect(isSectionActive(products, '/admin/users')).toBe(true)
    expect(isSectionActive(products, '/')).toBe(false)
  })

  it('highlights Solutions on shipper and carrier entry points', () => {
    const solutions = NAV_SECTIONS[1]
    expect(isSectionActive(solutions, '/post-load')).toBe(true)
    expect(isSectionActive(solutions, '/procurement')).toBe(true)
    expect(isSectionActive(solutions, '/terms')).toBe(false)
  })
})
