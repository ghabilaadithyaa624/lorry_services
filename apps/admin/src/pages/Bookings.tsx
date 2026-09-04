import React, { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ArrowRight,
  Truck,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatINR, formatPhone, truncate, cn } from '../lib/utils'

interface BookingItem {
  id: string
  loadId: string
  truckId: string
  factoryOwnerId: string
  truckDriverId: string
  agreedPrice: number | string
  advanceConfirmed: boolean
  balanceConfirmed: boolean
  ewayBillNumber: string | null
  liabilityAccepted: boolean
  status: 'Pending' | 'Confirmed' | 'In-transit' | 'Completed' | 'Cancelled'
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  factoryOwner: { name: string | null; phone: string }
  truckDriver: { name: string | null; phone: string }
  load: { loadingAddress: string; unloadingAddress: string }
  truck: { registrationNumber: string }
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Pending: { label: 'Pending', bg: 'bg-warning-500/15', text: 'text-warning-400', border: 'border-warning-500/30' },
  Confirmed: { label: 'Confirmed', bg: 'bg-info-500/15', text: 'text-info-400', border: 'border-info-500/30' },
  'In-transit': { label: 'In Transit', bg: 'bg-primary-500/15', text: 'text-primary-400', border: 'border-primary-500/30' },
  Completed: { label: 'Completed', bg: 'bg-success-500/15', text: 'text-success-400', border: 'border-success-500/30' },
  Cancelled: { label: 'Cancelled', bg: 'bg-danger-500/15', text: 'text-danger-400', border: 'border-danger-500/30' },
}

export function Bookings() {
  const [bookings, setBookings] = useState<BookingItem[]>([])
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
      const msg = err instanceof Error ? err.message : 'Failed to fetch booking records'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-surface-800 rounded w-48"></div>
          <div className="h-9 bg-surface-800 rounded w-24"></div>
        </div>
        <div className="card p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-700/40 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-12 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load Bookings</h2>
        <p className="text-surface-400 text-sm max-w-md mb-6">{error}</p>
        <button onClick={fetchBookings} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Freight Bookings</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {total} total booking transaction{total !== 1 ? 's' : ''} recorded in marketplace
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Bookings Table */}
      <div className="card overflow-hidden">
        {bookings.length === 0 ? (
          <div className="py-16 text-center text-surface-400 text-sm flex flex-col items-center">
            <CalendarDays className="w-12 h-12 text-surface-600 mb-3" />
            <p className="font-semibold text-white">No bookings created yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/80 border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left px-6 py-3.5">Booking ID</th>
                  <th className="text-left px-6 py-3.5">Route</th>
                  <th className="text-left px-6 py-3.5">Vehicle</th>
                  <th className="text-left px-6 py-3.5">Factory Owner</th>
                  <th className="text-left px-6 py-3.5">Transporter</th>
                  <th className="text-right px-6 py-3.5">Agreed Price</th>
                  <th className="text-left px-6 py-3.5">Status</th>
                  <th className="text-right px-6 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {bookings.map((b) => {
                  const statusConfig = STATUS_CONFIG[b.status] || {
                    label: b.status,
                    bg: 'bg-surface-700',
                    text: 'text-surface-300',
                    border: 'border-surface-600',
                  }
                  return (
                    <tr key={b.id} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-primary-400">
                        {b.id.slice(0, 8)}…
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-surface-300">
                          <MapPin className="w-3.5 h-3.5 text-success-400 shrink-0" />
                          <span className="truncate max-w-[120px]" title={b.load.loadingAddress}>
                            {truncate(b.load.loadingAddress, 18)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-surface-500 shrink-0" />
                          <MapPin className="w-3.5 h-3.5 text-danger-400 shrink-0" />
                          <span className="truncate max-w-[120px]" title={b.load.unloadingAddress}>
                            {truncate(b.load.unloadingAddress, 18)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-mono font-bold text-xs text-white">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-surface-400" />
                          {b.truck.registrationNumber}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-white text-xs">{b.factoryOwner.name || '—'}</p>
                        <p className="text-[11px] text-surface-400 font-mono">{formatPhone(b.factoryOwner.phone)}</p>
                      </td>

                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-white text-xs">{b.truckDriver.name || '—'}</p>
                        <p className="text-[11px] text-surface-400 font-mono">{formatPhone(b.truckDriver.phone)}</p>
                      </td>

                      <td className="px-6 py-3.5 text-right font-bold text-success-400 text-xs">
                        {formatINR(Number(b.agreedPrice))}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className={cn('badge font-semibold border', statusConfig.bg, statusConfig.text, statusConfig.border)}>
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right text-xs text-surface-400">
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
        {bookings.length > 0 && pages > 1 && (
          <div className="px-6 py-3 border-t border-surface-700/60 flex items-center justify-between">
            <p className="text-xs text-surface-400">
              Page {page} of {pages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Bookings
