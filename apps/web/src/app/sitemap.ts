import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lorrycarry.com'

  const staticRoutes = [
    '',
    '/search?type=truck',
    '/search?type=load',
    '/search',
    '/post-load',
    '/my-loads',
    '/my-trucks',
    '/tracking',
    '/corridors',
    '/subscribe',
    '/login',
    '/privacy',
    '/terms',
    '/help',
    '/bookings',
    '/dashboard',
  ]

  const now = new Date()

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'daily' : route.includes('search') ? 'hourly' : 'weekly',
    priority: route === '' ? 1 : route.includes('search') ? 0.9 : 0.7,
  }))
}
