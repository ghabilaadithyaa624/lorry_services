/**
 * Single source of truth for route visibility.
 *
 * Which URLs are public (reachable without a session) and which belong to the
 * authenticated app. Consumed by:
 *
 *  - `src/middleware.ts` — server-side route protection (edge runtime)
 *  - `src/app/robots.ts` — crawler directives for authenticated areas
 *  - `src/lib/api.ts`    — stops the 401 handler from bouncing anonymous
 *                          visitors off public pages that render the app shell
 *
 * Marketing extras such as `/request-demo` live in `PUBLIC_PATH_PREFIXES`.
 *
 * This module is intentionally dependency-free (no `next/*` imports) so it can
 * be loaded from the edge middleware runtime and from plain unit tests.
 *
 * Route protection stays **default-deny**: anything that is not listed as
 * public requires a valid session. `PROTECTED_PATH_PREFIXES` therefore exists
 * for documentation, tests and crawler directives — never to open routes up.
 */

/** Public only on an exact match (root + generated metadata/static assets). */
export const PUBLIC_EXACT_PATHS: readonly string[] = [
  '/',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
]

/**
 * Public for the segment itself and everything below it.
 * Matching is segment-aware, so `/terms` and `/terms/anything` are public while
 * `/terms-of-use` is not.
 */
export const PUBLIC_PATH_PREFIXES: readonly string[] = [
  // Legal / trust / support pages linked from the public marketing footer.
  '/privacy',
  '/terms',
  '/security',
  '/help',
  // Auth entry points and public discovery.
  '/login',
  '/role-select',
  '/search', // covers /search, /search/trucks, /search/loads
  // Public pricing / checkout entry points.
  '/subscribe', // covers /subscribe/callback
  '/subscription',
  // B2B Request Demo lead form.
  '/request-demo',
  // Static assets + framework payloads.
  '/images',
  '/_next',
  // Next.js API routes and the `/api/*` → backend rewrites in next.config.js.
  '/api',
]

/**
 * Authenticated areas. These must always sit behind the login redirect and must
 * never be advertised to crawlers.
 */
export const PROTECTED_PATH_PREFIXES: readonly string[] = [
  '/admin',
  '/dashboard',
  '/my-loads',
  '/my-trucks',
  '/my-listings',
  '/bookings',
  '/booking',
  '/documents',
  '/notifications',
  '/settings',
  '/profile',
]

/**
 * Reduce any caller-supplied value to a bare pathname:
 * - drops the query string and hash
 * - tolerates absolute URLs (`https://host/privacy?x=1` → `/privacy`)
 * - collapses trailing slashes (`/terms/` → `/terms`), keeping `/` intact
 *
 * Returns `''` for missing/invalid input so callers treat it as "not public".
 */
export function normalizePathname(input?: string | null): string {
  if (typeof input !== 'string') return ''

  let path = input.trim()
  if (!path) return ''

  if (!path.startsWith('/')) {
    try {
      path = new URL(path).pathname
    } catch {
      path = `/${path}`
    }
  }

  const terminator = path.search(/[?#]/)
  if (terminator >= 0) path = path.slice(0, terminator)

  if (path.length > 1) path = path.replace(/\/+$/, '')

  return path || '/'
}

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * True when the path is reachable without authentication.
 * Everything else is protected (default-deny) — see `src/middleware.ts`.
 */
export function isPublicPath(input?: string | null): boolean {
  const pathname = normalizePathname(input)
  if (!pathname) return false
  if (PUBLIC_EXACT_PATHS.includes(pathname)) return true
  return matchesPrefix(pathname, PUBLIC_PATH_PREFIXES)
}

/**
 * True when the path is part of the authenticated app. Used by tests and by
 * `robots.ts`; it is deliberately *not* what unlocks access in middleware.
 */
export function isProtectedPath(input?: string | null): boolean {
  const pathname = normalizePathname(input)
  if (!pathname) return false
  return matchesPrefix(pathname, PROTECTED_PATH_PREFIXES)
}
