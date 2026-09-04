import manifest from './manifest'
import robots from './robots'
import sitemap from './sitemap'
import { PROTECTED_PATH_PREFIXES, isPublicPath } from '@/lib/publicRoutes'

/**
 * SEO surface: robots.txt, sitemap.xml and the web manifest must agree with the
 * middleware allowlist. Anything the middleware would send to
 * `/login?redirect=…` must not be submitted to crawlers, and nothing that is
 * public may be disallowed.
 */

interface RobotRule {
  userAgent?: string | string[]
  allow?: string | string[]
  disallow?: string | string[]
}

const REQUIRED_PUBLIC_ROUTES = [
  '/',
  '/search',
  '/search/trucks',
  '/search/loads',
  '/privacy',
  '/terms',
  '/security',
  '/help',
  '/login',
  '/role-select',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

/** Normalizes the `string | string[] | undefined` shape robots rules allow. */
function toList(value: unknown): string[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? (value as unknown[]).map(String) : [String(value)]
}

/** robots.txt matching: a URL is blocked when it starts with a Disallow entry. */
function isDisallowed(pathname: string, disallow: readonly string[]): boolean {
  return disallow.some((pattern) => pattern && (pathname === pattern || pathname.startsWith(pattern)))
}

describe('robots()', () => {
  const config = robots()
  const rules: RobotRule[] = Array.isArray(config.rules)
    ? (config.rules as unknown as RobotRule[])
    : ([config.rules] as unknown as RobotRule[])
  const allDisallowed = rules.flatMap((rule) => toList(rule.disallow))

  it('declares a wildcard and a Googlebot rule', () => {
    const agents = rules.flatMap((rule) => toList(rule.userAgent))
    expect(agents).toEqual(expect.arrayContaining(['*', 'Googlebot']))
  })

  it('points crawlers at the sitemap', () => {
    expect(String(config.sitemap)).toMatch(/\/sitemap\.xml$/)
  })

  it('disallows every authenticated area', () => {
    for (const prefix of PROTECTED_PATH_PREFIXES) {
      expect(allDisallowed).toContain(prefix)
    }
  })

  it('disallows API and framework paths', () => {
    expect(allDisallowed).toEqual(expect.arrayContaining(['/api/', '/_next/']))
  })

  it('does not disallow any route that must stay publicly reachable', () => {
    for (const route of REQUIRED_PUBLIC_ROUTES) {
      expect(isDisallowed(route, allDisallowed)).toBe(false)
    }
  })

  it('blocks only the payment callback, not the public pricing pages', () => {
    expect(isDisallowed('/subscribe', allDisallowed)).toBe(false)
    expect(isDisallowed('/subscription', allDisallowed)).toBe(false)
    expect(isDisallowed('/subscribe/callback', allDisallowed)).toBe(true)
  })
})

describe('sitemap()', () => {
  const entries = sitemap()
  const urls = entries.map((entry) => String(entry.url))
  const paths = urls.map((url) => new URL(url).pathname)

  it('emits absolute URLs', () => {
    for (const url of urls) {
      expect(url.startsWith('http')).toBe(true)
      expect(() => new URL(url)).not.toThrow()
    }
  })

  it('only submits routes an anonymous visitor can actually open', () => {
    for (const path of paths) {
      expect(isPublicPath(path)).toBe(true)
    }
  })

  it('never submits an authenticated route', () => {
    const leaked = paths.filter((path) =>
      PROTECTED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    )
    expect(leaked).toEqual([])
  })

  it.each([
    '/dashboard',
    '/my-loads',
    '/my-trucks',
    '/bookings',
    '/documents',
    '/notifications',
    '/settings',
    '/profile',
    '/admin',
    '/post-load',
    '/tracking',
    '/corridors',
    '/login',
  ])('omits the non-indexable route %s', (path) => {
    expect(paths).not.toContain(path)
  })

  it.each(['/', '/search', '/search/trucks', '/subscribe', '/privacy', '/terms', '/help'])(
    'includes the indexable public route %s',
    (path) => {
      expect(paths).toContain(path)
    }
  )

  it('keeps unique URLs with valid priorities and timestamps', () => {
    expect(new Set(paths).size).toBe(paths.length)
    for (const entry of entries) {
      expect(entry.priority).toBeGreaterThan(0)
      expect(entry.priority).toBeLessThanOrEqual(1)
      expect(entry.lastModified).toBeInstanceOf(Date)
    }
  })
})

describe('manifest()', () => {
  it('references only publicly reachable icon assets', () => {
    const icons = manifest().icons || []
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(isPublicPath(String(icon.src))).toBe(true)
    }
  })

  it('starts on a public route', () => {
    expect(isPublicPath(String(manifest().start_url))).toBe(true)
  })
})
