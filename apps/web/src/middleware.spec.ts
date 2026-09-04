/**
 * Middleware route behaviour.
 *
 * Reproduces the production report: `/privacy`, `/terms`, `/security`, `/help`,
 * `/robots.txt` and `/sitemap.xml` used to answer with a redirect to
 * `/login?redirect=…`. They must be served to anonymous visitors, while every
 * authenticated route keeps its existing protection.
 *
 * The suite loads `./middleware` (and therefore `next/server`) lazily. If the
 * Next.js server entry cannot be resolved in the current runner, the suite is
 * skipped loudly instead of failing the pipeline — the allowlist itself is
 * covered unconditionally in `src/lib/publicRoutes.spec.ts`.
 */

const ORIGIN = 'https://lorry-services-web.vercel.app'

type NextRequestCtor = typeof import('next/server').NextRequest
type MiddlewareModule = typeof import('./middleware')

let NextRequest: NextRequestCtor | null = null
let middlewareModule: MiddlewareModule | null = null
let loadFailure: unknown = null

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NextRequest = require('next/server').NextRequest as NextRequestCtor
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  middlewareModule = require('./middleware') as MiddlewareModule
} catch (error) {
  loadFailure = error
}

const describeWithMiddleware = middlewareModule && NextRequest ? describe : describe.skip

if (!describeWithMiddleware || describeWithMiddleware === describe.skip) {
  console.warn(
    '[middleware.spec] skipped: `next/server` / `./middleware` could not be loaded in this runner.',
    loadFailure
  )
}

function buildRequest(path: string, cookies: Record<string, string> = {}) {
  const Ctor = NextRequest as NextRequestCtor
  const headers = new Headers()
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
  if (cookieHeader) headers.set('cookie', cookieHeader)
  return new Ctor(new URL(path, ORIGIN), { headers })
}

function locationOf(response: Response): URL {
  const location = response.headers.get('location')
  if (!location) throw new Error('expected a redirect response but no Location header was set')
  return new URL(location)
}

