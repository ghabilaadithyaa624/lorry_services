import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getDashboardForRole, normalizeRole, LEGACY_DASHBOARD_REDIRECTS } from '@/lib/roles'
import { isPublicPath } from '@/lib/publicRoutes'

/**
 * Next.js Middleware for Auth Protection
 * - Redirects unauthenticated users to /login
 * - Redirects authenticated users away from /login
 * - Server-verifiable role-based route protection
 *
 * The public/protected route table lives in `@/lib/publicRoutes` so marketing,
 * legal and SEO routes (`/privacy`, `/terms`, `/security`, `/help`,
 * `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, static assets) stay
 * reachable without a session while everything else remains default-deny.
 */

const FACTORY_OWNER_PATHS = ['/dashboard/factory-owner', '/post-load', '/need-load', '/my-loads']
const TRUCK_DRIVER_PATHS = ['/dashboard/truck-driver', '/register-truck', '/need-vehicle', '/my-trucks']

const dashboardForRole = (role?: string) => getDashboardForRole(role)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value
  const userRole = request.cookies.get('userRole')?.value

  // Check if current route is public (allowlist lives in @/lib/publicRoutes).
  // Everything that is not explicitly public requires authentication.
  const isPublic = isPublicPath(pathname)

  if (isPublic) {
    // If logged in and trying to access login, redirect to dashboard
    if (token && pathname === '/login') {
      const dashboard = dashboardForRole(userRole)
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.next()
  }

  // Require auth for all other paths
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Legacy dashboard routes always redirect to their canonical equivalent.
  const legacyTarget = LEGACY_DASHBOARD_REDIRECTS[pathname]
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, request.url))
  }

  // Redirect /dashboard to appropriate role dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(dashboardForRole(userRole), request.url))
  }

  // Admin-only paths — Server-side token & role verification against NestJS API
  if (pathname.startsWith('/admin')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'
    try {
      const res = await fetch(`${apiUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })
      if (!res.ok) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
      const data = await res.json()
      if (data?.role !== 'admin') {
        const fallback = dashboardForRole(data?.role)
        return NextResponse.redirect(new URL(fallback, request.url))
      }
    } catch {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Role-based access control (legacy cookie values are normalized first)
  const canonicalRole = normalizeRole(userRole)

  if (FACTORY_OWNER_PATHS.some(path => pathname.startsWith(path))) {
    if (canonicalRole !== 'factory_owner' && canonicalRole !== 'admin') {
      return NextResponse.redirect(new URL(dashboardForRole(userRole), request.url))
    }
  }

  if (TRUCK_DRIVER_PATHS.some(path => pathname.startsWith(path))) {
    if (canonicalRole !== 'truck_driver' && canonicalRole !== 'admin') {
      return NextResponse.redirect(new URL(dashboardForRole(userRole), request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /**
     * Skip framework payloads and static/generated assets so middleware never
     * gates them: `/_next/*`, `/images/*`, `/favicon.ico`, `/icon.png`,
     * `/apple-icon.png`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`.
     *
     * The same paths are also allowlisted inside `middleware()` via
     * `isPublicPath()` — belt and braces, because dev/preview servers and
     * rewritten asset URLs do not always hit the matcher.
     */
    '/((?!_next/|images/|public/|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
}
