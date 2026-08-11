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
} from '@heroicons/react/24/outline'
import { authApi } from '@/lib/api'
import { Badge, Button } from '@/components/ui'
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

  const navigationItems = isTruckOwner
    ? [
        {
          name: 'Overview',
          href: '/dashboard/truck-owner',
          icon: HomeIcon,
          active: pathname === '/dashboard/truck-owner',
        },
        {
          name: 'Find Loads',
          href: '/search?type=load',
          icon: MagnifyingGlassIcon,
          active: pathname === '/search',
        },
        {
          name: 'Fleet Operating System',
          href: '/my-trucks',
          icon: ClipboardDocumentListIcon,
          active: pathname.startsWith('/my-trucks'),
        },
        {
          name: 'Subscription',
          href: '/subscribe',
          icon: CreditCardIcon,
          active: pathname.startsWith('/subscribe'),
        },
      ]
    : isAdmin
    ? [
        {
          name: 'Admin Console',
          href: '/admin',
          icon: ShieldCheckIcon,
          active: pathname === '/admin',
        },
        {
          name: 'Marketplace Search',
          href: '/search',
          icon: MagnifyingGlassIcon,
          active: pathname === '/search',
        },
      ]
    : [
        {
          name: 'Overview',
          href: '/dashboard/load-owner',
          icon: HomeIcon,
          active: pathname === '/dashboard/load-owner',
        },
        {
          name: 'Find Trucks',
          href: '/search?type=truck',
          icon: MagnifyingGlassIcon,
          active: pathname === '/search',
        },
        {
          name: 'Post a Load',
          href: '/post-load',
          icon: PlusCircleIcon,
          active: pathname === '/post-load',
        },
        {
          name: 'My Posted Loads',
          href: '/my-loads',
          icon: ClipboardDocumentListIcon,
          active: pathname === '/my-loads',
        },
        {
          name: 'B2B Sourcing (RFF)',
          href: '/procurement',
          icon: DocumentCheckIcon,
          active: pathname === '/procurement',
        },
        {
          name: 'Subscription',
          href: '/subscribe',
          icon: CreditCardIcon,
          active: pathname.startsWith('/subscribe'),
        },
      ]

  const accountNavigationItems = [
    {
      name: 'User Profile',
      href: '/profile',
      icon: UserCircleIcon,
      active: pathname === '/profile',
    },
    {
      name: 'KYC & Documents',
      href: '/documents',
      icon: DocumentCheckIcon,
      active: pathname === '/documents',
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: BellAlertIcon,
      active: pathname === '/notifications',
    },
    {
      name: 'Activity Log',
      href: '/activity',
      icon: ClockIcon,
      active: pathname === '/activity',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      active: pathname === '/settings',
    },
    {
      name: 'Security & Sessions',
      href: '/security',
      icon: LockClosedIcon,
      active: pathname === '/security',
    },
  ]

  const roleLabel = isTruckOwner
    ? 'Lorry Owner'
    : isAdmin
    ? 'Admin'
    : 'Load Owner'

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark text-surface-900 dark:text-surface-100 flex flex-col md:flex-row">
      {/* ── Desktop Sidebar Navigation ── */}
      <aside className="hidden md:flex md:w-64 md:flex-col shrink-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
        <div className="flex flex-col h-full min-h-screen">
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-surface-100 dark:border-surface-800">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-sm">
                <TruckIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight leading-none">
                  Lorry<span className="text-primary-500">Carry</span>
                </span>
                <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-0.5">
                  Operations Center
                </span>
              </div>
            </Link>
          </div>

          {/* User Profile Card */}
          <div className="p-4 border-b border-surface-100 dark:border-surface-800">
            <Link
              href="/profile"
              className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-700/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LC'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-surface-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                  {user?.name || (user?.phone ? formatPhone(user.phone) : 'My Account')}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={isTruckOwner ? 'info' : 'primary'} size="sm" dot>
                    {roleLabel}
                  </Badge>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* Primary Workspace */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">
                Marketplace Workspace
              </span>
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150',
                      item.active
                        ? 'bg-primary-500 text-white shadow-xs'
                        : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', item.active ? 'text-white' : 'text-surface-400')} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Account & Operations Center */}
            <div className="space-y-1 pt-2 border-t border-surface-100 dark:border-surface-800">
              <span className="px-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">
                Account Center
              </span>
              {accountNavigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150',
                      item.active
                        ? 'bg-primary-500 text-white shadow-xs'
                        : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', item.active ? 'text-white' : 'text-surface-400')} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Quick Post / Fleet Action */}
          <div className="p-4 border-t border-surface-100 dark:border-surface-800">
            {!isTruckOwner && !isAdmin && (
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => router.push('/post-load')}
                leftIcon={<PlusCircleIcon className="w-5 h-5" />}
                className="mb-2"
              >
                Post New Load
              </Button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-button text-xs font-semibold text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-black text-xs">
              LC
            </div>
            <span className="font-bold text-base text-surface-900 dark:text-white">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant={isTruckOwner ? 'info' : 'primary'} size="sm">
              {roleLabel}
            </Badge>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Open sidebar navigation"
            >
              {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex">
            <div className="w-64 bg-white dark:bg-surface-900 h-full p-4 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800">
                  <span className="font-bold text-sm">Navigation</span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 text-surface-400 hover:text-surface-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <nav className="mt-4 space-y-4 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1">
                      Workspace
                    </span>
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                            item.active
                              ? 'bg-primary-500 text-white font-bold'
                              : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-surface-100 dark:border-surface-800">
                    <span className="px-3 text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1">
                      Account Center
                    </span>
                    {accountNavigationItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                            item.active
                              ? 'bg-primary-500 text-white font-bold'
                              : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </nav>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-danger-600 dark:text-danger-400 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-950/30"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
            <div className="flex-1" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Optional Page Subheader */}
        {(title || action) && (
          <div className="bg-white dark:bg-surface-900/60 border-b border-surface-100 dark:border-surface-800 py-5 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              {action && <div className="flex items-center gap-3">{action}</div>}
            </div>
          </div>
        )}

        {/* Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation Bar (Thumb navigation) ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-800 px-2 py-1.5 flex items-center justify-around">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
                  item.active
                    ? 'text-primary-600 dark:text-primary-400 font-bold'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                )}
              >
                <Icon className={cn('w-5 h-5 mb-0.5', item.active ? 'text-primary-500 stroke-[2.2]' : '')} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Floating AI Freight Assistant Drawer */}
      <AIFreightAssistantDrawer />
    </div>
  )
}

export default DashboardLayout
