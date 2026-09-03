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

  type Language = 'en' | 'ta'
  const [lang, setLang] = useState<Language>('en')

  const navTabs = [
    {
      nameEn: 'Find Trucks',
      nameTa: 'சரக்கு வண்டிகள்',
      href: '/search?type=truck',
      icon: Truck,
      active: pathname === '/search' && typeof window !== 'undefined' ? window.location.search.includes('truck') : pathname === '/search/trucks',
    },
    {
      nameEn: 'Find Loads',
      nameTa: 'சுமை தேடல்',
      href: '/search?type=load',
      icon: Search,
      active: pathname === '/search' && typeof window !== 'undefined' ? window.location.search.includes('load') : pathname === '/my-loads',
    },
    {
      nameEn: 'Pricing & Plans',
      nameTa: 'கட்டண திட்டங்கள்',
      href: '/subscribe',
      icon: CreditCard,
      active: pathname.startsWith('/subscribe') || pathname.startsWith('/subscription'),
    },
    {
      nameEn: 'Control Tower',
      nameTa: 'கட்டுப்பாட்டு அறை',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/tracking'),
      badge: 'LIVE',
    },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-200 border-b glass',
        scrolled ? 'shadow-card border-hairline bg-surface/95 backdrop-blur-md' : 'border-hairline bg-surface/85 backdrop-blur-sm'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[70px]">
          {/* Brand + Language Toggle */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
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
              <span className="text-lg sm:text-xl font-bold tracking-tight text-ink leading-none">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>

            {/* Subtle Divider */}
            <div className="h-5 sm:h-6 w-px bg-hairline" aria-hidden="true" />

            {/* Language Toggle Beside Logo (தமிழ் | English) */}
            <div
              role="radiogroup"
              aria-label="Language selector"
              className="inline-flex items-center p-0.5 rounded-full bg-wash border border-hairline text-xs font-medium shrink-0"
            >
              <button
                type="button"
                role="radio"
                aria-checked={lang === 'ta'}
                onClick={() => setLang('ta')}
                className={cn(
                  'px-2.5 py-1 rounded-full transition-all text-xs leading-none font-medium',
                  lang === 'ta'
                    ? 'bg-primary-500 text-white shadow-xs font-semibold'
                    : 'text-muted hover:text-ink'
                )}
              >
                தமிழ்
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lang === 'en'}
                onClick={() => setLang('en')}
                className={cn(
                  'px-2.5 py-1 rounded-full transition-all text-xs leading-none font-medium',
                  lang === 'en'
                    ? 'bg-primary-500 text-white shadow-xs font-semibold'
                    : 'text-muted hover:text-ink'
                )}
              >
                English
              </button>
            </div>
          </div>

          {/* Center Navigation: Four Main Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Primary Navigation">
            {navTabs.map((tab) => {
              const Icon = tab.icon
              const active = tab.active
              return (
                <Link
                  key={tab.nameEn}
                  href={tab.href}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    active
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10 shadow-2xs'
                      : 'text-body hover:text-ink hover:bg-wash'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{lang === 'ta' ? tab.nameTa : tab.nameEn}</span>
                  {tab.badge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {tab.badge}
                    </span>
                  )}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Side: Bright Orange Post Freight CTA & Account */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bright Orange Post Freight CTA Button */}
            <Link
              href="/post-load"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 active:scale-[0.98] shrink-0 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span className="whitespace-nowrap font-sans">
                {lang === 'ta' ? 'சுமை பதிவிடுக' : 'Post Freight'}
              </span>
            </Link>

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
              <div className="hidden md:flex items-center gap-2">
                <Button as={Link} href="/login" variant="ghost" size="sm">
                  {lang === 'ta' ? 'உள்நுழைய' : 'Sign in'}
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

      {/* Mobile / Tablet Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-t border-hairline bg-panel px-4 py-5 space-y-4 shadow-elevated animate-fade-in max-h-[calc(100vh-70px)] overflow-y-auto"
        >
          {/* Mobile Language Switcher */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-wash border border-hairline">
            <span className="text-xs font-semibold text-muted">
              {lang === 'ta' ? 'மொழி (Language):' : 'Language / மொழி:'}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setLang('ta')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  lang === 'ta' ? 'bg-primary-500 text-white font-bold' : 'text-muted hover:text-ink'
                )}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  lang === 'en' ? 'bg-primary-500 text-white font-bold' : 'text-muted hover:text-ink'
                )}
              >
                English
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Mobile">
            {navTabs.map((tab) => {
              const Icon = tab.icon
              const active = tab.active
              return (
                <Link
                  key={tab.nameEn}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]',
                    active
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'text-body hover:text-ink hover:bg-wash'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-muted" aria-hidden="true" />
                    <span>{lang === 'ta' ? tab.nameTa : tab.nameEn}</span>
                  </div>
                  {tab.badge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {tab.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Full-Width Mobile CTA */}
          <div className="pt-2">
            <Link
              href="/post-load"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-md shadow-orange-500/25"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{lang === 'ta' ? 'சரக்கு சுமை பதிவிடுக' : 'Post Freight Load'}</span>
            </Link>
          </div>

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
              <div className="grid grid-cols-1 gap-2">
                <Button as={Link} href="/login" variant="secondary" size="md" fullWidth>
                  {lang === 'ta' ? 'கணக்கு உள்நுழைவு' : 'Sign in to account'}
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
