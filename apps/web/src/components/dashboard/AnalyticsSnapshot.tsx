'use client'

import React from 'react'
import Link from 'next/link'
import { BarChart3, TrendingUp, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { cn, formatINR } from '@/lib/utils'

export interface AnalyticsSnapshotProps {
  totalLoads: number
  trucksMatched: number
  avgHireRate: number
  subscriptionActive: boolean
  className?: string
}

/**
 * Dashboard Analytics (Prompt 6).
 *
 * A dependency-free analytics widget using CSS/SVG bar + donut charts so the
 * shipper/truck-owner dashboard surfaces the key operating metrics and a
 * subscription-expiry reminder without pulling in a charting runtime.
 */
export function AnalyticsSnapshot({
  totalLoads,
  trucksMatched,
  avgHireRate,
  subscriptionActive,
  className,
}: AnalyticsSnapshotProps) {
  const maxValue = Math.max(totalLoads, trucksMatched, 1)
  const loadsPct = Math.round((totalLoads / maxValue) * 100)
  const trucksPct = Math.round((trucksMatched / maxValue) * 100)
  const activePct = subscriptionActive ? 100 : 18
  const radius = 42
  const circumference = 2 * Math.PI * radius

  return (
    <section
      aria-label="Marketplace analytics"
      className={cn(
        'rounded-2xl border border-white/10 bg-panel shadow-modal p-5 sm:p-6',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Marketplace Analytics</h2>
            <p className="text-xs text-surface-400">LorryCarry network operating snapshot</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 pt-5">
        {/* Bar chart */}
        <div className="lg:col-span-3 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-surface-400">
              <span>Total loads posted</span>
              <span className="font-mono font-bold text-white">{totalLoads}</span>
            </div>
            <div className="h-3 rounded-full bg-surface-950 border border-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-orange-500 shadow-glow-primary"
                style={{ width: `${loadsPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-surface-400">
              <span>Trucks matched</span>
              <span className="font-mono font-bold text-white">{trucksMatched}</span>
            </div>
            <div className="h-3 rounded-full bg-surface-950 border border-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-glow-sm"
                style={{ width: `${trucksPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-surface-950/80 border border-white/5 p-3.5">
            <span className="text-xs font-medium text-surface-400">Average hire rate</span>
            <span className="inline-flex items-center gap-1 text-sm font-mono font-bold text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              {formatINR(avgHireRate)}/load
            </span>
          </div>
        </div>

        {/* Donut + subscription state */}
        <div className="lg:col-span-2 rounded-2xl bg-surface-950/80 border border-white/5 p-4 space-y-4">
          <div className="flex items-center justify-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90" role="img" aria-label={`Subscription ${subscriptionActive ? 'active' : 'inactive'}`}>
                <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={subscriptionActive ? '#10b981' : '#f97316'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(activePct / 100) * circumference} ${circumference}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black font-mono text-white">{activePct}%</span>
                <span className="text-[10px] uppercase tracking-wider text-surface-400">Active</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {subscriptionActive ? 'Subscription Active' : 'Subscription Inactive'}
              </p>
              <p className="text-xs text-surface-400">
                {subscriptionActive
                  ? 'Direct contact pass enabled.'
                  : 'Upgrade to unlock direct contacts.'}
              </p>
            </div>
          </div>

          {!subscriptionActive && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-500/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200 leading-relaxed">
                Your subscription is inactive. Renew to keep direct transporter contact and
                dispatch alerts working on every match.
              </p>
            </div>
          )}

          <Link
            href="/subscribe"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30"
          >
            <span>{subscriptionActive ? 'Manage subscription' : 'View subscription plans'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default AnalyticsSnapshot
