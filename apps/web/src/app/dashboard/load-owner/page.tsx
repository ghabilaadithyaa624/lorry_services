'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, clearAuthCookies } from '@/lib/api'

interface LoadItem {
  id: string
  origin: string
  destination: string
  material: string
  weightTons: number
  price: number
  bidsCount: number
  status: 'ACTIVE' | 'IN_TRANSIT' | 'COMPLETED'
  createdAt: string
}

export default function LoadOwnerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loads, setLoads] = useState<LoadItem[]>([])
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    // Mock initial posted loads for display
    setLoads([
      {
        id: 'L-1092',
        origin: 'Mumbai, MH',
        destination: 'Delhi, DL',
        material: 'Industrial Machinery Parts',
        weightTons: 18,
        price: 45000,
        bidsCount: 4,
        status: 'ACTIVE',
        createdAt: '2 hours ago',
      },
      {
        id: 'L-1088',
        origin: 'Chennai, TN',
        destination: 'Bengaluru, KA',
        material: 'Textile Rolls',
        weightTons: 12,
        price: 28000,
        bidsCount: 7,
        status: 'IN_TRANSIT',
        createdAt: '1 day ago',
      },
    ])

    setLoading(false)
  }, [])

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
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
    { label: 'Active Loads', value: loads.filter(l => l.status === 'ACTIVE').length, icon: '📦', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Total Bids Received', value: loads.reduce((acc, curr) => acc + curr.bidsCount, 0), icon: '💬', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'In-Transit Shipments', value: loads.filter(l => l.status === 'IN_TRANSIT').length, icon: '🚛', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
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
              Load Owner Dashboard
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
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">Welcome, Load Owner!</h2>
            <p className="mt-1 text-orange-100 text-sm">
              Post new freight loads, search verified trucks, and manage booking trips.
            </p>
          </div>
          <Link
            href="/post-load"
            className="mt-4 sm:mt-0 bg-white text-orange-600 hover:bg-orange-50 font-bold text-sm px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2"
          >
            <span>+</span> Post a Load
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
              href="/post-load"
              className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500"
            >
              <div className="text-3xl mb-3">➕</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">
                Post a Load
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Create a new load listing for truck owners to find and bid on
              </p>
            </Link>

            <Link
              href="/search/trucks"
              className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500"
            >
              <div className="text-3xl mb-3">🔍</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Find Trucks
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search for verified trucks near your loading point
              </p>
            </Link>

            <Link
              href="/my-loads"
              className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500"
            >
              <div className="text-3xl mb-3">📋</div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                My Trips
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View active and completed bookings and track live shipment progress
              </p>
            </Link>
          </div>
        </div>

        {/* Posted Loads List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Posted Loads</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage your active load requests and view received bids
              </p>
            </div>
            <Link
              href="/post-load"
              className="text-orange-600 dark:text-orange-400 text-xs font-bold hover:underline"
            >
              + Create New Load
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {loads.map((load) => (
              <div key={load.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-400">{load.id}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      load.status === 'ACTIVE'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {load.status}
                    </span>
                    <span className="text-xs text-gray-400">• {load.createdAt}</span>
                  </div>

                  <div className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{load.origin}</span>
                    <span className="text-orange-500">➔</span>
                    <span>{load.destination}</span>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                    <span>Material: {load.material}</span>
                    <span>Weight: {load.weightTons} Tons</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-orange-600 dark:text-orange-400">
                      ₹{load.price.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {load.bidsCount} Bids Received
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/search/trucks')}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-orange-500 hover:text-white text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                  >
                    View Bids ({load.bidsCount})
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
