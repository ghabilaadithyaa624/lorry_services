import { Request, Response, NextFunction } from 'express'
import { doubleCsrf } from 'csrf-csrf'

/**
 * Configure doubleCsrf options
 */
export const csrfConfig = (secret: string) => doubleCsrf({
  getSecret: () => secret,
  getSessionIdentifier: (req: Request) => req.cookies?.accessToken || '',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
})

/**
 * Wrapped middleware that conditionally applies CSRF protection.
 * Only enforces CSRF protection for cookie-carrying mutating requests.
 * Completely safe for non-cookie API clients (like mobile app) and webhooks.
 */
export function getCsrfMiddleware(secret: string) {
  const { doubleCsrfProtection } = csrfConfig(secret)

  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Bypass safe HTTP methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS']
    if (safeMethods.includes(req.method)) {
      return next()
    }

    // 2. Bypass webhook endpoints
    if (req.path.startsWith('/api/v1/webhooks') || req.path.includes('/webhooks/')) {
      return next()
    }

    // 3. Bypass requests without accessToken cookie (non-cookie clients)
    const hasAuthCookie = !!(req.cookies && req.cookies.accessToken)
    if (!hasAuthCookie) {
      return next()
    }

    // 4. Run double submit cookie CSRF protection
    doubleCsrfProtection(req, res, (err) => {
      if (err) {
        return res.status(403).json({
          statusCode: 403,
          message: 'Invalid or missing CSRF token',
          error: 'Forbidden',
        })
      }
      next()
    })
  }
}

/**
 * Helper to generate and set the CSRF token on the response cookie
 */
export function generateCsrfTokenForRequest(req: Request, res: Response, secret: string): string {
  const { generateCsrfToken } = csrfConfig(secret)
  return generateCsrfToken(req, res)
}
