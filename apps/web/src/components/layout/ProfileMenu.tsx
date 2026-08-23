'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserCircleIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  BriefcaseIcon,
  MapIcon,
  BellAlertIcon,
  ClockIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { Avatar, Badge } from '@/components/ui'
import { useTheme } from '@/components/theme/ThemeProvider'
import { authApi } from '@/lib/api'
import { cn, formatPhone } from '@/lib/utils'

export interface ProfileMenuUser {
  id?: string
  phone?: string
  name?: string
  role?: 'load_owner' | 'truck_owner' | 'admin'
}

interface ProfileMenuProps {
  user: ProfileMenuUser
  /** Verification state from GET /users/me, when loaded. */
  verified?: boolean
  /** Active subscription state from GET /users/me, when loaded. */
  subscriptionActive?: boolean
  className?: string
}

const ROLE_LABEL: Record<string, string> = {
  load_owner: 'Load owner',
  truck_owner: 'Truck owner',
  admin: 'Administrator',
}

/**
 * ProfileMenu — authenticated account dropdown.
 *
 * Implements the WAI-ARIA menu-button pattern directly (roving focus, Arrow /
 * Home / End / Escape keys, outside-click dismissal, focus restoration) rather
 * than pulling a dropdown library into the shared layout bundle — this
 * component is rendered on every authenticated route, so its weight is paid
 * everywhere.
 *
 * Every destination is a route that exists under `src/app`; role-specific
 * entries are filtered so users are never shown a link they cannot open.
 */
