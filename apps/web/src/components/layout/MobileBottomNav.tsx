'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  BriefcaseIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { getDashboardForRole, normalizeRole } from '@/lib/roles'
import { getNavForRole } from '@/lib/dashboardNav'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: string
}

/**
 * MobileBottomNav — primary navigation on small screens.
 *
 * Rendered once globally from the root layout. Hidden on the marketing page,
 * auth screens, and the admin console (which has its own dense navigation).
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [user, setUser] = useState<UserState | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      setUser(stored ? JSON.parse(stored) : null)
    } catch {
      setUser(null)
    }
  }, [pathname])

  const hiddenRoutes = ['/', '/login', '/role-select', '/request-demo']
  if (hiddenRoutes.includes(pathname) || pathname.startsWith('/admin')) {
    return null
  }

  // Only render for signed-in users; anonymous visitors use the Navbar.
  if (!user) return null

  const role = normalizeRole(user.role)
  const isFleetSide = role === 'truck_driver'

  /**
   * Five primary destinations, derived from the same role navigation used by
   * the dashboard sidebar (`@/lib/dashboardNav`) so labels and routes never
   * drift between the two surfaces. Admins are excluded above.
   */
  const roleNav = getNavForRole(user.role)
  const pick = (key: string) => roleNav.find((item) => item.key === key)
  const label = (item?: { labelKey: string; label: string }, fallback = '') => {
    if (!item) return fallback
    const translated = t(item.labelKey)
    return translated === item.labelKey ? item.label : translated
  }

  const search = pick(isFleetSide ? 'find-loads' : 'find-trucks')
  const listings = pick(isFleetSide ? 'my-trucks' : 'my-loads')
  const bookings = pick('bookings')

  const items = [
    {
      key: 'home',
      name: t('mobileNav.home'),
      href: getDashboardForRole(user.role),
      icon: HomeIcon,
      active: pathname.startsWith('/dashboard'),
    },
    {
      key: 'search',
      name: t('mobileNav.search'),
      href: search?.href ?? '/search',
      icon: MagnifyingGlassIcon,
      active: pathname.startsWith('/search'),
    },
    {
      key: 'listings',
      name: label(listings, isFleetSide ? t('mobileNav.fleet') : t('mobileNav.loads')),
      href: listings?.href ?? (isFleetSide ? '/my-trucks' : '/my-loads'),
      icon: isFleetSide ? TruckIcon : ClipboardDocumentListIcon,
      active: pathname.startsWith(isFleetSide ? '/my-trucks' : '/my-loads'),
    },
    {
      key: 'bookings',
      name: label(bookings, t('dash.bookings')),
      href: bookings?.href ?? '/bookings',
      icon: BriefcaseIcon,
      active: pathname.startsWith('/booking'),
    },
    {
      key: 'profile',
      name: t('common.profile'),
      href: '/profile',
      icon: UserIcon,
      active: pathname === '/profile',
    },
  ]

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-hairline px-1 pt-1 pb-safe flex items-stretch justify-around"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl transition-colors min-w-0 flex-1 min-h-[52px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
              item.active
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-muted hover:text-ink'
            )}
          >
            <Icon className="w-[22px] h-[22px] shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none truncate w-full text-center">
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default MobileBottomNav
