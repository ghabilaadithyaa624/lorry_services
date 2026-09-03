'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  GlobeAsiaAustraliaIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { authApi, adminApi, usersApi } from '@/lib/api'
import { Badge, Spinner } from '@/components/ui'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { cn, formatPhone } from '@/lib/utils'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: string
}

const NAV_GROUPS = [
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Command Tower', href: '/admin/dashboard', icon: HomeIcon },
      { name: 'Dashboard Analytics', href: '/admin/analytics', icon: ChartBarIcon },
      { name: 'KYC Queue', href: '/admin/kyc', icon: DocumentCheckIcon },
      { name: 'Listings & Fleet', href: '/admin/listings', icon: ClipboardDocumentListIcon },
      { name: 'Freight Bookings', href: '/admin/bookings', icon: CalendarDaysIcon },
    ],
  },
  {
    title: 'COMMERCE & INTELLIGENCE',
    items: [
      { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
      { name: 'National Intelligence', href: '/admin/intelligence', icon: GlobeAsiaAustraliaIcon },
    ],
  },
  {
    title: 'PEOPLE & TRUST',
    items: [
      { name: 'User Operations', href: '/admin/users', icon: UsersIcon },
      { name: 'Trust & Risk Console', href: '/admin/risk', icon: ShieldExclamationIcon },
    ],
  },
]