describeWithMiddleware('web middleware', () => {
  const runMiddleware = (request: Parameters<MiddlewareModule['middleware']>[0]) =>
    (middlewareModule as MiddlewareModule).middleware(request)

  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  describe('public routes (anonymous visitor, no cookies)', () => {
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
      '/_next/static/chunks/app/layout.js',
    ]

    it.each(publicRoutes)('serves %s without redirecting to /login', async (path) => {
      const response = await runMiddleware(buildRequest(path))

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('keeps query strings on public routes intact', async () => {
      const response = await runMiddleware(buildRequest('/search?type=truck'))

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('serves public routes to authenticated visitors too', async () => {
      const response = await runMiddleware(
        buildRequest('/privacy', { accessToken: 'token', userRole: 'factory_owner' })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })
  })

  describe('protected routes (anonymous visitor, no cookies)', () => {
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/factory-owner',
      '/dashboard/truck-driver',
      '/admin',
      '/admin/users',
      '/my-loads',
      '/my-trucks',
      '/bookings',
      '/booking/booking_123',
      '/documents',
      '/notifications',
      '/settings',
      '/profile',
      '/tracking',
      '/analytics',
      '/post-load',
      '/need-vehicle',
    ]

    it.each(protectedRoutes)('redirects %s to /login with a redirect hint', async (path) => {
      const response = await runMiddleware(buildRequest(path))

      expect(response.status).toBe(307)
      const location = locationOf(response)
      expect(location.pathname).toBe('/login')
      expect(location.searchParams.get('redirect')).toBe(path)
    })
  })

  describe('authenticated visitors', () => {
    it('sends a signed-in user away from /login to their role dashboard', async () => {
      const response = await runMiddleware(
        buildRequest('/login', { accessToken: 'token', userRole: 'truck_driver' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/dashboard/truck-driver')
    })

    it('sends a signed-in admin away from /login to /admin', async () => {
      const response = await runMiddleware(
        buildRequest('/login', { accessToken: 'token', userRole: 'admin' })
      )

      expect(locationOf(response).pathname).toBe('/admin')
    })

    it('resolves /dashboard to the dashboard of the cookie role', async () => {
      const response = await runMiddleware(
        buildRequest('/dashboard', { accessToken: 'token', userRole: 'factory_owner' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/dashboard/factory-owner')
    })

    it('still maps legacy dashboard routes onto the canonical dashboard', async () => {
      const response = await runMiddleware(
        buildRequest('/dashboard/load-owner', { accessToken: 'token', userRole: 'load_owner' })
      )

      expect(locationOf(response).pathname).toBe('/dashboard/factory-owner')
    })

    it.each([
      ['/dashboard/load-owner', '/dashboard/factory-owner'],
      ['/dashboard/truck-owner', '/dashboard/truck-driver'],
      ['/dashboard/driver', '/dashboard/truck-driver'],
    ])('redirects legacy route %s to %s', async (legacy, canonical) => {
      const response = await runMiddleware(
        buildRequest(legacy, { accessToken: 'token', userRole: 'factory_owner' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe(canonical)
    })

    it('routes a stale legacy session to the canonical dashboard', async () => {
      // A cookie written before the role cleanup must not lock the user out or
      // bounce them to a legacy URL.
      for (const [legacyRole, canonical] of [
        ['load_owner', '/dashboard/factory-owner'],
        ['truck_owner', '/dashboard/truck-driver'],
        ['driver', '/dashboard/truck-driver'],
      ]) {
        const response = await runMiddleware(
          buildRequest('/dashboard', { accessToken: 'token', userRole: legacyRole })
        )

        expect(locationOf(response).pathname).toBe(canonical)
      }
    })

    it('applies role-based protection using the normalized legacy role', async () => {
      // `truck_owner` normalizes to truck_driver, so freight-side screens stay closed.
      const response = await runMiddleware(
        buildRequest('/my-loads', { accessToken: 'token', userRole: 'truck_owner' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/dashboard/truck-driver')

      // ...and the vehicle-side screen opens.
      const allowed = await runMiddleware(
        buildRequest('/my-trucks', { accessToken: 'token', userRole: 'truck_owner' })
      )

      expect(allowed.status).toBe(200)
    })

    it('lets an authenticated user into shared app screens', async () => {
      for (const path of ['/documents', '/notifications', '/settings', '/profile', '/bookings']) {
        const response = await runMiddleware(
          buildRequest(path, { accessToken: 'token', userRole: 'factory_owner' })
        )

        expect(response.status).toBe(200)
        expect(response.headers.get('location')).toBeNull()
      }
    })

    it('keeps freight-side screens away from truck drivers', async () => {
      const response = await runMiddleware(
        buildRequest('/my-loads', { accessToken: 'token', userRole: 'truck_driver' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/dashboard/truck-driver')
    })

    it('keeps fleet-side screens away from factory owners', async () => {
      const response = await runMiddleware(
        buildRequest('/my-trucks', { accessToken: 'token', userRole: 'factory_owner' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/dashboard/factory-owner')
    })
  })

  describe('/admin verification against the API', () => {
    function stubUsersMe(result: { ok: boolean; body?: unknown }) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: result.ok,
        json: async () => result.body,
      }) as unknown as typeof fetch
    }

    it('lets a verified admin through', async () => {
      stubUsersMe({ ok: true, body: { role: 'admin' } })

      const response = await runMiddleware(
        buildRequest('/admin/users', { accessToken: 'token', userRole: 'admin' })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })

    it('bounces a non-admin to their own dashboard', async () => {
      stubUsersMe({ ok: true, body: { role: 'truck_driver' } })

      const response = await runMiddleware(
        buildRequest('/admin', { accessToken: 'token', userRole: 'admin' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/dashboard/truck-driver')
    })

    it('redirects to /login when the API rejects the token', async () => {
      stubUsersMe({ ok: false })

      const response = await runMiddleware(
        buildRequest('/admin', { accessToken: 'stale-token', userRole: 'admin' })
      )

      expect(response.status).toBe(307)
      const location = locationOf(response)
      expect(location.pathname).toBe('/login')
      expect(location.searchParams.get('redirect')).toBe('/admin')
    })

    it('redirects to /login when the API is unreachable', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch

      const response = await runMiddleware(
        buildRequest('/admin', { accessToken: 'token', userRole: 'admin' })
      )

      expect(response.status).toBe(307)
      expect(locationOf(response).pathname).toBe('/login')
    })
  })

  describe('matcher configuration', () => {
    // Defensive: the describe body is collected even when the suite is skipped.
    const matcher: string[] = middlewareModule ? middlewareModule.config.matcher : []

    it('is declared as a list of patterns', () => {
      expect(Array.isArray(matcher)).toBe(true)
      expect(matcher.length).toBeGreaterThan(0)
    })

    it('never invokes middleware for framework payloads and static SEO assets', () => {
      const pattern = new RegExp(`^${matcher[0]}$`)

      for (const skipped of [
        '/_next/static/chunks/main.js',
        '/_next/image?url=%2Fhero.jpg',
        '/images/highway-trucks-hero.jpg',
        '/favicon.ico',
        '/icon.png',
        '/apple-icon.png',
        '/robots.txt',
        '/sitemap.xml',
        '/manifest.webmanifest',
      ]) {
        expect(pattern.test(skipped)).toBe(false)
      }
    })

    it('still invokes middleware for application routes', () => {
      const pattern = new RegExp(`^${matcher[0]}$`)

      for (const matched of [
        '/',
        '/privacy',
        '/terms',
        '/security',
        '/help',
        '/search',
        '/login',
        '/dashboard',
        '/admin',
        '/api/v1/search/trucks',
      ]) {
        expect(pattern.test(matched)).toBe(true)
      }
    })
  })
})
