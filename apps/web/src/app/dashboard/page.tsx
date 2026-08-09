'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
        // Default to load-owner dashboard
        router.replace('/dashboard/load-owner')
      }
    } catch (err) {
      console.error('Error routing dashboard:', err)
      router.replace('/dashboard/load-owner')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  )
}