// Isolated Memoized Live Telematics Clock
const LiveClock = React.memo(function LiveClock() {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-950/80 border border-white/10 text-[11px] font-bold text-surface-300 font-mono">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>{currentTime || 'IST Telematics Active'}</span>
    </div>
  )
})

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [verifying, setVerifying] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Global Command Palette state (Ctrl + K)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    users: any[]
    bookings: any[]
    subscriptions: any[]
  }>({ users: [], bookings: [], subscriptions: [] })
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const verifyAdminAuthorization = async () => {
      try {
        const res = await usersApi.getProfile()
        if (res.data?.role === 'admin') {
          setUser(res.data)
        } else {
          router.replace('/dashboard')
        }
      } catch {
        router.replace('/login')
      } finally {
        setVerifying(false)
      }
    }

    verifyAdminAuthorization()
  }, [router])

  // Keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Execute global search against real APIs
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (!q.trim() || q.length < 2) {
      setSearchResults({ users: [], bookings: [], subscriptions: [] })
      return
    }

    setSearching(true)
    try {
      const [usersRes, bookingsRes, subsRes] = await Promise.allSettled([
        adminApi.listUsers(undefined, 1, 50),
        adminApi.listBookings(1, 50),
        adminApi.listSubscriptions(1, 50),
      ])

      const queryLower = q.toLowerCase()

      const allUsers: any[] = usersRes.status === 'fulfilled' ? usersRes.value.data.users || [] : []
      const matchedUsers = allUsers.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(queryLower)) ||
          (u.phone && u.phone.includes(queryLower)) ||
          u.role.toLowerCase().includes(queryLower)
      )

      const allBookings: any[] = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data.bookings || [] : []
      const matchedBookings = allBookings.filter(
        (b) =>
          b.id.toLowerCase().includes(queryLower) ||
          (b.truck?.registrationNumber && b.truck.registrationNumber.toLowerCase().includes(queryLower)) ||
          (b.load?.loadingAddress && b.load.loadingAddress.toLowerCase().includes(queryLower)) ||
          (b.load?.unloadingAddress && b.load.unloadingAddress.toLowerCase().includes(queryLower))
      )

      const allSubs: any[] = subsRes.status === 'fulfilled' ? subsRes.value.data.subscriptions || [] : []
      const matchedSubs = allSubs.filter(
        (s) =>
          s.plan.toLowerCase().includes(queryLower) ||
          (s.user?.name && s.user.name.toLowerCase().includes(queryLower)) ||
          (s.user?.phone && s.user.phone.includes(queryLower))
      )

      setSearchResults({
        users: matchedUsers.slice(0, 5),
        bookings: matchedBookings.slice(0, 5),
        subscriptions: matchedSubs.slice(0, 5),
      })
    } catch {
      // Ignore search error
    } finally {
      setSearching(false)
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

  if (verifying || !user) {
    return (
      <div className="min-h-screen bg-canvas text-surface-100 flex flex-col items-center justify-center p-4 font-mono">
        <Spinner size="lg" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mt-3">
          Verifying Admin Authorization...
        </p>
      </div>
    )
  }

  const SidebarContent = () => (
    <>
      {/* Operations Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 shrink-0 bg-surface-950/60">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-glow-primary border border-primary-400/30">
            <TruckIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight leading-none text-white">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
            <span className="text-[9px] font-mono font-black text-primary-400 uppercase tracking-widest mt-0.5">
              Command Tower
            </span>
          </div>
        </Link>
      </div>

      {/* Admin Operator Credentials Card */}
      <div className="p-4 border-b border-white/10 shrink-0 bg-surface-950/40">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-900/90 border border-white/10 shadow-card">
          <div className="w-9 h-9 rounded-xl bg-danger-950 text-danger-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-danger-500/30">
            {user.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-bold text-white truncate">
              {user.name || formatPhone(user.phone || '')}
            </p>
            <Badge variant="danger" size="sm" className="font-mono text-[9px] mt-0.5">
              Role.ADMIN
            </Badge>
          </div>
        </div>
      </div>

      {/* Categorized Navigation */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto font-sans scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[9px] font-mono font-black text-surface-400 uppercase tracking-widest">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all duration-150 cursor-pointer',
                    active
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'text-surface-300 hover:bg-white/5 hover:text-white border border-transparent'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-primary-400/80')} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Logout Action */}
      <div className="p-4 border-t border-white/10 shrink-0 bg-surface-950/60">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-danger-400 hover:bg-danger-950/40 border border-danger-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          <span>{loggingOut ? 'Terminating Session...' : 'Sign Out Command'}</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex font-sans selection:bg-primary-500 selection:text-white">
      {/* Desktop Command Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col shrink-0 bg-panel border-r border-white/10 fixed inset-y-0 left-0 z-30 shadow-modal">
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Command Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-panel" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 bg-surface-900 h-full flex flex-col shadow-modal animate-slide-in-left border-r border-white/10">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Command Workspace */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Command Top Header Bar */}
        <header className="sticky top-0 z-20 bg-panel border-b border-white/10 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-card">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-surface-300 hover:bg-white/10 cursor-pointer"
              aria-label="Open command menu"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>

            {/* Quick Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-950/80 border border-white/10 hover:border-primary-500/50 text-xs font-mono text-surface-400 transition-all cursor-pointer group"
            >
              <MagnifyingGlassIcon className="w-4 h-4 text-primary-400 group-hover:text-white" />
              <span>Search users, trucks, bookings, passes...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-white/10 rounded text-surface-300 border border-white/10">
                Ctrl + K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            {/* Top-bar language selector — தமிழ் | हिन्दी | English */}
            <LanguageToggle compact className="font-sans" />

            {/* Live IST Telematics Clock */}
            <LiveClock />

            <Badge variant="danger" size="sm" className="font-mono text-[10px]">
              🔒 Admin Security Active
            </Badge>
          </div>
        </header>

        {/* Command Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>

      {/* ── GLOBAL COMMAND PALETTE SEARCH MODAL (CTRL + K) ── */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-panel p-4 pt-16 sm:pt-24 animate-fade-in">
          <div className="bg-surface-900 rounded-[20px] border border-white/15 max-w-2xl w-full p-6 shadow-modal space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <CommandLineIcon className="w-5 h-5 text-primary-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type name, phone number, truck reg, booking ID or plan..."
                className="w-full bg-transparent text-white font-mono font-bold text-sm outline-none placeholder:text-surface-500"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-surface-400 hover:text-white cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {searching ? (
              <p className="text-center py-8 text-surface-400">Searching operational database...</p>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
                {/* Users Match */}
                {searchResults.users.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-primary-400 block">Matched Users</span>
                    {searchResults.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setCommandPaletteOpen(false)
                          router.push('/admin/users')
                        }}
                        className="p-3 rounded-2xl bg-surface-950 hover:bg-white/5 border border-white/5 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-white block">{u.name || '—'}</span>
                          <span className="text-surface-400 text-[11px]">{formatPhone(u.phone)}</span>
                        </div>
                        <Badge variant="info" size="sm">{u.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bookings Match */}
                {searchResults.bookings.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-primary-400 block">Matched Bookings</span>
                    {searchResults.bookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setCommandPaletteOpen(false)
                          router.push('/admin/bookings')
                        }}
                        className="p-3 rounded-2xl bg-surface-950 hover:bg-white/5 border border-white/5 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-white block">ID #{b.id.slice(0, 8)} ({b.truck?.registrationNumber || 'Truck'})</span>
                          <span className="text-surface-400 text-[11px]">{b.load?.loadingAddress} ➔ {b.load?.unloadingAddress}</span>
                        </div>
                        <Badge variant="success" size="sm">{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subscriptions Match */}
                {searchResults.subscriptions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-primary-400 block">Matched Subscriptions</span>
                    {searchResults.subscriptions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setCommandPaletteOpen(false)
                          router.push('/admin/subscriptions')
                        }}
                        className="p-3 rounded-2xl bg-surface-950 hover:bg-white/5 border border-white/5 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-white block">{s.plan}</span>
                          <span className="text-surface-400 text-[11px]">{s.user?.name} ({formatPhone(s.user?.phone)})</span>
                        </div>
                        <Badge variant="primary" size="sm">{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.users.length === 0 &&
                  searchResults.bookings.length === 0 &&
                  searchResults.subscriptions.length === 0 && (
                    <div className="p-8 text-center text-surface-400">
                      No records matched &quot;{searchQuery}&quot; in active database.
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-center py-6 text-surface-500 text-[11px]">
                Type at least 2 characters to search users, bookings, trucks & passes...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
