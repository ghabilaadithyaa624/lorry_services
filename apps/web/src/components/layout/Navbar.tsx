'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  CreditCardIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  SparklesIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { authApi } from '@/lib/api'
import { Button, Badge } from '@/components/ui'
import { cn, formatPhone } from '@/lib/utils'

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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Read user session from localStorage
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    } catch {
      // Ignore JSON parse errors
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  // Close mobile menu and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setUserDropdownOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors during logout
    }
    setUser(null)
    router.push('/login')
  }

  const isAuthPage = pathname === '/login' || pathname === '/role-select'
  if (isAuthPage) return null

  const getDashboardHref = () => {
    if (!user) return '/login'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'truck_owner') return '/dashboard/truck-owner'
    return '/dashboard/load-owner'
  }

  const navLinks = [
    {
      name: 'Control Tower',
      href: '/tracking',
      icon: SparklesIcon,
      active: pathname === '/tracking',
    },
    {
      name: 'Find Trucks',
      href: '/search?type=truck',
      icon: TruckIcon,
      active: pathname === '/search' && pathname.includes('type=truck'),
    },
    {
      name: 'Find Loads',
      href: '/search?type=load',
      icon: MagnifyingGlassIcon,
      active: pathname === '/search' && pathname.includes('type=load'),
    },
    {
      name: 'Pricing & Plans',
      href: '/subscribe',
      icon: CreditCardIcon,
      active: pathname.startsWith('/subscribe'),
    },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-200',
        scrolled
          ? 'bg-white/95 dark:bg-surface-900/95 backdrop-blur-md shadow-xs border-b border-surface-200/80 dark:border-surface-800'
          : 'bg-white dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
                <TruckIcon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-surface-900 dark:text-white leading-none">
                  Lorry<span className="text-primary-500">Carry</span>
                </span>
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mt-0.5">
                  Direct Freight Network
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href || link.active
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-button text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/40 font-semibold'
                        : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Dashboard Shortcut */}
                <Link
                  href={getDashboardHref()}
                  className="flex items-center gap-1.5 text-sm font-semibold text-surface-700 dark:text-surface-200 hover:text-primary-600 px-3 py-1.5 rounded-button hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  <span>Dashboard</span>
                  <Badge
                    variant={user.role === 'truck_owner' ? 'info' : 'primary'}
                    size="sm"
                    className="capitalize ml-1"
                  >
                    {user.role === 'truck_owner' ? 'Lorry Owner' : user.role === 'admin' ? 'Admin' : 'Load Owner'}
                  </Badge>
                </Link>

                {/* Primary Action Button */}
                {user.role === 'truck_owner' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/dashboard/truck-owner')}
                    leftIcon={<PlusCircleIcon className="w-4 h-4" />}
                  >
                    My Fleet
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/post-load')}
                    leftIcon={<PlusCircleIcon className="w-4 h-4" />}
                  >
                    Post Load
                  </Button>
                )}

                {/* User Dropdown Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition-colors"
                    aria-expanded={userDropdownOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 font-bold text-xs flex items-center justify-center border border-primary-200 dark:border-primary-800">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'LC'}
                    </div>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-surface-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-surface-800 rounded-2xl shadow-elevated border border-surface-200 dark:border-surface-700 py-1.5 z-50 animate-fade-in divide-y divide-surface-100 dark:divide-surface-700">
                      <div className="px-4 py-3">
                        <p className="text-xs text-surface-500 font-medium">Signed in as</p>
                        <p className="text-sm font-bold text-surface-900 dark:text-white truncate">
                          {user.phone ? formatPhone(user.phone) : 'Transporter'}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={getDashboardHref()}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <UserCircleIcon className="w-4 h-4 text-primary-500" />
                          Dashboard
                        </Link>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <UserCircleIcon className="w-4 h-4 text-surface-400" />
                          User Profile
                        </Link>
                        <Link
                          href="/documents"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <CreditCardIcon className="w-4 h-4 text-surface-400" />
                          KYC & Documents
                        </Link>
                        <Link
                          href="/notifications"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <SparklesIcon className="w-4 h-4 text-amber-500" />
                          Notifications
                        </Link>
                        <Link
                          href="/activity"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <MagnifyingGlassIcon className="w-4 h-4 text-surface-400" />
                          Activity Log
                        </Link>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/subscribe"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <SparklesIcon className="w-4 h-4 text-primary-500" />
                          Subscription & Credits
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <Bars3Icon className="w-4 h-4 text-surface-400" />
                          Settings
                        </Link>
                        <Link
                          href="/security"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          <LockClosedIcon className="w-4 h-4 text-surface-400" />
                          Security & Sessions
                        </Link>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors font-bold text-left cursor-pointer"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-surface-700 dark:text-surface-300 hover:text-primary-600 px-3.5 py-2 rounded-button hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  Log In
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/login?redirect=/post-load')}
                  leftIcon={<PlusCircleIcon className="w-4 h-4" />}
                >
                  Post a Load
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-button text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 pt-2 pb-6 space-y-4 animate-fade-in">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || link.active
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors',
                    isActive
                      ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/40 font-semibold'
                      : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                  )}
                >
                  <Icon className="w-5 h-5 text-surface-400" />
                  <span>{link.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Auth Section in Mobile Menu */}
          <div className="pt-4 border-t border-surface-100 dark:border-surface-800 space-y-3">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-500 text-white font-bold flex items-center justify-center text-xs">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'LC'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-surface-900 dark:text-white">
                        {user.phone ? formatPhone(user.phone) : 'Transporter'}
                      </p>
                      <p className="text-xs text-surface-500 capitalize">
                        {user.role === 'truck_owner' ? 'Lorry Owner' : user.role === 'admin' ? 'Admin' : 'Load Owner'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={user.role === 'truck_owner' ? 'info' : 'primary'} size="sm">
                    Verified
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => router.push(getDashboardHref())}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => router.push(user.role === 'truck_owner' ? '/dashboard/truck-owner' : '/post-load')}
                  >
                    {user.role === 'truck_owner' ? 'My Fleet' : 'Post Load'}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={handleLogout}
                  leftIcon={<ArrowRightOnRectangleIcon className="w-4 h-4 text-danger-500" />}
                  className="text-danger-600 dark:text-danger-400"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => router.push('/login')}
                >
                  Log In / Register
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => router.push('/login?redirect=/post-load')}
                >
                  Post a Load Free
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
