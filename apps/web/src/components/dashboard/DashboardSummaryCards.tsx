'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn, formatINR } from '@/lib/utils'

interface DashboardSummaryCardsProps {
  activeBookings: number
  completedTrips: number
  earnings: number
  loading?: boolean
}

const cards = [
  {
    key: 'activeBookings',
    label: 'dashboard.activeBookings',
    hint: 'dashboard.activeBookingsHint',
    href: '/bookings',
    icon: CalendarClock,
    tone: 'primary',
  },
  {
    key: 'completedTrips',
    label: 'dashboard.completedTrips',
    hint: 'dashboard.completedTripsHint',
    href: '/activity',
    icon: CheckCircle2,
    tone: 'success',
  },
  {
    key: 'earnings',
    label: 'dashboard.earnings',
    hint: 'dashboard.earningsHint',
    href: '/analytics',
    icon: IndianRupee,
    tone: 'amber',
  },
] as const

/**
 * The three decision metrics operators need immediately after signing in.
 * Cards stay linkable so the summary doubles as a launch pad on small screens.
 */
export function DashboardSummaryCards({
  activeBookings,
  completedTrips,
  earnings,
  loading = false,
}: DashboardSummaryCardsProps) {
  const { t } = useI18n()
  const values = {
    activeBookings,
    completedTrips,
    earnings: formatINR(earnings),
  }

  return (
    <section aria-labelledby="dashboard-summary-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-500">{t('dashboard.atAGlance')}</p>
          <h2 id="dashboard-summary-heading" className="mt-1 text-lg font-bold text-ink sm:text-xl">{t('dashboard.summaryTitle')}</h2>
        </div>
        <div className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          {t('dashboard.summaryHint')}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          const value = values[card.key]
          return (
            <Link
              key={card.key}
              href={card.href}
              className={cn(
                'group relative overflow-hidden rounded-card border border-hairline bg-panel p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500/40 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:p-5',
                card.tone === 'success' && 'hover:border-emerald-500/40',
                card.tone === 'amber' && 'hover:border-amber-500/40'
              )}
            >
              <div className={cn(
                'absolute inset-x-0 top-0 h-1',
                card.tone === 'primary' && 'bg-primary-500',
                card.tone === 'success' && 'bg-emerald-500',
                card.tone === 'amber' && 'bg-amber-500'
              )} aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <span className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  card.tone === 'primary' && 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
                  card.tone === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  card.tone === 'amber' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-semibold text-muted">{t(card.label)}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-sunken" aria-label="Loading" /> : value}
              </p>
              <p className="mt-1 text-xs text-subtle">{t(card.hint)}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default DashboardSummaryCards
