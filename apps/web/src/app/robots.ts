import type { MetadataRoute } from 'next'
import { PROTECTED_PATH_PREFIXES } from '@/lib/publicRoutes'

/**
 * robots.txt
 *
 * Public marketing, search, legal and support routes are fully crawlable —
 * `/privacy`, `/terms`, `/security`, `/help`, `/sitemap.xml` are all served
 * without a session (see `@/lib/publicRoutes`).
 *
 * Authenticated application routes are disallowed so crawlers do not waste
 * budget on URLs that only ever answer with a `/login?redirect=…` hop. A
 * `Disallow` here affects bots only — signed-in users are unaffected.
 */

/** Extra non-indexable paths that are not part of the protected prefix table. */
const CRAWLER_ONLY_DISALLOW: readonly string[] = [
  '/api/',
  '/_next/',
  // Payment provider callback — transaction specific, never indexable.
  '/subscribe/callback',
  // Session-scoped screens that require an active user even though they are
  // not listed in PROTECTED_PATH_PREFIXES.
  '/post-load',
  '/need-load',
  '/need-vehicle',
  '/register-truck',
  '/tracking',
  '/analytics',
  '/activity',
  '/corridors',
  '/procurement',
]

const DISALLOWED_PATHS: string[] = [...PROTECTED_PATH_PREFIXES, ...CRAWLER_ONLY_DISALLOW]

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lorrycarry.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
