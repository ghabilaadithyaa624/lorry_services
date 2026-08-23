'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TruckIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  DocumentCheckIcon,
  BellAlertIcon,
  ClockIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  MapIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  BanknotesIcon,
  UsersIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'
import { authApi } from '@/lib/api'
import { Badge } from '@/components/ui'
import { AIFreightAssistantDrawer } from '@/components/intelligence'
import { cn, formatPhone } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: 'load_owner' | 'truck_owner' | 'admin'
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  action,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore JSON error
    }
  }, [])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore
    }
    router.push('/login')
  }

  const isTruckOwner = user?.role === 'truck_owner'
  const isAdmin = user?.role === 'admin'

  const loadOwnerNav = [
    { name: 'Overview', href: '/dashboard/load-owner', icon: HomeIcon },
    { name: 'Find Trucks', href: '/search?type=truck', icon: MagnifyingGlassIcon },
    { name: 'Post Freight', href: '/post-load', icon: PlusCircleIcon },
    { name: 'My Loads', href: '/my-loads', icon: ClipboardDocumentListIcon },
    { name: 'Bookings', href: '/bookings', icon: BriefcaseIcon },
    { name: 'Tracking', href: '/tracking', icon: MapIcon },
    { name: 'Documents', href: '/documents', icon: DocumentCheckIcon },
    { name: 'Activity', href: '/activity', icon: ClockIcon },
    { name: 'Notifications', href: '/notifications', icon: BellAlertIcon },
    { name: 'Subscription', href: '/subscribe', icon: CreditCardIcon },
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    { name: 'Security', href: '/security', icon: LockClosedIcon },
  ]

  const truckOwnerNav = [
    { name: 'Overview', href: '/dashboard/truck-owner', icon: HomeIcon },
    { name: 'Find Loads', href: '/search?type=load', icon: MagnifyingGlassIcon },
    { name: 'My Fleet', href: '/my-trucks', icon: TruckIcon },
    { name: 'Trips', href: '/trips', icon: MapIcon },
    { name: 'Tracking', href: '/tracking', icon: MapIcon },
    { name: 'Documents', href: '/documents', icon: DocumentCheckIcon },
    { name: 'Activity', href: '/activity', icon: ClockIcon },
    { name: 'Notifications', href: '/notifications', icon: BellAlertIcon },
    { name: 'Subscription', href: '/subscribe', icon: CreditCardIcon },
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    { name: 'Security', href: '/security', icon: LockClosedIcon },
  ]

  const adminNav = [
    { name: 'Control Tower', href: '/admin', icon: ShieldCheckIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Freight', href: '/admin/listings', icon: ClipboardDocumentListIcon },
    { name: 'Fleet', href: '/admin/fleet', icon: TruckIcon },
    { name: 'Bookings', href: '/admin/bookings', icon: BriefcaseIcon },
    { name: 'Payments', href: '/admin/payments', icon: BanknotesIcon },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
    { name: 'Risk', href: '/admin/risk', icon: ShieldExclamationIcon },
    { name: 'Audit', href: '/admin/audit', icon: ClockIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'System', href: '/admin/system', icon: CommandLineIcon },
  ]

  const navItems = isTruckOwner ? truckOwnerNav : isAdmin ? adminNav : loadOwnerNav

  const roleLabel = isTruckOwner
    ? 'Truck Owner'
    : isAdmin
    ? 'Admin'
    : 'Load Owner'

  return (
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex font-sans selection:bg-primary-500 selection:text-white relative overflow-hidden">
      {/* ── Level 1 Sidebar Navigation ── */}
      <aside className="hidden md:flex md:w-[280px] md:flex-col shrink-0 bg-[#0F131D] border-r border-white/10 relative z-20">
        <div className="flex flex-col h-full min-h-screen">
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-black text-xs">
                <TruckIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              // Make active states strict for homepage vs deep links
              const isActive = item.href === '/admin' || item.href === '/dashboard/load-owner' || item.href === '/dashboard/truck-owner'
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500'
                      : 'text-surface-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary-400' : 'text-surface-500')} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Profile / Status */}
          <div className="p-4 border-t border-white/10 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="success" size="sm" className="font-sans">
                Network Online
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-800 text-surface-300 font-bold text-xs flex items-center justify-center shrink-0 border border-white/10">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LC'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || (user?.phone ? formatPhone(user.phone) : 'My Account')}
                </p>
                <p className="text-[10px] text-surface-400">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area (Level 0) ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-hidden">
        {/* Top Command Bar (Level 1) */}
        <header className="hidden md:flex h-16 bg-[#0F131D] border-b border-white/10 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-surface-400">
            <span>{roleLabel} Console</span>
            <span className="text-surface-600">/</span>
            <span className="text-white">{title || 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <MagnifyingGlassIcon className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Global search"
                placeholder="Global Search (Ctrl+K)"
                className="pl-9 pr-4 py-1.5 bg-surface-900 border border-white/10 rounded-md text-xs text-white focus:outline-none focus:border-primary-500 transition-colors w-64"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="text-surface-400 hover:text-white p-1 rounded-lg transition-colors relative focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
              >
                <BellAlertIcon className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="text-surface-400 hover:text-danger-400 p-1 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none cursor-pointer"
                title="Sign Out"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0F131D] border-b border-white/10 px-4 h-14 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-black text-xs">
              LC
            </div>
            <span className="font-bold text-base text-white">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant={isTruckOwner ? 'info' : 'primary'} size="sm" className="font-sans">
              {roleLabel}
            </Badge>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-1.5 rounded-lg text-surface-300 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
            >
              {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80  flex">
            <div className="w-64 bg-[#0F131D] border-r border-white/10 h-full flex flex-col justify-between shadow-2xl">
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                  <span className="font-bold text-sm text-white">Menu</span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === '/admin' || item.href === '/dashboard/load-owner' || item.href === '/dashboard/truck-owner'
                      ? pathname === item.href
                      : pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors font-sans',
                          isActive
                            ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500'
                            : 'text-surface-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                        )}
                      >
                        <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary-400' : 'text-surface-500')} />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              <div className="p-4 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-danger-400 rounded-md hover:bg-danger-950/30"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Optional Page Subheader */}
        {(title || action) && (
          <div className="bg-[#0F131D]/80  border-b border-white/10 py-5 px-4 sm:px-6 lg:px-8 shrink-0">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-surface-300 mt-1 max-w-3xl leading-relaxed font-sans">
                    {subtitle}
                  </p>
                )}
              </div>
              {action && <div className="flex items-center gap-3">{action}</div>}
            </div>
          </div>
        )}

        {/* Main Body Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto bg-[#070A11] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-20 md:pb-8">
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Navigation Bar ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F131D] border-t border-white/10 px-1 py-1 flex items-center justify-around shrink-0 pb-safe">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = item.href === '/admin' || item.href === '/dashboard/load-owner' || item.href === '/dashboard/truck-owner'
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-1.5 px-2 rounded-lg gap-1 min-w-0 flex-1 transition-colors font-sans',
                  isActive
                    ? 'text-primary-400'
                    : 'text-surface-500 hover:text-white'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary-400' : '')} />
                <span className="text-[10px] font-medium truncate w-full text-center leading-none">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <AIFreightAssistantDrawer />
    </div>
  )
}

export default DashboardLayout
