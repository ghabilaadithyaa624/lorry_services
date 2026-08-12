'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'

export default function DashboardIndexPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        if (user?.role === 'admin') {
          router.replace('/admin')
          return
        } else if (user?.role === 'truck_owner') {
          router.replace('/dashboard/truck-owner')
          return
        } else if (user?.role === 'load_owner') {
          router.replace('/dashboard/load-owner')
          return
        }
      }

      // Check cookie fallback
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').map((c) => c.trim())
        const roleCookie = cookies.find((c) => c.startsWith('userRole='))?.split('=')[1]
        if (roleCookie === 'admin') {
          router.replace('/admin')
          return
        } else if (roleCookie === 'truck_owner') {
          router.replace('/dashboard/truck-owner')
          return
        } else if (roleCookie === 'load_owner') {
          router.replace('/dashboard/load-owner')
          return
        }
      }

      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.replace('/login?redirect=/dashboard')
      } else {
        router.replace('/dashboard/load-owner')
      }
    } catch (err) {
      console.error('Error routing dashboard:', err)
      router.replace('/dashboard/load-owner')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="flex flex-col items-center space-y-4">
        <Spinner size="lg" />
        <p className="text-xs font-mono font-bold text-surface-400 uppercase tracking-widest">
          Navigating to your logistics cockpit...
        </p>
      </div>
    </div>
  )
}
