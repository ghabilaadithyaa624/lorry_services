import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Truck, Package, CreditCard } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalTrucks: number
  totalLoads: number
  activeSubscriptions: number
  pendingKyc: number
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTrucks: 0,
    totalLoads: 0,
    activeSubscriptions: 0,
    pendingKyc: 0,
  })

  useEffect(() => {
    // TODO: Fetch from API
    // Mock data for now
    setStats({
      totalUsers: 156,
      totalTrucks: 89,
      totalLoads: 234,
      activeSubscriptions: 45,
      pendingKyc: 12,
    })
  }, [])

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { label: 'Verified Trucks', value: stats.totalTrucks, icon: Truck, color: 'green' },
    { label: 'Active Loads', value: stats.totalLoads, icon: Package, color: 'orange' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'purple' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-slate-800 p-6 rounded-xl border border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <Icon className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Alerts */}
      {stats.pendingKyc > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-amber-500 font-semibold">⚠️ Action Required</span>
          </div>
          <p className="text-slate-300 mt-2">
            {stats.pendingKyc} documents pending KYC verification.{' '}
            <Link to="/kyc" className="text-amber-400 underline hover:text-amber-300">
              Review now →
            </Link>
          </p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <p className="text-slate-400">Activity feed coming soon...</p>
      </div>
    </div>
  )
}
