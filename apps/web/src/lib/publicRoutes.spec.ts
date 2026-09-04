import {
  PROTECTED_PATH_PREFIXES,
  PUBLIC_EXACT_PATHS,
  PUBLIC_PATH_PREFIXES,
  isProtectedPath,
  isPublicPath,
  normalizePathname,
} from './publicRoutes'

/**
 * Regression coverage for the production bug where public, legal and SEO routes
 * (`/privacy`, `/terms`, `/security`, `/help`, `/robots.txt`, `/sitemap.xml`)
 * were redirected to `/login?redirect=…`.
 *
 * These are the allowlist rules `src/middleware.ts` enforces; the middleware
 * itself is exercised end to end in `src/middleware.spec.ts`.
 */
describe('publicRoutes allowlist', () => {
  describe('routes reported as wrongly redirected to /login', () => {
    const reportedBroken = ['/privacy', '/terms', '/security', '/help', '/robots.txt', '/sitemap.xml']

    it.each(reportedBroken)('makes %s public', (pathname) => {
      expect(isPublicPath(pathname)).toBe(true)
      expect(isProtectedPath(pathname)).toBe(false)
    })
  })

  describe('required public routes', () => {
    const publicRoutes = [
      '/',
      '/login',
      '/role-select',
      '/search',
      '/search/trucks',
      '/search/loads',
      '/privacy',
      '/terms',
      '/security',
      '/help',
      '/robots.txt',
      '/sitemap.xml',
      '/manifest.webmanifest',
      '/favicon.ico',
      '/icon.png',
      '/apple-icon.png',
      '/images/highway-trucks-hero.jpg',
      '/images/anything/nested.png',
      '/_next/static/chunks/main-app.js',
      '/_next/image?url=%2Fhero.jpg&w=1080&q=75',
    ]

    it.each(publicRoutes)('allows %s without a session', (pathname) => {
      expect(isPublicPath(pathname)).toBe(true)
    })
  })

  describe('required protected routes', () => {
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/factory-owner',
      '/dashboard/truck-driver',
      '/dashboard/load-owner',
      '/admin',
      '/admin/users',
      '/admin/kyc',
      '/my-loads',
      '/my-loads/123',
      '/my-trucks',
      '/bookings',
      '/booking/abc123',
      '/documents',
      '/notifications',
      '/settings',
      '/profile',
    ]

    it.each(protectedRoutes)('keeps %s behind authentication', (pathname) => {
      expect(isPublicPath(pathname)).toBe(false)
      expect(isProtectedPath(pathname)).toBe(true)
    })
  })

  describe('default-deny for everything not allowlisted', () => {
    // Session-scoped screens that are not in PROTECTED_PATH_PREFIXES must still
    // require auth: protection is "not public", not "explicitly protected".
    const otherAppRoutes = [
      '/tracking',
      '/analytics',
      '/activity',
      '/corridors',
      '/procurement',
      '/post-load',
      '/need-load',
      '/need-vehicle',
      '/register-truck',
      '/some-route-that-does-not-exist',
    ]

    it.each(otherAppRoutes)('does not expose %s', (pathname) => {
      expect(isPublicPath(pathname)).toBe(false)
    })
  })

  describe('prefix matching is segment aware', () => {
    it('does not leak look-alike paths', () => {
      expect(isPublicPath('/terms-of-service')).toBe(false)
      expect(isPublicPath('/private')).toBe(false)
      expect(isPublicPath('/searching')).toBe(false)
      expect(isPublicPath('/login-help')).toBe(false)
      expect(isPublicPath('/helpline')).toBe(false)
      expect(isPublicPath('/imagesx/secret.png')).toBe(false)
    })

    it('keeps child routes of a public prefix public', () => {
      expect(isPublicPath('/search/trucks')).toBe(true)
      expect(isPublicPath('/search/loads')).toBe(true)
      expect(isPublicPath('/privacy/archive')).toBe(true)
      expect(isPublicPath('/help/contact')).toBe(true)
      expect(isPublicPath('/subscribe/callback')).toBe(true)
      expect(isPublicPath('/api/v1/search/trucks')).toBe(true)
    })

    it('never exposes a protected child of a public prefix', () => {
      // `/dashboard` and `/admin` are protected prefixes, and no public prefix
      // may swallow them.
      for (const protectedPrefix of PROTECTED_PATH_PREFIXES) {
        expect(isPublicPath(protectedPrefix)).toBe(false)
        expect(isPublicPath(`${protectedPrefix}/deep/nested`)).toBe(false)
      }
    })
  })

  describe('normalizePathname', () => {
    it('strips query strings and hashes', () => {
      expect(normalizePathname('/privacy?utm_source=footer')).toBe('/privacy')
      expect(normalizePathname('/search#results')).toBe('/search')
      expect(normalizePathname('/search?type=truck')).toBe('/search')
    })

    it('collapses trailing slashes but keeps the root', () => {
      expect(normalizePathname('/terms/')).toBe('/terms')
      expect(normalizePathname('/terms///')).toBe('/terms')
      expect(normalizePathname('/')).toBe('/')
    })

    it('accepts absolute URLs', () => {
      expect(normalizePathname('https://lorrycarry.com/help?a=1')).toBe('/help')
      expect(normalizePathname('https://lorry-services-web.vercel.app/robots.txt')).toBe('/robots.txt')
    })

    it('treats missing input as non-public', () => {
      expect(normalizePathname(undefined)).toBe('')
      expect(normalizePathname(null)).toBe('')
      expect(normalizePathname('')).toBe('')
      expect(isPublicPath(undefined)).toBe(false)
      expect(isPublicPath(null)).toBe(false)
      expect(isPublicPath('')).toBe(false)
      expect(isProtectedPath(undefined)).toBe(false)
    })

    it('normalizes before matching', () => {
      expect(isPublicPath('/privacy/')).toBe(true)
      expect(isPublicPath('/privacy?utm_source=footer')).toBe(true)
      expect(isPublicPath('https://lorrycarry.com/terms/')).toBe(true)
      expect(isPublicPath('/dashboard/')).toBe(false)
    })
  })

  describe('route tables stay consistent', () => {
    it('publishes the exact paths required for SEO and PWA assets', () => {
      expect(PUBLIC_EXACT_PATHS).toEqual(
        expect.arrayContaining([
          '/',
          '/robots.txt',
          '/sitemap.xml',
          '/manifest.webmanifest',
          '/favicon.ico',
          '/icon.png',
          '/apple-icon.png',
        ])
      )
    })

    it('publishes the prefixes required for legal, search and static routes', () => {
      expect(PUBLIC_PATH_PREFIXES).toEqual(
        expect.arrayContaining([
          '/privacy',
          '/terms',
          '/security',
          '/help',
          '/login',
          '/role-select',
          '/search',
          '/images',
          '/_next',
        ])
      )
    })

    it('declares every route that must stay authenticated', () => {
      expect(PROTECTED_PATH_PREFIXES).toEqual(
        expect.arrayContaining([
          '/admin',
          '/dashboard',
          '/my-loads',
          '/my-trucks',
          '/bookings',
          '/booking',
          '/documents',
          '/notifications',
          '/settings',
          '/profile',
        ])
      )
    })

    it('has no overlap between the public and protected tables', () => {
      for (const publicEntry of [...PUBLIC_EXACT_PATHS, ...PUBLIC_PATH_PREFIXES]) {
        expect(isProtectedPath(publicEntry)).toBe(false)
        for (const protectedEntry of PROTECTED_PATH_PREFIXES) {
          expect(publicEntry.startsWith(`${protectedEntry}/`)).toBe(false)
          expect(protectedEntry.startsWith(`${publicEntry}/`)).toBe(false)
        }
      }
    })

    it('keeps every entry absolute and slash-normalized', () => {
      for (const entry of [...PUBLIC_EXACT_PATHS, ...PUBLIC_PATH_PREFIXES, ...PROTECTED_PATH_PREFIXES]) {
        expect(entry.startsWith('/')).toBe(true)
        expect(entry.endsWith('/')).toBe(entry === '/')
        expect(normalizePathname(entry)).toBe(entry)
      }
    })
  })
})
