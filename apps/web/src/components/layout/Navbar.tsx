'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Truck,
  Search,
  PlusCircle,
  CreditCard,
  Menu,
  X,
  Bell,
  LayoutDashboard,
} from 'lucide-react'
import { usersApi } from '@/lib/api'
import { ProfileMenu, type ProfileMenuUser } from './ProfileMenu'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Navbar — top-level application chrome.
 *
 * Shows marketing navigation on the public landing page and role-aware
 * application navigation once signed in. Uses a glass surface, which is one of
 * the contexts where frosting is appropriate.
 */
export function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<ProfileMenuUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [verified, setVerified] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(false)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) setUser(JSON.parse(storedUser))
      else setUser(null)
    } catch {
      setUser(null)
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  /**
   * Load the notification badge and account status.
   * Failures are silent: the badge is supplementary and must never block chrome.
   */
  const loadAccountSignals = useCallback(async () => {
    if (!user) return
    try {
      const [notifications, profile] = await Promise.allSettled([
        usersApi.getNotifications(),
        usersApi.getProfile(),
      ])
      if (notifications.status === 'fulfilled') {
        setUnreadCount(notifications.value.data?.unreadCount || 0)
      }
      if (profile.status === 'fulfilled') {
        setVerified(Boolean(profile.value.data?.verification?.isVerifiedTransporter))
        setSubscriptionActive(Boolean(profile.value.data?.subscription?.isActive))
      }
    } catch {
      // Non-critical.
    }
  }, [user])

  useEffect(() => {
    loadAccountSignals()
  }, [loadAccountSignals])

  // Auth screens render without global chrome.
  if (pathname === '/login' || pathname === '/role-select') return null

  const isPublicPage = pathname === '/'

  const publicNavLinks = [
    { name: 'Platform', href: '/#live-network' },
    { name: 'For shippers', href: '/search?type=truck' },
    { name: 'For fleet owners', href: '/search?type=load' },
    { name: 'Pricing', href: '/subscribe' },
  ]

  const appNavLinks = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname.startsWith('/dashboard'),
    },
    {
      name: 'Find trucks',
      href: '/search?type=truck',
      icon: Truck,
      active: pathname.startsWith('/search'),
    },
    {
      name: 'Find loads',
      href: '/search?type=load',
      icon: Search,
      active: false,
    },
    {
      name: 'Pricing',
      href: '/subscribe',
      icon: CreditCard,
      active: pathname.startsWith('/subscribe'),
    },
  ]

  const navLinks = isPublicPage ? publicNavLinks : appNavLinks

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-shadow duration-200 border-b glass',
        scrolled ? 'shadow-card border-hairline' : 'border-hairline'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand + desktop navigation */}
          <div className="flex items-center gap-8 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas shrink-0"
            >
              <span
                className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                aria-hidden="true"
              >
                <Truck className="w-[18px] h-[18px] stroke-[2.4]" />
              </span>
              <span className="text-lg font-bold tracking-tight text-ink leading-none">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
              {navLinks.map((link: any) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                      link.active
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
                        : 'text-body hover:text-ink hover:bg-wash'
                    )}
                    aria-current={link.active ? 'page' : undefined}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    <span>{link.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  href="/notifications"
                  className="relative p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={
                    unreadCount > 0
                      ? `Notifications, ${unreadCount} unread`
                      : 'Notifications'
                  }
                >
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-canvas"
                      aria-hidden="true"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="hidden sm:block">
                  <ProfileMenu
                    user={user}
                    verified={verified}
                    subscriptionActive={subscriptionActive}
                  />
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button as={Link} href="/login" variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button
                  as={Link}
                  href="/login?redirect=/post-load"
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Post freight
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-t border-hairline bg-panel px-4 py-4 space-y-3 shadow-elevated animate-fade-in"
        >
          <nav className="space-y-1" aria-label="Mobile">
            {navLinks.map((link: any) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-hairline space-y-2">
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:bg-wash min-h-[44px]"
                >
                  Profile & account
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:bg-wash min-h-[44px]"
                >
                  Settings
                </Link>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button as={Link} href="/login" variant="secondary" size="md" fullWidth>
                  Sign in
                </Button>
                <Button
                  as={Link}
                  href="/login?redirect=/post-load"
                  variant="primary"
                  size="md"
                  fullWidth
                >
                  Post freight
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
