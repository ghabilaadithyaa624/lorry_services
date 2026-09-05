'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LockClosedIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import { Navbar, Footer } from '@/components/layout'
import { AlertBanner, Badge, Button, Card, Modal, Skeleton, StatusDot } from '@/components/ui'
import { authApi, usersApi } from '@/lib/api'
import { toast } from '@/lib/toast'
import { hasClientSession } from '@/lib/subscription'
import { formatPhone } from '@/lib/utils'

/**
 * Support channel for security reports — the same number published across the
 * marketing site. No vulnerability-disclosure SLA is promised here, because
 * the platform does not run a formal bug-bounty programme.
 */
const SUPPORT_PHONE = '+918072025106'

/** Session state: `unknown` until the browser has been probed (SSR-safe). */
type SessionState = 'unknown' | 'anonymous' | 'authenticated'

interface ClientDetails {
  userAgent: string
  platform: string
  language: string
}

/** Public platform-security facts. Copied from the existing account copy. */
const PLATFORM_CONTROLS = [
  {
    icon: SignalIcon,
    title: 'SHA-256 hashed OTP authentication',
    body: 'One-Time Passwords are hashed before persistence with strict 10-minute expirations and brute-force throttling. There is no password to steal or reuse.',
  },
  {
    icon: KeyIcon,
    title: 'Rotating refresh-token families',
    body: 'Sessions use a short-lived access JWT paired with a rotating refresh-token family. If an expired or stolen refresh token is replayed, the backend invalidates the entire family automatically.',
  },
  {
    icon: LockClosedIcon,
    title: 'Encryption in transit and scoped access',
    body: 'Traffic is encrypted in transit, internal access is scoped per service, and documents you upload for verification are only visible to the compliance reviewers handling them.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Payments stay with the gateway',
    body: 'Subscription payments are processed by our payment gateway. LorryCarry never stores card or UPI credentials — every transaction is verified server-side before a plan activates.',
  },
]

/**
 * Trust & security — a **public** route (see `@/lib/publicRoutes`).
 *
 * The page is linked from the marketing footer, so the platform-security
 * content renders for everyone. The account controls (current session, sign
 * out, revoke other sessions) are session-aware: an anonymous visitor gets a
 * sign-in prompt instead of a failed `/users/me` call and an error banner.
 */
