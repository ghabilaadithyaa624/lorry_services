'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { authApi } from '@/lib/api'
import { Button, Badge } from '@/components/ui'
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
        'sticky top-0 z-40 w-full transition-all duration-200 border-b border-white/10 font-sans',
        scrolled ? 'bg-[#070A11]/95 backdrop-blur-xl shadow-modal' : 'bg-[#070A11]/80 backdrop-blur-md'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-glow-primary transition-transform duration-200 group-hover:scale-105">
                <TruckIcon className="w-6 h-6 stroke-[2.2]" />
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
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-surface-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-1">
                {appNavLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href || link.active
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                        isActive
                          ? 'text-primary-400 bg-primary-500/10'
                          : 'text-surface-300 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                    </Link>
                  )
                })}
              </nav>
            )}

          </div>

          {/* Right Action / Auth Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isPublicPage ? (
              <>
                {user ? (
                  <Link
                    href={getDashboardHref()}
                    className="text-xs font-semibold text-white hover:text-primary-400 transition-colors px-3 py-2"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/login')}
                    className="font-semibold text-xs text-surface-300 hover:text-white"
                  >
                    Sign In
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/post-load')}
                  leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
                  className="font-bold text-xs shadow-glow-primary px-4 py-2"
                >
                  Post Freight
                </Button>
              </>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={getDashboardHref()}
                  className="flex items-center gap-2 text-xs font-semibold text-white hover:text-primary-400 transition-colors"
                >
                  <span>Dashboard</span>
                  <Badge variant={user.role === 'truck_owner' ? 'info' : 'primary'} size="sm" className="capitalize text-[10px]">
                    {user.role === 'truck_owner' ? 'Truck Owner' : user.role === 'admin' ? 'Admin' : 'Load Owner'}
                  </Badge>
                </Link>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(user.role === 'truck_owner' ? '/dashboard/truck-owner' : '/post-load')}
                  leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
                  className="font-bold text-xs"
                >
                  {user.role === 'truck_owner' ? 'My Fleet' : 'Post Load'}
                </Button>

                <button
                  onClick={handleLogout}
                  className="text-surface-400 hover:text-danger-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                  title="Sign Out"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push('/login')} className="text-xs font-semibold">
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => router.push('/login')} className="text-xs font-bold shadow-glow-primary">
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              className="p-2 rounded-lg text-surface-300 hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#070A11] border-t border-white/10 shadow-modal border-b px-4 py-4 space-y-4">
          <div className="space-y-1">
            {isPublicPage
              ? publicNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-surface-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                ))
              : appNavLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href || link.active
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-primary-500/10 text-primary-400'
                          : 'text-surface-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {link.name}
                    </Link>
                  )
                })}
          </div>

          <div className="pt-4 border-t border-white/10 space-y-3">
            {user ? (
              <div className="space-y-2">
                <Link
                  href={getDashboardHref()}
                  className="block px-3 py-2 text-sm font-semibold text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-danger-400 hover:bg-danger-950/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" onClick={() => router.push('/login')} className="justify-center text-xs font-semibold">
                  Sign In
                </Button>
                <Button variant="primary" onClick={() => router.push('/post-load')} className="justify-center text-xs font-bold">
                  Post Freight
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