export function ProfileMenu({
  user,
  verified,
  subscriptionActive,
  className,
}: ProfileMenuProps) {
  const router = useRouter()
  const { resolvedTheme, toggleTheme } = useTheme()

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isTruckOwner = user.role === 'truck_owner'
  const isAdmin = user.role === 'admin'

  const displayName = user.name?.trim() || (user.phone ? formatPhone(user.phone) : 'My account')

  /** All focusable menu items, in DOM order. */
  const getItems = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []
      ),
    []
  )

  const focusItem = useCallback(
    (index: number) => {
      const items = getItems()
      if (items.length === 0) return
      const bounded = (index + items.length) % items.length
      items[bounded]?.focus()
    },
    [getItems]
  )

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }, [])

  // Dismiss on outside pointer press.
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open])

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) {
      // Defer until the panel is committed to the DOM.
      const id = window.requestAnimationFrame(() => focusItem(0))
      return () => window.cancelAnimationFrame(id)
    }
  }, [open, focusItem])

  const handleButtonKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      window.requestAnimationFrame(() => focusItem(-1))
    }
  }

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = getItems()
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'ArrowDown':
        event.preventDefault()
        focusItem(currentIndex + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItem(currentIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        focusItem(0)
        break
      case 'End':
        event.preventDefault()
        focusItem(-1)
        break
      case 'Tab':
        // Tabbing away closes the menu without stealing focus back.
        setOpen(false)
        break
      default:
        break
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Local credentials are cleared by authApi regardless of API result.
    }
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  // Only routes that exist under src/app are listed here.
  const primaryLinks = isAdmin
    ? [
        { name: 'Profile', href: '/profile', icon: UserCircleIcon },
        { name: 'Control tower', href: '/admin/dashboard', icon: ShieldCheckIcon },
        { name: 'KYC queue', href: '/admin/kyc', icon: DocumentCheckIcon },
        { name: 'Bookings', href: '/admin/bookings', icon: BriefcaseIcon },
      ]
    : [
        { name: 'Profile', href: '/profile', icon: UserCircleIcon },
        isTruckOwner
          ? { name: 'My trucks', href: '/my-trucks', icon: TruckIcon }
          : { name: 'My loads', href: '/my-loads', icon: ClipboardDocumentListIcon },
        { name: 'Bookings', href: '/bookings', icon: BriefcaseIcon },
        { name: 'Tracking', href: '/tracking', icon: MapIcon },
      ]

  const secondaryLinks = isAdmin
    ? [
        { name: 'Intelligence', href: '/admin/intelligence', icon: ChartBarIcon },
        { name: 'Risk', href: '/admin/risk', icon: ShieldCheckIcon },
      ]
    : [
        { name: 'Notifications', href: '/notifications', icon: BellAlertIcon },
        { name: 'Activity', href: '/activity', icon: ClockIcon },
        { name: 'Documents', href: '/documents', icon: DocumentCheckIcon },
        { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
      ]

  const tertiaryLinks = [
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    { name: 'Help & support', href: '/help', icon: QuestionMarkCircleIcon },
  ]

  const itemClass =
    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-body transition-colors cursor-pointer text-left hover:bg-wash hover:text-ink focus:outline-none focus-visible:bg-wash focus-visible:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500'

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full border border-hairline hover:border-hairline-strong bg-panel hover:bg-sunken transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas min-h-[40px]"
      >
        <Avatar name={user.name} fallback={user.phone} size="xs" accent />
        <span className="hidden lg:block text-xs font-semibold text-ink max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDownIcon
          className={cn(
            'w-4 h-4 text-subtle shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-panel glass-strong shadow-modal z-50 overflow-hidden animate-fade-in"
        >
          {/* Identity header */}
          <div className="p-4 border-b border-hairline">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} fallback={user.phone} size="md" accent />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
                {user.phone && (
                  <p className="text-xs text-muted truncate font-mono">{formatPhone(user.phone)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <Badge variant={isAdmin ? 'danger' : isTruckOwner ? 'info' : 'primary'} size="sm">
                {ROLE_LABEL[user.role || 'load_owner']}
              </Badge>

              {verified && (
                <Badge variant="success" size="sm">
                  <CheckBadgeIcon className="w-3 h-3" aria-hidden="true" />
                  Verified
                </Badge>
              )}

              {!isAdmin && (
                <Badge variant={subscriptionActive ? 'success' : 'neutral'} size="sm">
                  {subscriptionActive ? 'Plan active' : 'Free plan'}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-1.5 border-b border-hairline">
            {primaryLinks.map((link) => (
              <MenuLink
                key={link.href}
                {...link}
                className={itemClass}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>

          <div className="p-1.5 border-b border-hairline">
            {secondaryLinks.map((link) => (
              <MenuLink
                key={link.href}
                {...link}
                className={itemClass}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>

          <div className="p-1.5 border-b border-hairline">
            {tertiaryLinks.map((link) => (
              <MenuLink
                key={link.href}
                {...link}
                className={itemClass}
                onNavigate={() => setOpen(false)}
              />
            ))}

            {/* Theme toggle — persists via ThemeProvider; menu stays open so
                the change is immediately visible. */}
            <button
              type="button"
              role="menuitem"
              onClick={toggleTheme}
              className={itemClass}
            >
              {resolvedTheme === 'dark' ? (
                <SunIcon className="w-[18px] h-[18px] text-subtle shrink-0" aria-hidden="true" />
              ) : (
                <MoonIcon className="w-[18px] h-[18px] text-subtle shrink-0" aria-hidden="true" />
              )}
              <span>{resolvedTheme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
            </button>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-danger-600 dark:text-danger-400 transition-colors cursor-pointer text-left hover:bg-danger-500/10 focus:outline-none focus-visible:bg-danger-500/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger-500"
            >
              <ArrowRightOnRectangleIcon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Single navigation row inside the profile menu. */
function MenuLink({
  name,
  href,
  icon: Icon,
  className,
  onNavigate,
}: {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  className: string
  onNavigate: () => void
}) {
  return (
    <Link href={href} role="menuitem" onClick={onNavigate} className={className}>
      <Icon className="w-[18px] h-[18px] text-subtle shrink-0" aria-hidden="true" />
      <span>{name}</span>
    </Link>
  )
}

export default ProfileMenu
