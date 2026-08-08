'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Load {
  id: string
  tonnageRequired: number
  loadingAddress: string
  unloadingAddress: string
  truckType: string
  status: 'Open' | 'Assigned' | 'InTransit' | 'Delivered' | 'Cancelled'
  urgent: boolean
  maxPrice?: number
  distanceKm?: number
  createdAt: string
  _count?: { bookings: number }
}

const STATUS_STYLES: Record<string, string> = {
  Open:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Assigned:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  InTransit: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Delivered: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

function MyLoadsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loads, setLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
    }
  }, [searchParams])

  useEffect(() => {
    fetchLoads()
  }, [])

  const fetchLoads = async () => {
    setLoading(true)
    try {
      const res = await api.get('/loads/my-loads')
      setLoads(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch loads')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this load? This cannot be undone.')) return
    try {
      await api.delete(`/loads/${id}`)
      setLoads(prev => prev.filter(l => l.id !== id))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete load')
    }
  }

  const filtered = activeFilter === 'all'
    ? loads
    : loads.filter(l => l.status === activeFilter)

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-card shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>✅</span>
          <span className="font-medium">Load posted successfully!</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Loads</h1>
            <p className="text-sm text-gray-500 mt-1">{loads.length} total loads posted</p>
          </div>
          <Link href="/post-load" className="btn-primary flex items-center gap-2">
            <span>＋</span> Post New Load
          </Link>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'Open', 'Assigned', 'InTransit', 'Delivered', 'Cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
              }`}
            >
              {f === 'all' ? 'All' : f}
              {f !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({loads.filter(l => l.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card p-6 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold mb-2">No loads yet</h3>
            <p className="text-gray-500 text-sm mb-6">Post your first load to find trucks</p>
            <Link href="/post-load" className="btn-primary">Post a Load</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(load => (
              <div key={load.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm font-medium mb-1 truncate">
                      <span className="text-gray-500 shrink-0">📍</span>
                      <span className="truncate">{load.loadingAddress}</span>
                      <span className="text-gray-400 shrink-0">→</span>
                      <span className="truncate">{load.unloadingAddress}</span>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                      <span>🚛 {load.truckType}</span>
                      <span>⚖️ {load.tonnageRequired}T</span>
                      {load.maxPrice && <span>💰 ₹{load.maxPrice.toLocaleString()}</span>}
                      {load.distanceKm && <span>📏 {load.distanceKm} km</span>}
                      {load._count && <span>📋 {load._count.bookings} bids</span>}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      {load.urgent && (
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                          URGENT
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[load.status]}`}>
                        {load.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(load.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    {load.status === 'Open' && (
                      <button
                        onClick={() => handleDelete(load.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyLoadsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MyLoadsContent />
    </Suspense>
  )
}
