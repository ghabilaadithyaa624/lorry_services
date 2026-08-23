'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BriefcaseIcon,
  MapPinIcon,
  TruckIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  KpiCard,
  PageHeader,
  Skeleton,
  Tabs,
} from '@/components/ui'
import { cn, formatINR } from '@/lib/utils'

/**
 * Booking statuses exactly as defined by the backend `BookingStatus` enum.
 * Keeping this list aligned prevents the UI from offering states the API
 * cannot represent.
 */
type BookingStatus = 'Pending' | 'Confirmed' | 'InTransit' | 'Completed' | 'Cancelled'

interface BookingRow {
  id: string
  agreedPrice: number | string
  status: BookingStatus
  advanceConfirmed?: boolean
  balanceConfirmed?: boolean
  createdAt: string
  load?: {
    loadingAddress?: string
    unloadingAddress?: string
    tonnageRequired?: number | string
  }
  truck?: {
    registrationNumber?: string
    bodyType?: string
  }
}

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'info' | 'primary' | 'success' | 'danger'> = {
  Pending: 'default',
  Confirmed: 'info',
  InTransit: 'primary',
  Completed: 'success',
  Cancelled: 'danger',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  InTransit: 'In transit',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

/**
 * Bookings index.
 *
 * Consolidated list of every booking the signed-in user participates in,
 * sourced from GET /bookings/my-bookings. The API already scopes results by
 * role (load owner vs truck owner), so no client-side authorization is implied.
 */
export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [query, setQuery] = useState('')

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await api.get('/bookings/my-bookings')
      setBookings(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const counts = useMemo(() => {
    const base = {
      ALL: bookings.length,
      Pending: 0,
      Confirmed: 0,
      InTransit: 0,
      Completed: 0,
      Cancelled: 0,
    } as Record<string, number>
    bookings.forEach((b) => {
      if (base[b.status] !== undefined) base[b.status] += 1
    })
    return base
  }, [bookings])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
      if (!term) return true
      return [
        b.id,
        b.load?.loadingAddress,
        b.load?.unloadingAddress,
        b.truck?.registrationNumber,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    })
  }, [bookings, statusFilter, query])

  const activeValue = useMemo(
    () => bookings.filter((b) => b.status === 'Confirmed' || b.status === 'InTransit').length,
    [bookings]
  )

  const tabs = [
    { id: 'ALL', label: 'All', count: counts.ALL },
    { id: 'Pending', label: 'Pending', count: counts.Pending },
    { id: 'Confirmed', label: 'Confirmed', count: counts.Confirmed },
    { id: 'InTransit', label: 'In transit', count: counts.InTransit },
    { id: 'Completed', label: 'Completed', count: counts.Completed },
    { id: 'Cancelled', label: 'Cancelled', count: counts.Cancelled },
  ]

  return (
    <DashboardLayout title="Bookings">
      <PageHeader
        title="Bookings"
        description="Every consignment you are party to, with its current commercial and movement status."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Bookings' }]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchBookings}
            loading={loading}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Refresh
          </Button>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total bookings" value={counts.ALL} icon={BriefcaseIcon} loading={loading} />
          <KpiCard label="Active now" value={activeValue} icon={TruckIcon} tone="primary" loading={loading} />
          <KpiCard label="Completed" value={counts.Completed} tone="success" loading={loading} />
          <KpiCard label="Pending" value={counts.Pending} tone="warning" loading={loading} />
        </div>
      </PageHeader>

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <Tabs
            items={tabs}
            value={statusFilter}
            onChange={setStatusFilter}
            variant="pill"
            ariaLabel="Filter bookings by status"
            className="flex-1 min-w-0"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search route, vehicle or ID"
            aria-label="Search bookings"
            leftElement={<MagnifyingGlassIcon className="w-4 h-4" />}
            containerClassName="lg:w-72"
          />
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading bookings">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} variant="rectangular" className="h-28 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Could not load bookings"
            message="The booking service did not respond. Please retry."
            onRetry={fetchBookings}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BriefcaseIcon}
            title={bookings.length === 0 ? 'No bookings yet' : 'No bookings match these filters'}
            description={
              bookings.length === 0
                ? 'Bookings appear here once a load is matched with a verified truck and confirmed.'
                : 'Try a different status or clear the search to see more results.'
            }
            primaryAction={
              bookings.length === 0
                ? { label: 'Find trucks', href: '/search?type=truck' }
                : {
                    label: 'Clear filters',
                    onClick: () => {
                      setStatusFilter('ALL')
                      setQuery('')
                    },
                  }
            }
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((booking) => (
              <li key={booking.id}>
                <Card padding="none" hover>
                  <Link
                    href={`/booking/${booking.id}`}
                    className="block p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset rounded-card"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={STATUS_VARIANT[booking.status]} size="sm">
                            {STATUS_LABEL[booking.status] || booking.status}
                          </Badge>
                          <span className="text-xs text-subtle font-mono">
                            #{booking.id.slice(0, 8)}
                          </span>
                          {booking.advanceConfirmed && (
                            <Badge variant="success" size="sm">
                              Advance paid
                            </Badge>
                          )}
                        </div>

                        {/* Route */}
                        <div className="flex items-start gap-2 text-sm">
                          <MapPinIcon
                            className="w-4 h-4 text-primary-500 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <p className="text-body min-w-0 break-words">
                            <span className="font-medium text-ink">
                              {booking.load?.loadingAddress || 'Pickup'}
                            </span>
                            <span className="text-subtle mx-1.5" aria-label="to">
                              →
                            </span>
                            <span className="font-medium text-ink">
                              {booking.load?.unloadingAddress || 'Destination'}
                            </span>
                          </p>
                        </div>

                        {booking.truck?.registrationNumber && (
                          <p className="text-xs text-muted mt-1.5 flex items-center gap-1.5">
                            <TruckIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span className="font-mono">{booking.truck.registrationNumber}</span>
                            {booking.truck.bodyType && <span>· {booking.truck.bodyType}</span>}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                        <p className="text-lg font-bold text-ink tabular-nums">
                          {formatINR(Number(booking.agreedPrice) || 0)}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                          View details
                          <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
