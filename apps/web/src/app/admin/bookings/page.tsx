'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ArrowLongRightIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Button, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatINR, formatPhone, truncate } from '@/lib/utils'

interface Booking {
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
  status: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  factoryOwner: { name: string | null; phone: string }
  truckDriver: { name: string | null; phone: string }
  load: { loadingAddress: string; unloadingAddress: string }
  truck: { registrationNumber: string }
}

const STATUS_BADGE: Record<string, { variant: 'warning' | 'info' | 'primary' | 'success' | 'danger' | 'default'; label: string }> = {
  Pending: { variant: 'warning', label: 'BOOKED' },
  Confirmed: { variant: 'info', label: 'MATCHED' },
  'In-transit': { variant: 'primary', label: 'IN TRANSIT' },
  Completed: { variant: 'success', label: 'COMPLETED' },
  Cancelled: { variant: 'danger', label: 'CANCELLED' },
}

export default function FreightBookingsPage() {
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
      const res = await adminApi.listBookings(page, 20)
      setBookings(res.data.bookings || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings'
      setError(msg)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const activeCount = bookings.filter((b) => b.status === 'In-transit' || b.status === 'Confirmed').length
  const completedCount = bookings.filter((b) => b.status === 'Completed').length
  const totalPageVolume = bookings.reduce((sum, b) => sum + Number(b.agreedPrice || 0), 0)

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 font-mono">
        <Spinner size="lg" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
          Loading freight booking operations...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Failed to Load Freight Bookings</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchBookings}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-mono text-xs font-bold shadow-glow-primary hover:bg-primary-500 transition-colors inline-flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" /> Retry Fetch
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel p-6 rounded-[20px] border border-white/10 shadow-modal relative overflow-hidden">
        {/* Ambient Background Glow & Grid */}

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-primary-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Freight Booking Operations
            </h1>
          </div>
          <p className="text-xs font-mono text-surface-400 mt-1">
            Real-time consignment dispatching, corridor routes, agreed freight prices, and status telemetry.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="px-4 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4 text-primary-400" />
          <span>Refresh Bookings ({total})</span>
        </button>
      </div>

      {/* Booking Operations KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Total Bookings</span>
          <span className="text-2xl sm:text-3xl font-black text-white block">{total}</span>
          <span className="text-[11px] text-surface-400 block">All-time freight bookings</span>
        </div>

        <div className="p-5 rounded-[20px] bg-primary-950/40 border border-primary-500/30 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 block">Active Corridors</span>
          <span className="text-2xl sm:text-3xl font-black text-primary-300 block">{activeCount}</span>
          <span className="text-[11px] text-primary-300/80 block">In-transit on page</span>
        </div>

        <div className="p-5 rounded-[20px] bg-emerald-950/40 border border-emerald-500/30 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Completed Trips</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-300 block">{completedCount}</span>
          <span className="text-[11px] text-emerald-300/80 block">Delivered on page</span>
        </div>

        <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Agreed Freight Volume</span>
          <span className="text-xl sm:text-2xl font-black text-white block truncate">{formatINR(totalPageVolume)}</span>
          <span className="text-[11px] text-surface-400 block">Value on page</span>
        </div>
      </div>

      {/* Bookings Table Card */}
      <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden font-mono text-xs">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Freight Booking Operations Directory (Page {page} of {pages})
          </span>
          <span className="text-[11px] text-surface-400">Deterministic API Mapping</span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-surface-400 space-y-2">
            <CalendarDaysIcon className="w-12 h-12 text-surface-500 mx-auto" />
            <p className="font-bold text-white">No freight bookings recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[10px]">
                  <th className="text-left py-3 px-4 font-bold">Booking ID</th>
                  <th className="text-left py-3 px-4 font-bold">Corridor Route</th>
                  <th className="text-left py-3 px-4 font-bold">Vehicle</th>
                  <th className="text-left py-3 px-4 font-bold">Factory Owner</th>
                  <th className="text-left py-3 px-4 font-bold">Transporter</th>
                  <th className="text-right py-3 px-4 font-bold">Agreed Price</th>
                  <th className="text-center py-3 px-4 font-bold">Lifecycle Status</th>
                  <th className="text-right py-3 px-4 font-bold">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.map((b) => {
                  const statusBadge = STATUS_BADGE[b.status] || { variant: 'default' as const, label: b.status }

                  return (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        #{b.id.slice(0, 8)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPinIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[110px]" title={b.load.loadingAddress}>
                            {truncate(b.load.loadingAddress, 18)}
                          </span>
                          <ArrowLongRightIcon className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                          <MapPinIcon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate max-w-[110px]" title={b.load.unloadingAddress}>
                            {truncate(b.load.unloadingAddress, 18)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        🆔 {b.truck.registrationNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{b.factoryOwner.name || 'Shipper'}</p>
                        <p className="text-[11px] text-surface-400">{formatPhone(b.factoryOwner.phone)}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{b.truckDriver.name || 'Transporter'}</p>
                        <p className="text-[11px] text-surface-400">{formatPhone(b.truckDriver.phone)}</p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                        {formatINR(Number(b.agreedPrice))}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={statusBadge.variant} size="sm" className="font-mono text-[10px]">
                          {statusBadge.label}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right text-surface-400">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="p-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="text-surface-400">Page {page} of {pages} · {total} Total Bookings</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
                className="font-bold border-white/10"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="font-bold border-white/10"
              >
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
