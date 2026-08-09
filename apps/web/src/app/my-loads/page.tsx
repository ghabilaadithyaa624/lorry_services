'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  PlusCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Card, Badge, Button, Skeleton } from '@/components/ui'
import { OperationalEmptyState } from '@/components/intelligence'
import { toast } from '@/lib/toast'
import { formatINR, timeAgo } from '@/lib/utils'

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

const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'default' | 'danger'> = {
  Open: 'success',
  Assigned: 'info',
  InTransit: 'warning',
  Delivered: 'default',
  Cancelled: 'danger',
}

function MyLoadsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loads, setLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Your freight load was published successfully!')
    }
  }, [searchParams])

  useEffect(() => {
    fetchLoads()
  }, [])

  const fetchLoads = async () => {
    setLoading(true)
    try {
      const res = await api.get('/loads/my-loads')
      setLoads(res.data || [])
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch loads'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this posted load?')) return
    try {
      await api.delete(`/loads/${id}`)
      setLoads((prev) => prev.filter((l) => l.id !== id))
      toast.success('Load removed successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete load')
    }
  }

  const filteredLoads = activeFilter === 'all'
    ? loads
    : loads.filter((l) => l.status === activeFilter)

  const filterOptions = ['all', 'Open', 'Assigned', 'InTransit', 'Delivered', 'Cancelled']

  return (
    <DashboardLayout
      title="My Posted Freight Loads"
      subtitle="Track your active cargo requirements, transporter bids, and in-transit shipments."
      action={
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/post-load')}
          leftIcon={<PlusCircleIcon className="w-5 h-5" />}
        >
          Post New Load
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2 pb-2">
          {filterOptions.map((f) => {
            const count = f === 'all' ? loads.length : loads.filter((l) => l.status === f).length
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === f
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-primary-400'
                }`}
              >
                {f === 'all' ? 'All Loads' : f}
                <span className="ml-1.5 opacity-80 text-[10px]">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Loads List */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        ) : error ? (
          <Card padding="lg" className="text-center py-12 text-danger-600">
            {error}
          </Card>
        ) : filteredLoads.length === 0 ? (
          <OperationalEmptyState
            role="load_owner"
            title="No Active Cargo Requirements in This Category"
            description="Publish your freight tonnage and loading warehouse coordinates to match with available lorries within 50km radius."
            actionLabel="Post a Load Now"
            actionHref="/post-load"
            secondaryActionLabel="Explore Lorries Nearby"
            secondaryActionHref="/search?type=truck"
          />
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => (
              <Card
                key={load.id}
                hover
                padding="lg"
                className="border-surface-200/80 dark:border-surface-700/80"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Status and Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[load.status] || 'default'} size="sm" dot>
                        {load.status}
                      </Badge>
                      {load.urgent && (
                        <Badge variant="danger" size="sm">
                          URGENT
                        </Badge>
                      )}
                      <span className="text-xs text-surface-400 font-mono">
                        #{load.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-surface-400">• Posted {timeAgo(load.createdAt)}</span>
                    </div>

                    {/* Route */}
                    <div className="text-base sm:text-lg font-extrabold text-surface-900 dark:text-white flex items-center gap-2 truncate">
                      <span className="truncate">{load.loadingAddress}</span>
                      <span className="text-primary-500 shrink-0">➔</span>
                      <span className="truncate">{load.unloadingAddress}</span>
                    </div>

                    {/* Specs & Commercials */}
                    <div className="flex flex-wrap gap-4 text-xs text-surface-600 dark:text-surface-400">
                      <span>🚛 {load.truckType}</span>
                      <span>⚖️ {load.tonnageRequired} Tons</span>
                      {load.maxPrice && (
                        <span className="font-bold text-surface-900 dark:text-white">
                          Budget: {formatINR(load.maxPrice)}
                        </span>
                      )}
                      {load.distanceKm && <span>📏 {load.distanceKm} km</span>}
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-surface-500 block">Bids</span>
                      <span className="text-sm font-black text-primary-600 dark:text-primary-400">
                        {load._count?.bookings || 0} Quotes
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/search?type=truck&location=${encodeURIComponent(load.loadingAddress)}`)}
                        className="text-xs font-bold"
                      >
                        Match Lorries
                      </Button>

                      {load.status === 'Open' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(load.id)}
                          className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/40 rounded-lg transition-colors"
                          title="Delete this load"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function MyLoadsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex items-center justify-center">
          <Skeleton.Card />
        </div>
      }
    >
      <MyLoadsContent />
    </Suspense>
  )
}
