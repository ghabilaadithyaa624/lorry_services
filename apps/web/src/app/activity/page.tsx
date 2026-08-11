'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClockIcon,
  ArchiveBoxIcon,
  TruckIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  CreditCardIcon,
  UserCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import { Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const res = await usersApi.getActivity()
      setActivities(res.data || [])
    } catch {
      toast.error('Failed to load activity history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'LOAD':
        return ArchiveBoxIcon
      case 'TRUCK':
        return TruckIcon
      case 'DOCUMENT':
        return DocumentCheckIcon
      case 'BOOKING':
        return CheckCircleIcon
      case 'PAYMENT':
        return CreditCardIcon
      default:
        return UserCircleIcon
    }
  }

  const getActivityColor = (category: string) => {
    switch (category) {
      case 'LOAD':
        return 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'
      case 'TRUCK':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
      case 'DOCUMENT':
        return 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
      case 'BOOKING':
        return 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
      default:
        return 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
    }
  }

  const filteredActivities =
    activeCategory === 'ALL'
      ? activities
      : activities.filter((a) => a.category === activeCategory)

  const categories = [
    { id: 'ALL', label: 'All Activities' },
    { id: 'LOAD', label: 'Freight Posts' },
    { id: 'TRUCK', label: 'Fleet Registrations' },
    { id: 'DOCUMENT', label: 'KYC & Documents' },
    { id: 'BOOKING', label: 'Bookings' },
    { id: 'PAYMENT', label: 'Payments' },
  ]

  if (loading) {
    return (
      <DashboardLayout title="Activity Log" subtitle="Comprehensive audit trail of marketplace events">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Activity & Audit Log"
      subtitle="Complete chronological record of all load postings, truck registrations, bookings, and document actions"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Filter Category Tabs */}
        <div className="flex flex-wrap gap-2 pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                activeCategory === c.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Timeline Stream Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400 flex items-center justify-center mx-auto">
                <ClockIcon className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                No Activity Records Found
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
                Actions you perform in the marketplace (posting freight, registering trucks, booking consignments) will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200 dark:before:bg-surface-800">
              {filteredActivities.map((act) => {
                const Icon = getActivityIcon(act.category)
                const colorClass = getActivityColor(act.category)

                return (
                  <div key={act.id} className="relative group">
                    {/* Bullet marker */}
                    <div
                      className={cn(
                        'absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border-2 border-white dark:border-surface-900 shadow-xs',
                        colorClass
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    {/* Content Box */}
                    <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group-hover:border-primary-200 dark:group-hover:border-primary-800 transition-colors">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-surface-900 dark:text-white">
                            {act.title}
                          </span>
                          {act.status && (
                            <Badge
                              variant={
                                act.status === 'Completed' || act.status === 'Verified' || act.status === 'Success'
                                  ? 'success'
                                  : act.status === 'Pending' || act.status === 'InTransit'
                                  ? 'warning'
                                  : 'info'
                              }
                              size="sm"
                            >
                              {act.status}
                            </Badge>
                          )}
                          <span className="text-[10px] uppercase font-bold text-surface-400 bg-surface-200/60 dark:bg-surface-700 px-1.5 py-0.5 rounded">
                            {act.category}
                          </span>
                        </div>

                        <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                          {act.description}
                        </p>

                        <p className="text-[11px] text-surface-400 font-mono">
                          {new Date(act.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {act.actionUrl && (
                        <Link
                          href={act.actionUrl}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline shrink-0 self-end sm:self-center"
                        >
                          <span>View Details</span>
                          <ArrowRightIcon className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
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
