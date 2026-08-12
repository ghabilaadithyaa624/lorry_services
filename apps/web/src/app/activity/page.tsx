'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArchiveBoxIcon,
  TruckIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  CreditCardIcon,
  UserCircleIcon,
  ArrowRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import { Badge, GlassPanel, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await usersApi.getActivity()
      setActivities(res.data || [])
    } catch {
      setError('Failed to load activity log')
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
        return 'bg-primary-500/20 text-primary-400 border-primary-500/40'
      case 'TRUCK':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      case 'DOCUMENT':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40'
      case 'BOOKING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      case 'PAYMENT':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      default:
        return 'bg-surface-800 text-surface-300 border-white/10'
    }
  }

  const filteredActivities =
    activeCategory === 'ALL'
      ? activities
      : activities.filter((a) => a.category === activeCategory)

  const categories = [
    { id: 'ALL', label: 'All Operations' },
    { id: 'LOAD', label: 'Freight Posts' },
    { id: 'TRUCK', label: 'Fleet Registrations' },
    { id: 'DOCUMENT', label: 'KYC & Documents' },
    { id: 'BOOKING', label: 'Bookings' },
    { id: 'PAYMENT', label: 'Payments' },
  ]

  return (
    <DashboardLayout
      title="Activity log"
      subtitle="Chronological record of your LorryCarry operations."
    >
      <div className="space-y-6 max-w-4xl mx-auto font-sans">
        
        {/* Filter Category Tabs */}
        <div className="flex flex-wrap gap-2 pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer select-none',
                activeCategory === c.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-[#0F131D] border border-white/10 text-surface-300 hover:bg-white/5 hover:text-white'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Timeline Stream Panel */}
        <GlassPanel padding="lg">
          {loading ? (
            <div className="space-y-4">
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm font-sans text-danger-300">
              {error}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-950 text-surface-400 border border-white/5 flex items-center justify-center mx-auto">
                <ClockIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white font-sans">
                No activity recorded
              </h3>
              <p className="text-xs text-surface-400 max-w-sm mx-auto leading-relaxed font-sans">
                Actions like posting freight, registering trucks, or completing bookings will populate this log.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {filteredActivities.map((act) => {
                const Icon = getActivityIcon(act.category)
                const colorClass = getActivityColor(act.category)

                return (
                  <div key={act.id} className="relative group">
                    <div
                      className={cn(
                        'absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border-2 border-[#070A11] shadow-card',
                        colorClass
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group-hover:border-primary-500/40 transition-colors shadow-card">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">
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
                              className="text-[10px]"
                            >
                              {act.status}
                            </Badge>
                          )}
                          <span className="text-[10px] uppercase font-bold text-surface-400 bg-surface-900 border border-white/5 px-2 py-0.5 rounded-md">
                            {act.category}
                          </span>
                        </div>

                        <p className="text-xs text-surface-300 leading-relaxed font-sans">
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
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary-400 hover:text-primary-300 hover:underline shrink-0 self-end sm:self-center"
                        >
                          <span>View Details</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
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
