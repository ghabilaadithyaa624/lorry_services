'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Sparkles } from 'lucide-react'

export interface TrialStatus {
  hasSubscription: boolean
  plan?: string | null
  expiresAt?: string | Date | null
  isTrial?: boolean
  trialDaysTotal?: number | null
  trialDaysLeft?: number | null
  trialProgressPercent?: number | null
  canUpgrade?: boolean
}

interface TrialAccessBannerProps {
  status: TrialStatus | null
  compact?: boolean
}

/**
 * A reusable trial entitlement surface. It only renders for the server-issued
 * free_trial plan, so an active paid pass never receives an inaccurate prompt.
 */
export function TrialAccessBanner({ status, compact = false }: TrialAccessBannerProps) {
  if (!status?.isTrial || !status.hasSubscription) return null

  const totalDays = status.trialDaysTotal ?? 90
  const daysLeft = Math.max(0, status.trialDaysLeft ?? totalDays)
  const remainingPercent = Math.max(0, Math.min(100, status.trialProgressPercent ?? 100))
  const expiry = status.expiresAt
    ? new Date(status.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const dayCopy = daysLeft === 1 ? 'day left' : 'days left'

  if (compact) {
    return (
      <section
        aria-label="Free trial status"
        className="rounded-2xl border border-primary-500/35 bg-primary-500/10 px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink">Free trial · {daysLeft} {dayCopy}</p>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary-950/15 dark:bg-white/10"
              role="progressbar"
              aria-label={`${daysLeft} of ${totalDays} free trial days remaining`}
              aria-valuemin={0}
              aria-valuemax={totalDays}
              aria-valuenow={daysLeft}
            >
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${remainingPercent}%` }} />
            </div>
          </div>
          <Link
            href="/subscribe"
            className="shrink-0 text-xs font-extrabold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Upgrade
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Free trial status"
      className="relative overflow-hidden rounded-[22px] border border-primary-500/35 bg-gradient-to-br from-primary-500/15 via-primary-500/10 to-amber-400/10 p-5 sm:p-6 shadow-card"
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-glow-primary sm:h-12 sm:w-12">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">
                Full marketplace access
              </p>
              <span className="rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:text-primary-300">
                Free trial
              </span>
            </div>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-ink sm:text-xl">
              Your 3-month trial is active
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Explore every workflow, connect directly, and build momentum before choosing a plan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:justify-end">
          <div className="min-w-[114px] rounded-2xl border border-primary-500/20 bg-panel/70 px-3.5 py-2.5 text-left shadow-xs backdrop-blur-sm">
            <span className="block text-2xl font-black leading-none text-primary-600 dark:text-primary-400">{daysLeft}</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{dayCopy}</span>
          </div>
          <Link
            href="/subscribe"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Upgrade when you&apos;re ready
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="relative mt-5 border-t border-primary-500/20 pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-body">Trial time remaining</span>
          <span className="flex items-center gap-1.5 font-medium text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {expiry ? `Ends ${expiry}` : `${totalDays}-day access`}
          </span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-primary-950/15 dark:bg-white/10"
          role="progressbar"
          aria-label={`${daysLeft} of ${totalDays} free trial days remaining`}
          aria-valuemin={0}
          aria-valuemax={totalDays}
          aria-valuenow={daysLeft}
          aria-valuetext={`${daysLeft} of ${totalDays} days left in your free trial`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-amber-400 transition-[width] duration-500"
            style={{ width: `${remainingPercent}%` }}
          />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-success-500" aria-hidden="true" />
          No payment details required during your trial.
        </p>
      </div>
    </section>
  )
}

export default TrialAccessBanner
