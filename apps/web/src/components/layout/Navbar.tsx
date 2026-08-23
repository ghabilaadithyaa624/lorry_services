'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Truck,
  Search,
  PlusCircle,
  CreditCard,
  Menu,
  X,
  Sparkles,
  Bell,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: 'load_owner' | 'truck_owner' | 'admin'
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch {
      // Ignore
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore
    }
    setUser(null)
    router.push('/login')
  }

  const isAuthPage = pathname === '/login' || pathname === '/role-select'
  if (isAuthPage) return null

  const isPublicPage = pathname === '/'

  const getDashboardHref = () => {
    if (!user) return '/login'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'truck_owner') return '/dashboard/truck-owner'
    return '/dashboard/load-owner'
  }

  // Public enterprise marketing navigation links
  const publicNavLinks = [
    { name: 'Platform', href: '/#live-network' },
    { name: 'Solutions', href: '/#solutions' },
    { name: 'For Shippers', href: '/search?type=truck' },
    { name: 'For Fleet Owners', href: '/search?type=load' },
    { name: 'Corridors', href: '/#active-corridors' },
    { name: 'Pricing', href: '/subscribe' },
    { name: 'Resources', href: '/#resources' },
  ]

  // Authenticated application navigation links
  const appNavLinks = [
    {
      name: 'Control Tower',
      href: '/tracking',
      icon: Sparkles,
      active: pathname === '/tracking',
    },
    {
      name: 'Find Trucks',
      href: '/search?type=truck',
      icon: Truck,
      active: pathname.startsWith('/search') && pathname.includes('truck'),
    },
    {
      name: 'Find Loads',
      href: '/search?type=load',
      icon: Search,
      active: pathname.startsWith('/search') && pathname.includes('load'),
    },
    {
      name: 'Pricing & Plans',
      href: '/subscribe',
      icon: CreditCard,
      active: pathname.startsWith('/subscribe'),
    },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-200 border-b font-sans',
        scrolled
          ? 'bg-[#0B0F19]/85 backdrop-blur-xl border-white/10 shadow-modal'
          : 'bg-[#0B0F19]/70 backdrop-blur-md border-white/5 shadow-sm'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-glow-primary transition-transform duration-200 group-hover:scale-105 border border-primary-400/30">
                <Truck className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white leading-none">
                  Lorry<span className="text-primary-500">Carry</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-surface-400 uppercase tracking-wider mt-0.5">
                  Direct Freight Network
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {isPublicPage ? (
              <nav className="hidden lg:flex items-center gap-1">
                {publicNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-surface-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-1">
                {appNavLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                        link.active
                          ? 'text-primary-400 bg-primary-500/10 border border-primary-500/20'
                          : 'text-surface-300 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>

          {/* Desktop Right Side Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/notifications"
                  className="relative p-2.5 text-surface-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-transparent hover:border-white/10"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 shadow-glow-primary ring-2 ring-[#0B0F19]" />
                </Link>

                <Link
                  href={getDashboardHref()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-surface-900/80 backdrop-blur-md text-xs font-semibold text-surface-200 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none shadow-card"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-300 font-bold flex items-center justify-center text-xs border border-primary-500/30">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.role === 'truck_owner' ? 'T' : 'S'}
                  </div>
                  <span>Dashboard</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-950 text-surface-400 text-[10px] font-mono border border-white/5">
                    {user.role === 'truck_owner' ? 'Fleet Owner' : 'Shipper'}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium text-surface-400 hover:text-danger-400 px-2 py-1.5 rounded-lg hover:bg-danger-950/30 transition-colors focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-surface-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none border border-transparent hover:border-white/10"
                >
                  Sign In
                </Link>

                <Link
                  href="/login?redirect=/post-load"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-none border border-primary-400/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Freight</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              className="p-2 text-surface-400 hover:text-white hover:bg-white/5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none border border-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0F131D]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-4 space-y-3 shadow-modal animate-fade-in">
          <nav className="space-y-1">
            {(isPublicPage ? publicNavLinks : appNavLinks).map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-surface-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-white/10 space-y-2">
            {user ? (
              <>
                <Link
                  href={getDashboardHref()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2 text-sm font-semibold text-surface-200 hover:bg-white/5 rounded-xl"
                >
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-sm font-semibold text-danger-400 hover:bg-danger-950/30 rounded-xl"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 text-center rounded-xl border border-white/10 text-xs font-bold text-surface-300 hover:text-white hover:bg-white/5"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?redirect=/post-load"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 text-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs font-bold shadow-glow-primary border border-primary-400/30"
                >
                  Post Freight
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
