'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: 'load_owner' | 'truck_owner' | 'admin'
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserState | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore
    }
  }, [pathname])

  if (pathname === '/' || pathname === '/login' || pathname === '/role-select' || pathname.startsWith('/admin')) {
    return null
  }

  const getDashboardHref = () => {
    if (!user) return '/login'
    if (user.role === 'truck_owner') return '/dashboard/truck-owner'
    return '/dashboard/load-owner'
  }

  const isTruckOwner = user?.role === 'truck_owner'

  const items = [
    {
      name: 'Home',
      href: getDashboardHref(),
      icon: HomeIcon,
      active: pathname.startsWith('/dashboard'),
    },
    {
      name: 'Search',
      href: '/search',
      icon: MagnifyingGlassIcon,
      active: pathname.startsWith('/search'),
    },
    {
      name: isTruckOwner ? 'Fleet' : 'Loads',
      href: isTruckOwner ? '/my-trucks' : '/my-loads',
      icon: isTruckOwner ? TruckIcon : ClipboardDocumentListIcon,
      active: isTruckOwner ? pathname.startsWith('/my-trucks') : pathname.startsWith('/my-loads'),
    },
    {
      name: 'Activity',
      href: '/activity',
      icon: ClockIcon,
      active: pathname === '/activity',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      active: pathname === '/profile',
    },
  ]

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0F131D]/95  border-t border-white/10 px-2 py-1.5 flex items-center justify-around font-sans pb-safe">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.active

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer min-w-0 flex-1 min-h-[48px]',
              isActive
                ? 'text-primary-400 font-semibold bg-primary-500/10'
                : 'text-surface-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive ? 'text-primary-400' : 'text-surface-400')} />
            <span className="text-[10px] leading-none truncate w-full text-center">{item.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
