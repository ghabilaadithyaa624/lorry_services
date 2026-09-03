'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TruckIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  DocumentCheckIcon,
  BellAlertIcon,
  ClockIcon,
  Cog6ToothIcon,
  MapIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  UsersIcon,
  GlobeAsiaAustraliaIcon,
} from '@heroicons/react/24/outline'
import { notificationsApi, usersApi } from '@/lib/api'
import { Avatar } from '@/components/ui'
import { ProfileMenu, type ProfileMenuUser } from './ProfileMenu'
import { LanguageToggle } from './LanguageToggle'
import { AIFreightAssistantDrawer } from '@/components/intelligence'
import { useI18n } from '@/lib/i18n'
import { cn, formatPhone } from '@/lib/utils'
import { getRoleLabel, isVehicleSideRole } from '@/lib/roles'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Rendered as a count pill (e.g. unread notifications). */
  badgeKey?: 'notifications'
}

/**
 * Authenticated application shell.
 *
 * Provides the persistent sidebar, top bar, and mobile navigation. Every route
 * referenced below exists under `src/app` — the navigation deliberately avoids
 * advertising screens that would 404.
 */
export function DashboardLayout({ children, title, subtitle, action }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [user, setUser] = useState<ProfileMenuUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [verified, setVerified] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // Ignore malformed local state; the API remains the source of truth.
    }
  }, [])

  const loadSignals = useCallback(async () => {
    try {
      const [notifications, profile] = await Promise.allSettled([
        notificationsApi.getUnreadCount(),
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
      // Supplementary data only.
    }
  }, [])

  useEffect(() => {
    loadSignals()
    const interval = setInterval(loadSignals, 30_000)
    return () => clearInterval(interval)
  }, [loadSignals])

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isTruckOwner = isVehicleSideRole(user?.role)
  const isDriver = user?.role === 'driver'
  const isAdmin = user?.role === 'admin'

  const loadOwnerNav: NavItem[] = [
    { name: t('dash.overview'), href: '/dashboard/load-owner', icon: HomeIcon },
    { name: t('nav.findTrucks'), href: '/search?type=truck', icon: MagnifyingGlassIcon },
    { name: t('nav.postFreight'), href: '/post-load', icon: PlusCircleIcon },
    { name: t('dash.myLoads'), href: '/my-loads', icon: ClipboardDocumentListIcon },
    { name: t('dash.bookings'), href: '/bookings', icon: BriefcaseIcon },
    { name: t('dash.tracking'), href: '/tracking', icon: MapIcon },
    { name: t('dash.analytics'), href: '/analytics', icon: ChartBarIcon },
    { name: t('dash.documents'), href: '/documents', icon: DocumentCheckIcon },
    { name: t('dash.activity'), href: '/activity', icon: ClockIcon },
    { name: t('nav.notifications'), href: '/notifications', icon: BellAlertIcon, badgeKey: 'notifications' },
    { name: t('dash.subscription'), href: '/subscribe', icon: CreditCardIcon },
    { name: t('nav.settings'), href: '/settings', icon: Cog6ToothIcon },
  ]

  const truckOwnerNav: NavItem[] = [
    { name: t('dash.overview'), href: '/dashboard/truck-owner', icon: HomeIcon },
    { name: t('nav.findLoads'), href: '/search?type=load', icon: MagnifyingGlassIcon },
    { name: t('dash.myFleet'), href: '/my-trucks', icon: TruckIcon },
    { name: t('dash.bookings'), href: '/bookings', icon: BriefcaseIcon },
    { name: t('dash.tracking'), href: '/tracking', icon: MapIcon },
    { name: t('dash.analytics'), href: '/analytics', icon: ChartBarIcon },
    { name: t('dash.documents'), href: '/documents', icon: DocumentCheckIcon },
    { name: t('dash.activity'), href: '/activity', icon: ClockIcon },
    { name: t('nav.notifications'), href: '/notifications', icon: BellAlertIcon, badgeKey: 'notifications' },
    { name: t('dash.subscription'), href: '/subscribe', icon: CreditCardIcon },
    { name: t('nav.settings'), href: '/settings', icon: Cog6ToothIcon },
  ]

  const adminNav: NavItem[] = [
    { name: 'Control tower', href: '/admin/dashboard', icon: ShieldCheckIcon },
    { name: 'KYC queue', href: '/admin/kyc', icon: DocumentCheckIcon },
    { name: 'Listings', href: '/admin/listings', icon: ClipboardDocumentListIcon },
    { name: 'Bookings', href: '/admin/bookings', icon: BriefcaseIcon },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Intelligence', href: '/admin/intelligence', icon: GlobeAsiaAustraliaIcon },
    { name: 'Risk', href: '/admin/risk', icon: ShieldExclamationIcon },
  ]

  const navItems = isAdmin
    ? adminNav
    : isTruckOwner
      ? truckOwnerNav.map((item) =>
          isDriver && item.href === '/dashboard/truck-owner'
            ? { ...item, href: '/dashboard/driver' }
            : item
        )
      : loadOwnerNav

  const roleLabel = getRoleLabel(user?.role)

  /** Exact match for section roots, prefix match for nested routes. */
  const isActiveRoute = (href: string) => {
    const path = href.split('?')[0]
    const roots = ['/admin/dashboard', '/dashboard/load-owner', '/dashboard/truck-owner']
    if (roots.includes(path)) return pathname === path
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const renderNavLink = (item: NavItem, onNavigate?: () => void) => {
    const Icon = item.icon
    const active = isActiveRoute(item.href)
    const badge = item.badgeKey === 'notifications' ? unreadCount : 0

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
          active
            ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
            : 'text-body hover:bg-wash hover:text-ink'
        )}
      >
        <Icon
          className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-primary-500' : 'text-subtle')}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0 truncate">{item.name}</span>
        {badge > 0 && (
          <span
            className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center"
            aria-label={`${badge} unread`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-canvas text-body flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-[264px] md:flex-col shrink-0 bg-panel border-r border-hairline">
        <div className="flex flex-col h-screen sticky top-0">
          <div className="h-16 flex items-center px-5 border-b border-hairline shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span
                className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white"
                aria-hidden="true"
              >
                <TruckIcon className="w-[18px] h-[18px] stroke-[2.2]" />
              </span>
              <span className="font-bold text-base tracking-tight text-ink">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Sidebar">
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          <div className="p-3 border-t border-hairline shrink-0">
            <Link
              href="/profile"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Avatar name={user?.name} fallback={user?.phone} size="sm" />
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-ink truncate">
                  {user?.name || (user?.phone ? formatPhone(user.phone) : 'My account')}
                </span>
                <span className="block text-[11px] text-subtle">{roleLabel}</span>
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar */}
        <header className="hidden md:flex h-16 glass border-b border-hairline px-6 lg:px-8 items-center justify-between shrink-0 sticky top-0 z-30">
          <p className="text-sm text-muted truncate">
            <span>{roleLabel}</span>
            <span className="mx-2 text-subtle" aria-hidden="true">
              /
            </span>
            <span className="text-ink font-medium">{title || t('dash.dashboardFallbackTitle')}</span>
          </p>

          <div className="flex items-center gap-3">
            {/* Top-bar language selector — தமிழ் | हिन्दी | English */}
            <LanguageToggle compact className="hidden lg:inline-flex" />

            <Link
              href="/notifications"
              className="relative p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <BellAlertIcon className="w-5 h-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-panel"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {user && (
              <ProfileMenu
                user={user}
                verified={verified}
                subscriptionActive={subscriptionActive}
              />
            )}
          </div>
        </header>

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 glass border-b border-hairline px-4 h-14 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white"
              aria-hidden="true"
            >
              <TruckIcon className="w-[18px] h-[18px] stroke-[2.2]" />
            </span>
            <span className="font-bold text-base text-ink">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-muted hover:text-ink hover:bg-wash min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <BellAlertIcon className="w-5 h-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-panel"
                  aria-hidden="true"
                />
              )}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-mobile-nav"
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-2 rounded-lg text-muted hover:text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Bars3Icon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div
              id="dashboard-mobile-nav"
              className="relative w-[280px] max-w-[85vw] bg-panel border-r border-hairline h-full flex flex-col shadow-modal"
            >
              <div className="flex items-center justify-between p-4 border-b border-hairline shrink-0">
                <span className="font-semibold text-sm text-ink">{t('common.menu')}</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-lg text-muted hover:text-ink hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Mobile sidebar">
                {navItems.map((item) => renderNavLink(item, () => setSidebarOpen(false)))}
              </nav>

              <div className="p-3 border-t border-hairline shrink-0 space-y-2">
                {/* Top-bar language selector — mobile drawer placement */}
                <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="text-xs font-medium text-muted">{t('common.language')}</span>
                  <LanguageToggle compact />
                </div>
                <Link
                  href="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-body hover:bg-wash min-h-[44px]"
                >
                  <UserCircleIcon className="w-[18px] h-[18px] text-subtle" aria-hidden="true" />
                  <span>{t('common.profile')}</span>
                </Link>
                <Link
                  href="/help"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-body hover:bg-wash min-h-[44px]"
                >
                  <ShieldCheckIcon className="w-[18px] h-[18px] text-subtle" aria-hidden="true" />
                  <span>{t('common.helpSupport')}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Optional page subheader (legacy title/action API) */}
        {(title || action) && (
          <div className="border-b border-hairline bg-panel py-5 px-4 sm:px-6 lg:px-8 shrink-0">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                {title && (
                  <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-sm text-muted mt-1 max-w-3xl leading-relaxed">{subtitle}</p>
                )}
              </div>
              {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
            </div>
          </div>
        )}

        {/* Page content */}
        <main id="main-content" className="flex-1 bg-canvas p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-24 md:pb-8">{children}</div>
        </main>
      </div>

      <AIFreightAssistantDrawer />
    </div>
  )
}

export default DashboardLayout
