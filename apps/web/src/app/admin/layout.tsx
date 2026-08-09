'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  UsersIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { authApi } from '@/lib/api'
import { Badge } from '@/components/ui'
import { cn, formatPhone } from '@/lib/utils'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: string
}

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'KYC Queue', href: '/admin/kyc', icon: DocumentCheckIcon },
  { name: 'Listings', href: '/admin/listings', icon: ClipboardDocumentListIcon },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Bookings', href: '/admin/bookings', icon: CalendarDaysIcon },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // Ignore
    }
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // Ignore
    }
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-surface-100 dark:border-surface-800 shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-sm">
            <TruckIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
            <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-0.5">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-surface-100 dark:border-surface-800 shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-700/50">
          <div className="w-9 h-9 rounded-full bg-danger-50 dark:bg-danger-950 text-danger-600 dark:text-danger-400 font-bold text-xs flex items-center justify-center shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-surface-900 dark:text-white truncate">
              {user?.phone ? formatPhone(user.phone) : 'Administrator'}
            </p>
            <Badge variant="danger" size="sm" dot className="mt-0.5">
              Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-surface-400 uppercase tracking-widest">
          Management
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-button text-sm font-semibold transition-all duration-150',
                active
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-surface-400')} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-surface-100 dark:border-surface-800 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-button text-sm font-semibold text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col shrink-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 fixed inset-y-0 left-0 z-30">
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 bg-white dark:bg-surface-900 h-full flex flex-col shadow-2xl animate-slide-in-left">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border-b border-surface-200 dark:border-surface-800 h-14 flex items-center px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 mr-3 rounded-lg text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
            aria-label="Open sidebar"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="lg:hidden w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center text-white text-xs font-black">
              LC
            </div>
            <span className="lg:hidden font-bold text-sm">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-sm font-semibold text-surface-500">
              {NAV_ITEMS.find(item => isActive(item.href))?.name || 'Admin'}
            </h2>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="danger" size="sm" dot>
              Admin
            </Badge>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
