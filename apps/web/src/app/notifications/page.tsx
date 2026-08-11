'use client'

import React, { useState, useEffect } from 'react'
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
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import { Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('ALL')

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await usersApi.getNotifications()
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'BOOKING':
        return CheckCircleIcon
      case 'TRACKING':
        return MapPinIcon
      case 'PAYMENT':
        return CreditCardIcon
      case 'KYC':
        return ShieldCheckIcon
      case 'TRUCK':
        return TruckIcon
      case 'LOAD':
        return ArchiveBoxIcon
      default:
        return BellAlertIcon
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TRACKING':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
      case 'KYC':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
      case 'BOOKING':
        return 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'
      default:
        return 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
    }
  }

  const filteredNotifications =
    activeTab === 'ALL'
      ? notifications
      : notifications.filter((n) => n.category === activeTab)

  const tabs = [
    { id: 'ALL', label: 'All Alerts' },
    { id: 'TRACKING', label: 'Tracking & Checkpoints' },
    { id: 'BOOKING', label: 'Bookings' },
    { id: 'KYC', label: 'KYC & Compliance' },
    { id: 'PAYMENT', label: 'Payments & Passes' },
  ]

  if (loading) {
    return (
      <DashboardLayout title="Notification Center" subtitle="Real-time operational alerts and dispatch updates">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Notification Center"
      subtitle="Operational alerts, checkpoint crossing updates, payment confirmations, and KYC verification notices"
      action={
        unreadCount > 0 ? (
          <Badge variant="warning" size="md">
            {unreadCount} Unread Alert{unreadCount > 1 ? 's' : ''}
          </Badge>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400 flex items-center justify-center mx-auto">
                <BellAlertIcon className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                No Notifications Found
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
                You are all caught up! Real-time alerts for bookings, checkpoints, and KYC will appear here as they occur.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredNotifications.map((item) => {
                const Icon = getCategoryIcon(item.category)
                const colorClass = getCategoryColor(item.category)

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                      item.read
                        ? 'hover:bg-surface-50/50 dark:hover:bg-surface-800/30'
                        : 'bg-primary-50/30 dark:bg-primary-950/20 hover:bg-primary-50/50'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-surface-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-surface-500 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                          {item.message}
                        </p>

                        <p className="text-[11px] text-surface-400 font-mono">
                          {new Date(item.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {item.actionUrl && (
                      <Link
                        href={item.actionUrl}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-surface-900 text-white dark:bg-white dark:text-surface-900 hover:opacity-90 text-xs font-bold shrink-0 transition-opacity self-end sm:self-center"
                      >
                        <span>Open Action</span>
                        <ArrowRightIcon className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
