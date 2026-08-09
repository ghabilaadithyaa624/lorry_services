'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ArrowLongRightIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Badge, Button, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatINR, formatPhone, truncate } from '@/lib/utils'

interface Booking {
  id: string
  loadId: string
  truckId: string
  loadOwnerId: string
  truckOwnerId: string
  agreedPrice: number | string
  advanceConfirmed: boolean
  balanceConfirmed: boolean
  ewayBillNumber: string | null
  liabilityAccepted: boolean
  status: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  loadOwner: { name: string | null; phone: string }
  truckOwner: { name: string | null; phone: string }
  load: { loadingAddress: string; unloadingAddress: string }
  truck: { registrationNumber: string }
}

const STATUS_BADGE: Record<string, { variant: 'warning' | 'info' | 'primary' | 'success' | 'danger' | 'default'; label: string }> = {
  'Pending': { variant: 'warning', label: 'Pending' },
  'Confirmed': { variant: 'info', label: 'Confirmed' },
  'In-transit': { variant: 'primary', label: 'In Transit' },
  'Completed': { variant: 'success', label: 'Completed' },
  'Cancelled': { variant: 'danger', label: 'Cancelled' },
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/admin/bookings?page=${page}&limit=20`)
      setBookings(res.data.bookings)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings'
      setError(msg)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mb-4" />
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Failed to load bookings</h3>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchBookings} className="btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">Bookings</h1>
          <p className="text-sm text-surface-500 mt-0.5">{total} total booking{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchBookings} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton width="70%" className="h-4" />
                  <Skeleton width="40%" className="h-3" />
                </div>
                <Skeleton width={80} className="h-5" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarDaysIcon className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500 font-medium">No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-700">
                  {['Booking ID', 'Route', 'Truck', 'Load Owner', 'Truck Owner', 'Price', 'Status', 'Created'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {bookings.map(b => {
                  const statusBadge = STATUS_BADGE[b.status] || { variant: 'default' as const, label: b.status }
                  return (
                    <tr key={b.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-surface-600 dark:text-surface-400">
                          {b.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-surface-700 dark:text-surface-300">
                          <MapPinIcon className="w-3.5 h-3.5 text-success-500 shrink-0" />
                          <span className="truncate max-w-[120px]" title={b.load.loadingAddress}>{truncate(b.load.loadingAddress, 20)}</span>
                          <ArrowLongRightIcon className="w-3.5 h-3.5 text-surface-400 shrink-0 mx-0.5" />
                          <MapPinIcon className="w-3.5 h-3.5 text-danger-500 shrink-0" />
                          <span className="truncate max-w-[120px]" title={b.load.unloadingAddress}>{truncate(b.load.unloadingAddress, 20)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-surface-900 dark:text-white text-xs">
                        {b.truck.registrationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-surface-900 dark:text-white text-xs font-medium">{b.loadOwner.name || formatPhone(b.loadOwner.phone)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-surface-900 dark:text-white text-xs font-medium">{b.truckOwner.name || formatPhone(b.truckOwner.phone)}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-success-600 text-xs">
                        {formatINR(Number(b.agreedPrice))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadge.variant} size="sm" dot>{statusBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-500 text-xs">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && bookings.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-500">Page {page} of {pages} · {total} total</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
