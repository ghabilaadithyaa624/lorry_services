import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware for Auth Protection
 * - Redirects unauthenticated users to /login
 * - Redirects authenticated users away from /login
 * - Server-verifiable role-based route protection
 */

const PUBLIC_EXACT_PATHS = ['/']
const PUBLIC_PREFIXES = ['/login', '/role-select', '/search', '/subscribe', '/subscription', '/api']
const LOAD_OWNER_PATHS = ['/dashboard/load-owner', '/post-load', '/need-load', '/my-loads']
const TRUCK_OWNER_PATHS = ['/dashboard/truck-owner', '/register-truck', '/need-vehicle', '/my-trucks']
const DRIVER_PATHS = ['/dashboard/driver']

const dashboardForRole = (role?: string) =>
  role === 'admin'
    ? '/admin'
    : role === 'driver'
      ? '/dashboard/driver'
      : role === 'truck_owner' || role === 'truck_driver'
        ? '/dashboard/truck-owner'
        : '/dashboard/load-owner'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value
  const userRole = request.cookies.get('userRole')?.value

  // Check if current route is public
  const isPublic = PUBLIC_EXACT_PATHS.includes(pathname) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))

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

  // Role-based access control
  if (LOAD_OWNER_PATHS.some(path => pathname.startsWith(path))) {
    if (userRole !== 'load_owner' && userRole !== 'factory_owner') {
      return NextResponse.redirect(new URL(dashboardForRole(userRole), request.url))
    }
  }

  if (TRUCK_OWNER_PATHS.some(path => pathname.startsWith(path))) {
    if (userRole !== 'truck_owner' && userRole !== 'driver' && userRole !== 'truck_driver') {
      return NextResponse.redirect(new URL(dashboardForRole(userRole), request.url))
    }
  }

  if (DRIVER_PATHS.some(path => pathname.startsWith(path))) {
    if (userRole !== 'driver') {
      return NextResponse.redirect(new URL(dashboardForRole(userRole), request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
