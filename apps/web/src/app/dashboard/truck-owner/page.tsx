'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, clearAuthCookies } from '@/lib/api'

interface TruckItem {
  id: string
  registrationNumber: string
  truckType: string
  capacityTons: number
  bodyType: string
  currentLocation: string
  status: 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE'
}

export default function TruckOwnerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [trucks, setTrucks] = useState<TruckItem[]>([])
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Mock registered trucks
    setTrucks([
      {
        id: 'T-8821',
        registrationNumber: 'MH-12-PQ-9821',
        truckType: '14-Wheeler Heavy',
        capacityTons: 25,
        bodyType: 'Open Body',
        currentLocation: 'Mumbai Port, MH',
        status: 'AVAILABLE',
      },
      {
        id: 'T-7402',
        registrationNumber: 'KA-01-MJ-4102',
        truckType: '6-Wheeler Medium',
        capacityTons: 10,
        bodyType: 'Closed Container',
        currentLocation: 'Bengaluru Industrial Area',
        status: 'ON_TRIP',
      },
    ])

    setLoading(false)
  }, [])

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      // Ignore error
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    clearAuthCookies()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Loading...
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Registered Fleet', value: trucks.length, icon: '🚛', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Trucks Available', value: trucks.filter(t => t.status === 'AVAILABLE').length, icon: '✅', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'On Active Trips', value: trucks.filter(t => t.status === 'ON_TRIP').length, icon: '🛣️', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-xl font-bold text-orange-600 dark:text-orange-400">
              LorryCarry
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white border-l border-gray-300 dark:border-gray-700 pl-3">
              Truck Owner Dashboard
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium hidden sm:inline">
              {user?.phone}
            </span>
            <button
              onClick={logout}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">Welcome, Lorry Owner!</h2>
            <p className="mt-1 text-blue-100 text-sm">
              Manage your fleet, upload RC/Insurance, and find high-paying freight loads across India.
            </p>
          </div>
          <Link
            href="/register-truck"
            className="mt-4 sm:mt-0 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2"
          >
            <span>+</span> Register Truck
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl text-2xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/register-truck"
              className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500"
            >
              <div className="text-3xl mb-3">🚛</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Register Truck
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add your truck with RC and insurance documents for Vahan verification
              </p>
            </Link>

            <Link
              href="/post-load"
              className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500"
            >
              <div className="text-3xl mb-3">📦</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                Find Loads
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search for loads matching your truck capacity and avoid return empty trips
              </p>
            </Link>

            <Link
              href="/my-trucks"
              className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500"
            >
              <div className="text-3xl mb-3">🗺️</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                My Trips
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track active deliveries, view payment status, and review trip history
              </p>
            </Link>
          </div>
        </div>

        {/* Registered Fleet List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">My Registered Fleet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage your registered lorries and live availability
              </p>
            </div>
            <Link
              href="/register-truck"
              className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline"
            >
              + Add Truck
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {trucks.map((truck) => (
              <div key={truck.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-400">{truck.id}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      truck.status === 'AVAILABLE'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {truck.status}
                    </span>
                  </div>

                  <div className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>🚛 {truck.registrationNumber}</span>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                    <span>Type: {truck.truckType}</span>
                    <span>Body: {truck.bodyType}</span>
                    <span>Capacity: {truck.capacityTons} Tons</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <div>Current Location</div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">📍 {truck.currentLocation}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/post-load')}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                  >
                    Find Load
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
