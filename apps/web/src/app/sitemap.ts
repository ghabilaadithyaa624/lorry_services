import type { MetadataRoute } from 'next'
import { isPublicPath } from '@/lib/publicRoutes'

/**
 * sitemap.xml
 *
 * Only routes that render for an anonymous visitor are submitted. Authenticated
 * screens (`/dashboard`, `/my-loads`, `/my-trucks`, `/bookings`, `/documents`,
 * `/notifications`, `/settings`, `/profile`, `/admin/*`) used to be listed here
 * and every crawl of them ended in a `/login?redirect=…` hop — wasted crawl
 * budget and a soft-404 signal. They are now omitted and `Disallow`-ed in
 * `robots.ts`.
 *
 * `/security` is publicly reachable but account scoped, so it stays out of the
 * sitemap while remaining crawlable.
 */

interface SitemapRoute {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const INDEXABLE_ROUTES: readonly SitemapRoute[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/search', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/search/trucks', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/subscribe', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/subscription', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lorrycarry.com'
  const now = new Date()

  return INDEXABLE_ROUTES
    // Safety net: never submit a route the middleware would gate behind /login.
    .filter((route) => isPublicPath(route.path))
    .map((route) => ({
      url: `${baseUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))
}
