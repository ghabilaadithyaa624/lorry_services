'use client'

import React, { Suspense, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Truck,
  PackageSearch,
  CreditCard,
  RadioTower,
  PlusCircle,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { usersApi } from '@/lib/api'
import { ProfileMenu, type ProfileMenuUser } from './ProfileMenu'
import { LanguageToggle } from './LanguageToggle'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Navbar — LorryCarry global header.
 *
 * Redesigned navigation chrome (Navigation & Header Redesign):
 * - Fixed top bar with a spacer so page content is never obscured.
 * - Four primary tabs — Find Trucks, Find Loads, Pricing & Plans, Control
 *   Tower — with route-aware active states, inline on desktop (xl+) and in
 *   the drawer on mobile/tablet.
 * - Bright orange “Post Freight” CTA pinned to the right at every breakpoint
 *   (icon-only on phones); anonymous operators are routed through sign-in.
 * - தமிழ் | English language toggle beside the logo (compact on phones).
 * - Glass surface, which is one of the contexts where frosting is appropriate.
 */

interface MainTab {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const MAIN_TABS: MainTab[] = [
  { name: 'Find Trucks', href: '/search?type=truck', icon: Truck },
  { name: 'Find Loads', href: '/search?type=load', icon: PackageSearch },
  { name: 'Pricing & Plans', href: '/subscribe', icon: CreditCard },
  { name: 'Control Tower', href: '/tracking', icon: RadioTower },
]

/** Route-aware active state for the four primary tabs. */
function isTabActive(tab: MainTab, pathname: string, searchType: string | null): boolean {
  if (tab.href.startsWith('/search')) {
    if (pathname !== '/search') return false
    const wantsLoads = tab.href.includes('type=load')
    // The search workspace defaults to the trucks board when no type is set.
    return wantsLoads ? searchType === 'load' : searchType !== 'load'
  }
  if (tab.href === '/subscribe') {
    // Exact section match — avoids highlighting Pricing on /subscription.
    return pathname === '/subscribe' || pathname.startsWith('/subscribe/')
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`)
}

interface MainTabLinksProps {
  pathname: string
  searchType: string | null
  variant: 'desktop' | 'drawer'
  onNavigate?: () => void
}

function MainTabLinks({ pathname, searchType, variant, onNavigate }: MainTabLinksProps) {
  return (
    <>
      {MAIN_TABS.map((tab) => {
        const Icon = tab.icon
        const active = isTabActive(tab, pathname, searchType)
        if (variant === 'drawer') {
          return (
            <Link
              key={tab.name}
              href={tab.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                active
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
                  : 'text-body hover:text-ink hover:bg-wash'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span>{tab.name}</span>
            </Link>
          )
        }
        return (
          <Link
            key={tab.name}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              active
                ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
                : 'text-body hover:text-ink hover:bg-wash'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{tab.name}</span>
          </Link>
        )
      })}
    </>
  )
}

/**
 * Resolves the ?type= search param for tab highlighting. Kept in a child
 * component under <Suspense> so statically prerendered pages (e.g. the
 * landing page) can stream the fallback without a CSR bailout.
 */
function SearchAwareTabLinks({
  variant,
  onNavigate,
}: {
  variant: 'desktop' | 'drawer'
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (
    <MainTabLinks
      pathname={pathname}
      searchType={searchParams.get('type')}
      variant={variant}
      onNavigate={onNavigate}
    />
  )
}

function TabLinks(props: { variant: 'desktop' | 'drawer'; onNavigate?: () => void }) {
  const pathname = usePathname()
  const fallback = (
    <MainTabLinks pathname={pathname} searchType={null} variant={props.variant} onNavigate={props.onNavigate} />
  )
  return (
    <Suspense fallback={fallback}>
      <SearchAwareTabLinks variant={props.variant} onNavigate={props.onNavigate} />
    </Suspense>
  )
}

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

  // The CTA is the highest-visibility action in the product; signed-out
  // operators are routed through sign-in and land back on the posting flow.
  const postFreightHref = user ? '/post-load' : '/login?redirect=/post-load'

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 w-full transition-shadow duration-200 border-b glass',
          scrolled ? 'shadow-card border-hairline' : 'border-hairline'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-16">
            {/* Brand + language toggle + desktop tabs */}
            <div className="flex items-center gap-3 lg:gap-4 min-w-0">
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
                <span className="hidden min-[380px]:block text-lg font-bold tracking-tight text-ink leading-none">
                  Lorry<span className="text-primary-500">Carry</span>
                </span>
              </Link>

              {/* Language toggle — beside the logo at every breakpoint */}
              <div className="hidden sm:block shrink-0">
                <LanguageToggle />
              </div>
              <div className="sm:hidden shrink-0">
                <LanguageToggle compact />
              </div>

              {/* Primary tabs — desktop */}
              <nav className="hidden xl:flex items-center gap-1" aria-label="Primary">
                <TabLinks variant="desktop" />
              </nav>
            </div>

            {/* Right side — CTA, notifications, account */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user && (
                <Link
                  href="/notifications"
                  className="relative p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center"
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
              )}

              {/* Bright orange “Post Freight” CTA — always visible on the right */}
              <Button
                as={Link}
                href={postFreightHref}
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="hidden sm:inline-flex bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
              >
                Post Freight
              </Button>
              {/* Icon-only CTA keeps the action one tap away on phones */}
              <Link
                href={postFreightHref}
                aria-label="Post Freight"
                className="sm:hidden inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-button bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow-primary border border-primary-500/40 transition-colors hover:from-primary-600 hover:to-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <PlusCircle className="w-5 h-5" aria-hidden="true" />
              </Link>

              {user ? (
                <div className="hidden sm:block">
                  <ProfileMenu
                    user={user}
                    verified={verified}
                    subscriptionActive={subscriptionActive}
                  />
                </div>
              ) : (
                <Button
                  as={Link}
                  href="/login"
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Sign in
                </Button>
              )}

              {/* Mobile / tablet menu toggle */}
              <button
                type="button"
                className="xl:hidden p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
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

        {/* Mobile / tablet drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="xl:hidden border-t border-hairline bg-panel px-4 py-4 space-y-3 shadow-elevated animate-fade-in"
          >
            <nav className="space-y-1" aria-label="Primary">
              <TabLinks variant="drawer" onNavigate={() => setMobileMenuOpen(false)} />
            </nav>

            {/* Full-size language control inside the drawer */}
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-sunken/60 border border-hairline">
              <span className="text-sm font-medium text-body">Language / மொழி</span>
              <LanguageToggle />
            </div>

            <div className="pt-3 border-t border-hairline space-y-2">
              {user ? (
                <>
                  <Button
                    as={Link}
                    href={postFreightHref}
                    variant="primary"
                    size="md"
                    fullWidth
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
                  >
                    Post Freight
                  </Button>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
                  >
                    Profile & account
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
                  >
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[11px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
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
                    href={postFreightHref}
                    variant="primary"
                    size="md"
                    fullWidth
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
                  >
                    Post Freight
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer keeps page content clear of the fixed header. */}
      <div aria-hidden="true" className="h-16 shrink-0" />
    </>
  )
}

export default Navbar
