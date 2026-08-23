'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  BellAlertIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  TruckIcon,
  ArchiveBoxIcon,
  MapPinIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Skeleton,
  Tabs,
  EmptyState,
  ErrorState,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, timeAgo } from '@/lib/utils'

type Category = 'BOOKING' | 'LOAD' | 'TRUCK' | 'PAYMENT' | 'KYC' | 'TRACKING' | 'SYSTEM'

interface NotificationItem {
  id: string
  category: Category
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

const CATEGORY_META: Record<
  Category,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  BOOKING: { label: 'Bookings', icon: ArchiveBoxIcon, tone: 'text-primary-500 bg-primary-500/10' },
  LOAD: { label: 'Loads', icon: ArchiveBoxIcon, tone: 'text-info-500 bg-info-500/10' },
  TRUCK: { label: 'Fleet', icon: TruckIcon, tone: 'text-info-500 bg-info-500/10' },
  PAYMENT: { label: 'Payments', icon: CreditCardIcon, tone: 'text-success-500 bg-success-500/10' },
  KYC: { label: 'Verification', icon: ShieldCheckIcon, tone: 'text-warning-500 bg-warning-500/10' },
  TRACKING: { label: 'Tracking', icon: MapPinIcon, tone: 'text-primary-500 bg-primary-500/10' },
  SYSTEM: { label: 'System', icon: BellAlertIcon, tone: 'text-subtle bg-wash-strong' },
}

/**
 * Notification centre.
 *
 * Read state is persisted server-side via NotificationReceipt records keyed by
 * the notification's opaque id, which lets derived alerts (KYC reminders,
 * advisories) be dismissed just like stored notification rows.
 */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('ALL')
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await usersApi.getNotifications()
      setNotifications(res.data.notifications || [])
    } catch {
      setError('We could not load your notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  /** Optimistic single mark-as-read, rolled back if the request fails. */
  const markRead = async (item: NotificationItem) => {
    if (item.read || pending[item.id]) return
    setPending((prev) => ({ ...prev, [item.id]: true }))
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    )
    try {
      await usersApi.markNotificationRead(item.id)
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: false } : n))
      )
      toast.error('Could not mark that notification as read')
    } finally {
      setPending((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
    }
  }

  const markAllRead = async () => {
    if (unreadCount === 0 || markingAll) return
    const snapshot = notifications
    setMarkingAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      const res = await usersApi.markAllNotificationsRead()
      toast.success(`${res.data.markedCount} notification${res.data.markedCount === 1 ? '' : 's'} marked as read`)
    } catch {
      setNotifications(snapshot)
      toast.error('Could not mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const categoriesPresent = useMemo(() => {
    const set = new Set(notifications.map((n) => n.category))
    return (Object.keys(CATEGORY_META) as Category[]).filter((c) => set.has(c))
  }, [notifications])

  const tabItems = useMemo(
    () => [
      { id: 'ALL', label: 'All', count: notifications.length },
      { id: 'UNREAD', label: 'Unread', count: unreadCount },
      ...categoriesPresent.map((c) => ({
        id: c,
        label: CATEGORY_META[c].label,
        count: notifications.filter((n) => n.category === c).length,
      })),
    ],
    [notifications, unreadCount, categoriesPresent]
  )

  const visible = useMemo(() => {
    if (filter === 'ALL') return notifications
    if (filter === 'UNREAD') return notifications.filter((n) => !n.read)
    return notifications.filter((n) => n.category === filter)
  }, [notifications, filter])

  return (
    <DashboardLayout title="Notifications">
      <PageHeader
        title="Notification centre"
        description="Verification, booking, payment and tracking alerts across your account."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            loading={markingAll}
            leftIcon={<CheckIcon className="w-4 h-4" />}
          >
            Mark all read
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-11 w-full max-w-lg rounded-xl" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Notifications unavailable"
          message={error}
          onRetry={fetchNotifications}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellAlertIcon}
          title="You're all caught up"
          description="Alerts about verification, bookings, payments and shipment checkpoints will appear here."
          primaryAction={{ label: 'Go to dashboard', href: '/dashboard' }}
        />
      ) : (
        <div className="space-y-5">
          <Tabs
            items={tabItems}
            value={filter}
            onChange={setFilter}
            variant="pill"
            ariaLabel="Filter notifications"
          />

          {visible.length === 0 ? (
            <EmptyState
              icon={CheckCircleIcon}
              title="Nothing here"
              description={
                filter === 'UNREAD'
                  ? 'Every notification has been read.'
                  : 'No notifications in this category yet.'
              }
              primaryAction={{ label: 'Show all', onClick: () => setFilter('ALL') }}
            />
          ) : (
            <ul className="space-y-2.5" aria-live="polite">
              {visible.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  busy={Boolean(pending[item.id])}
                  onMarkRead={() => markRead(item)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}

function NotificationRow({
  item,
  busy,
  onMarkRead,
}: {
  item: NotificationItem
  busy: boolean
  onMarkRead: () => void
}) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.SYSTEM
  const Icon = meta.icon

  return (
    <li>
      <Card
        padding="md"
        className={cn(
          'transition-colors',
          !item.read && 'border-primary-500/30 bg-primary-500/[0.03]'
        )}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              meta.tone
            )}
            aria-hidden="true"
          >
            <Icon className="w-5 h-5" />
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className={cn(
                    'text-sm leading-snug',
                    item.read ? 'font-medium text-body' : 'font-semibold text-ink'
                  )}
                >
                  {item.title}
                  {!item.read && (
                    <span className="sr-only"> (unread)</span>
                  )}
                </h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{item.message}</p>
              </div>
              {!item.read && (
                <span
                  className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
              <Badge variant="neutral" size="sm">
                {meta.label}
              </Badge>
              <time
                className="text-xs text-subtle"
                dateTime={new Date(item.timestamp).toISOString()}
              >
                {timeAgo(item.timestamp)}
              </time>

              <span className="flex-1" />

              {item.actionUrl && (
                <Link
                  href={item.actionUrl}
                  onClick={onMarkRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                >
                  View
                  <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}

              {!item.read && (
                <button
                  type="button"
                  onClick={onMarkRead}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1 py-0.5"
                >
                  <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  Mark read
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </li>
  )
}