export default function SecurityCenter() {
  const [sessionState, setSessionState] = useState<SessionState>('unknown')
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false)
  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    userAgent: '',
    platform: '',
    language: '',
  })

  useEffect(() => {
    /**
     * `/security` is public, so no authenticated request may fire for an
     * anonymous visitor. Probe the local session first and only ask the API
     * for account data when a session exists.
     */
    if (!hasClientSession()) {
      setSessionState('anonymous')
      return
    }

    setSessionState('authenticated')
    setError('')

    usersApi
      .getProfile()
      .then((res) => setUser(res.data))
      .catch(() => setError('We could not load your account security profile just now.'))
      .finally(() => {
        if (typeof window !== 'undefined') {
          setClientDetails({
            userAgent: navigator.userAgent,
            platform: navigator.platform || 'Desktop / Mobile',
            language: navigator.language,
          })
        }
      })
  }, [])

  const handleLogoutCurrent = async () => {
    try {
      setLoggingOut(true)
      await authApi.logout()
      toast.success('Logged out successfully')
      if (typeof window !== 'undefined') window.location.assign('/login')
    } catch {
      toast.error('Logout failed')
    } finally {
      setLoggingOut(false)
    }
  }

  const handleLogoutAllDevices = async () => {
    try {
      setLoggingOutAll(true)
      await authApi.logoutAll()
      toast.success('All active sessions revoked across all devices')
      setShowLogoutAllModal(false)
      if (typeof window !== 'undefined') window.location.assign('/login')
    } catch {
      toast.error('Failed to revoke all sessions')
    } finally {
      setLoggingOutAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20 font-mono uppercase text-[10px] font-bold">
            Trust &amp; security
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
            Security &amp; data protection
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            How LorryCarry protects operator accounts, verification documents and payment data. This
            page is public — you can read it without an account, and only the session controls
            require signing in.
          </p>
        </div>

        {/* Platform controls — public, factual copy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLATFORM_CONTROLS.map(({ icon: Icon, title, body }) => (
            <Card key={title} padding="md">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <span
                  className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="text-sm">{title}</span>
              </div>
              <p className="mt-2.5 text-xs text-muted leading-relaxed">{body}</p>
            </Card>
          ))}
        </div>

        {/* Session controls — session aware */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink tracking-tight">Your sessions</h2>

          {sessionState === 'unknown' && <Skeleton.Card />}

          {sessionState === 'anonymous' && (
            <Card padding="lg">
              <Card.Title as="h3" className="mb-1">
                Sign in to manage your sessions
              </Card.Title>
              <p className="text-sm text-muted leading-relaxed mb-4">
                Your active logins, the device fingerprint of the current session and the
                &ldquo;revoke all devices&rdquo; control are only shown to signed-in operators. After
                signing in you land back on this page.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button as={Link} href="/login?redirect=%2Fsecurity" variant="primary" size="sm">
                  Sign in
                </Button>
                <Button as={Link} href="/role-select" variant="secondary" size="sm">
                  Create account
                </Button>
              </div>
            </Card>
          )}

          {sessionState === 'authenticated' && (
            <>
              {error ? (
                <AlertBanner variant="danger" title="Security profile error">
                  {error}
                </AlertBanner>
              ) : (
                <Card padding="lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <StatusDot variant="active" pulse />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-semibold text-ink">Account protected</h3>
                          <Badge variant="success" size="sm">
                            Protected
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          WhatsApp OTP authenticated · Cryptographic refresh token rotation active
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 shrink-0">
                      <ShieldCheckIcon className="w-4 h-4" aria-hidden="true" />
                      Cryptographically guarded
                    </span>
                  </div>
                </Card>
              )}

              {/* Current active session */}
              <Card padding="lg">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-hairline">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <DevicePhoneMobileIcon className="w-[18px] h-[18px]" />
                    </span>
                    <h3 className="text-sm font-semibold text-ink">Active session</h3>
                  </div>
                  <Badge variant="success" size="sm">
                    Current
                  </Badge>
                </div>

                <dl className="mt-4 space-y-2.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-hairline">
                    <dt className="text-muted">Environment &amp; browser</dt>
                    <dd className="text-ink font-semibold truncate max-w-md">
                      {clientDetails.userAgent || 'Web browser'}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-muted">Authenticated mobile identity</dt>
                    <dd className="text-ink font-semibold">
                      {user?.phone ? formatPhone(user.phone) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-muted">Token architecture</dt>
                    <dd className="text-body">
                      Rotating refresh token family + short-lived access JWT
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-muted">Replay protection</dt>
                    <dd className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckBadgeIcon className="w-4 h-4" aria-hidden="true" />
                      Automatic family invalidation active
                    </dd>
                  </div>
                </dl>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={loggingOut}
                    onClick={handleLogoutCurrent}
                    leftIcon={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
                  >
                    Log out current session
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowLogoutAllModal(true)}
                    leftIcon={<KeyIcon className="w-4 h-4" />}
                  >
                    Revoke all other sessions
                  </Button>
                </div>
              </Card>
            </>
          )}
        </section>

        {/* Report a concern — public contact channels */}
        <Card padding="lg">
          <Card.Title as="h2" className="mb-1">
            Report a security concern
          </Card.Title>
          <p className="text-sm text-muted leading-relaxed mb-4">
            If you notice suspicious activity on your account or believe you have found a security
            issue, contact the operations desk directly. We review every report and will ask you to
            sign out other sessions while we investigate.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`https://wa.me/${SUPPORT_PHONE.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-hairline hover:border-primary-500/40 hover:bg-wash-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span
                className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <ChatBubbleLeftRightIcon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">WhatsApp</span>
                <span className="block text-xs text-muted">Fastest response</span>
              </span>
            </a>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-hairline hover:border-primary-500/40 hover:bg-wash-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span
                className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <PhoneIcon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">Call support</span>
                <span className="block text-xs text-muted font-mono">{SUPPORT_PHONE}</span>
              </span>
            </a>
          </div>
        </Card>

        {/* Cross links */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/privacy"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
          >
            Read the privacy notice
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-panel border border-hairline text-sm font-semibold text-ink hover:bg-wash transition-colors"
          >
            Visit the help centre
          </Link>
        </div>
      </main>

      <Footer />

      {/* Destructive action confirmation */}
      <Modal
        open={showLogoutAllModal}
        onClose={() => setShowLogoutAllModal(false)}
        title="Revoke all active sessions?"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-danger-950/40 border border-danger-500/30 text-danger-300 flex items-start gap-2.5 text-xs">
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This will terminate all active logins and refresh token sessions across any browsers or
              mobile devices. You will need to request a new WhatsApp OTP to sign back in.
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutAllModal(false)}
              disabled={loggingOutAll}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loggingOutAll}
              onClick={handleLogoutAllDevices}
            >
              Yes, revoke all devices
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
