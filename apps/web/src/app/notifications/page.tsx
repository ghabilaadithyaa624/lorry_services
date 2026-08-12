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
import { Badge, GlassPanel, StatusDot, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type PriorityTier = 'ACTION_REQUIRED' | 'ATTENTION' | 'INFORMATION' | 'COMPLETED'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePriority, setActivePriority] = useState<string>('ALL')

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await usersApi.getNotifications()
      const rawList = res.data.notifications || []

      // Map raw notifications into priority tiers
      const mapped = rawList.map((item: any) => {
        let priority: PriorityTier = 'INFORMATION'
        if (item.category === 'KYC' && item.title?.includes('Action')) {
          priority = 'ACTION_REQUIRED'
        } else if (item.category === 'PAYMENT' || item.category === 'BOOKING') {
          if (item.message?.includes('pending') || item.message?.includes('required')) {
            priority = 'ACTION_REQUIRED'
          } else if (item.message?.includes('confirmed') || item.message?.includes('settled')) {
            priority = 'COMPLETED'
          } else {
            priority = 'ATTENTION'
          }
        } else if (item.category === 'TRACKING') {
          priority = 'INFORMATION'
        }
        return { ...item, priority }
      })

      setNotifications(mapped)
      setUnreadCount(res.data.unreadCount || 0)
    } catch {
      setError('Failed to load notifications')
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const getPriorityBadge = (priority: PriorityTier) => {
    switch (priority) {
      case 'ACTION_REQUIRED':
        return <Badge variant="danger" size="sm" className="font-mono text-[10px]">🚨 ACTION REQUIRED</Badge>
      case 'ATTENTION':
        return <Badge variant="warning" size="sm" className="font-mono text-[10px]">🟡 ATTENTION</Badge>
      case 'COMPLETED':
        return <Badge variant="success" size="sm" className="font-mono text-[10px]">✓ COMPLETED</Badge>
      default:
        return <Badge variant="info" size="sm" className="font-mono text-[10px]">ℹ INFORMATION</Badge>
    }
  }

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

  const filteredNotifications = notifications.filter((n) => {
    if (activePriority === 'ALL') return true
    if (activePriority === 'UNREAD') return !n.read
    return n.priority === activePriority || n.category === activePriority
  })

  const priorityTabs = [
    { id: 'ALL', label: `All Alerts (${notifications.length})` },
    { id: 'UNREAD', label: `Unread (${unreadCount})` },
    { id: 'ACTION_REQUIRED', label: 'Action required' },
    { id: 'ATTENTION', label: 'Attention' },
    { id: 'INFORMATION', label: 'Information' },
    { id: 'COMPLETED', label: 'Completed' },
  ]

  return (
    <DashboardLayout
      title="Notifications"
      subtitle="Operational alerts and account activity"
      action={
        unreadCount > 0 ? (
          <Badge variant="danger" size="md" className="text-xs">
            {unreadCount} unread
          </Badge>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto font-sans">
        
        {/* Priority Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-white/10 pb-3">
          {priorityTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePriority(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all whitespace-nowrap cursor-pointer',
                activePriority === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-900/80 text-surface-400 hover:text-white hover:bg-white/5 border border-white/10'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List Panel */}
        <GlassPanel padding="none" className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm font-sans text-danger-300">
              {error}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <StatusDot variant="active" pulse />
                <span className="text-sm font-semibold text-emerald-400">Network clear</span>
              </div>
              <p className="text-xs text-surface-400 max-w-sm mx-auto font-sans">
                No new operational notifications requiring your attention.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredNotifications.map((item) => {
                const Icon = getCategoryIcon(item.category)

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                      item.read
                        ? 'hover:bg-white/5'
                        : 'bg-primary-950/20 hover:bg-primary-950/40 border-l-4 border-l-primary-500'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-950 text-primary-400 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {item.title}
                          </span>
                          {getPriorityBadge(item.priority || 'INFORMATION')}
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 shadow-glow-primary" />
                          )}
                        </div>

                        <p className="text-xs text-surface-300 leading-relaxed font-sans">
                          {item.message}
                        </p>

                        <p className="text-[11px] text-surface-500 font-mono">
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 text-white hover:from-primary-600 hover:to-primary-700 text-xs font-mono font-bold shrink-0 transition-all shadow-glow-primary self-end sm:self-center"
                      >
                        <span>Open Action</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </GlassPanel>

      </div>
    </DashboardLayout>
  )
}
