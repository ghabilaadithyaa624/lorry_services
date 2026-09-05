import * as fs from 'fs'
import * as path from 'path'
import { isPublicPath } from '@/lib/publicRoutes'

/**
 * Public page rendering guard.
 *
 * The middleware allows anonymous visitors into `/privacy`, `/terms`,
 * `/security` and `/help`, but a page that mounts the authenticated app shell
 * is still unusable for them: the sidebar links bounce to `/login?redirect=…`
 * and any account fetch 401s into an error banner. These tests read the page
 * sources as text (the pages are client components, so rendering them in the
 * node test environment would need a DOM) and assert the two halves of the
 * contract:
 *
 *  1. the route is public in the allowlist, and
 *  2. the page renders the public shell — never the dashboard shell, and never
 *     an unconditional authenticated request.
 */

const APP_DIR = __dirname

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(APP_DIR, ...segments), 'utf8')
}

const PUBLIC_PAGES = [
  { route: '/privacy', files: [['privacy', 'page.tsx']] },
  { route: '/terms', files: [['terms', 'page.tsx']] },
  {
    route: '/request-demo',
    files: [
      ['request-demo', 'page.tsx'],
      ['request-demo', 'RequestDemo.tsx'],
    ],
  },
  // Server page + the colocated client component that renders the markup.
  {
    route: '/security',
    files: [
      ['security', 'page.tsx'],
      ['security', 'SecurityCenter.tsx'],
    ],
  },
  {
    route: '/help',
    files: [
      ['help', 'page.tsx'],
      ['help', 'HelpCenter.tsx'],
    ],
  },
]

/** Concatenated source of every file that renders the given route. */
function routeSource(files: string[][]): string {
  return files.map((segments) => readSource(...segments)).join('\n')
}

describe('public legal, trust and support pages', () => {
  it.each(PUBLIC_PAGES)('$route is public in the allowlist', ({ route }) => {
    expect(isPublicPath(route)).toBe(true)
  })

  it.each(PUBLIC_PAGES)('$route renders the public shell', ({ files }) => {
    const source = routeSource(files)

    expect(source).not.toContain('DashboardLayout')
    expect(source).toMatch(/from '@\/components\/layout'/)
  })

  it('renders /help with the marketing header and footer', () => {
    const source = readSource('help', 'HelpCenter.tsx')

    expect(source).toContain('<Navbar />')
    expect(source).toContain('<Footer />')
  })

  it('renders /security with the marketing header and footer', () => {
    const source = readSource('security', 'SecurityCenter.tsx')

    expect(source).toContain('<Navbar />')
    expect(source).toContain('<Footer />')
  })

  it('never fetches account data on /security for an anonymous visitor', () => {
    const source = readSource('security', 'SecurityCenter.tsx')

    // The session probe must gate the authenticated call, not the other way round.
    expect(source).toContain('hasClientSession()')
    expect(source).toContain('.getProfile()')
    expect(source.indexOf('hasClientSession()')).toBeLessThan(source.indexOf('.getProfile()'))
  })

  it('renders /request-demo with the marketing header and footer', () => {
    const source = readSource('request-demo', 'RequestDemo.tsx')

    expect(source).toContain('<Navbar />')
    expect(source).toContain('<Footer />')
    expect(source).not.toContain('DashboardLayout')
    expect(source).not.toContain('localStorage.setItem')
  })

  it.each(['/privacy', '/terms', '/security', '/help', '/request-demo'] as const)(
    '%s is indexable (no noindex metadata)',
    (route) => {
      const source = readSource(route.slice(1), 'page.tsx')

      expect(source.toLowerCase()).not.toContain('noindex')
      expect(source).toContain('export const metadata')
    }
  )
})
