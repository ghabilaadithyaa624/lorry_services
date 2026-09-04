/**
 * Public pricing page / protected checkout contract.
 *
 * `/subscribe` and `/subscription` are public so visitors can read plans before
 * signing up, while payment initiation stays behind login. These tests cover
 * the two helpers the pages use to make that split.
 */
import { isPublicPath, isProtectedPath } from './publicRoutes'
import { checkoutLoginUrl, hasClientSession } from './subscription'

describe('pricing routes are public', () => {
  it.each(['/subscribe', '/subscribe/callback', '/subscription'])('makes %s public', (path) => {
    expect(isPublicPath(path)).toBe(true)
    expect(isProtectedPath(path)).toBe(false)
  })

  it('does not leak look-alike paths', () => {
    expect(isPublicPath('/subscribed')).toBe(false)
    expect(isPublicPath('/subscriptions-admin')).toBe(false)
  })
})

describe('hasClientSession', () => {
  const store: Record<string, string> = {}

  beforeAll(() => {
    (global as any).window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v
        },
        removeItem: (k: string) => {
          delete store[k]
        },
      },
    }
  })

  afterAll(() => {
    delete (global as any).window
  })

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
  })

  it('is false for an anonymous visitor', () => {
    expect(hasClientSession()).toBe(false)
  })

  it('is true once an access token is stored', () => {
    store.accessToken = 'jwt.token.value'
    expect(hasClientSession()).toBe(true)
  })
})

describe('checkoutLoginUrl', () => {
  it('returns to the pricing page after login by default', () => {
    expect(checkoutLoginUrl()).toBe('/login?redirect=%2Fsubscribe')
  })

  it('preserves the selected plan so checkout can resume', () => {
    expect(checkoutLoginUrl('/subscribe?plan=annual')).toBe(
      '/login?redirect=%2Fsubscribe%3Fplan%3Dannual'
    )
  })

  it('refuses open redirects to another origin', () => {
    expect(checkoutLoginUrl('//evil.example.com')).toBe('/login?redirect=%2Fsubscribe')
    expect(checkoutLoginUrl('https://evil.example.com')).toBe('/login?redirect=%2Fsubscribe')
  })
})
