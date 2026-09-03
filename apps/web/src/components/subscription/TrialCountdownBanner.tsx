'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Hourglass, ArrowRight, Zap, Clock, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubscriptionEntitlement } from '@/lib/subscription'

interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

function diffToParts(endsAt: string): CountdownParts {
  const totalMs = Math.max(0, new Date(endsAt).getTime() - Date.now())
  const days = Math.floor(totalMs / 86_400_000)
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000)
  const seconds = Math.floor((totalMs % 60_000) / 1000)
  return { days, hours, minutes, seconds, totalMs }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

/**
 * Feature 13 — live 3-month free trial countdown + upgrade CTA.
 * Shown on the dashboard: counts down in real time while the trial is active
 * and switches to an "upgrade now" call-to-action the moment it expires.
 */
export function TrialCountdownBanner({ entitlement }: { entitlement: SubscriptionEntitlement | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!entitlement?.trialEndsAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [entitlement?.trialEndsAt])

  const parts = useMemo(() => {
    if (!entitlement?.trialEndsAt) return null
    return diffToParts(entitlement.trialEndsAt)
  }, [entitlement?.trialEndsAt, now])

  if (!entitlement) return null

  // Paid subscription active → compact, non-intrusive status row.
  if (entitlement.hasSubscription) {
    return (
      <div className="bg-panel rounded-2xl border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-modal">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Crown className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-200 flex items-center gap-2">
              <span>Pro Access Active</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono uppercase">
                {entitlement.plan || 'plan'}
              </span>
            </div>
            <p className="text-xs text-surface-400 mt-0.5">
              {entitlement.expiresAt
                ? `Renews / expires ${new Date(entitlement.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Unlimited premium access enabled'}
            </p>
          </div>
        </div>
        <Link
          href="/subscribe"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 border border-white/10 text-white text-xs font-bold transition-all shrink-0"
        >
          <span>Manage Pass</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const trialOver = !entitlement.isTrialActive
  const urgent = !trialOver && entitlement.trialDaysRemaining <= 7

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 shadow-modal overflow-hidden relative',
        trialOver
          ? 'bg-danger-950/40 border-danger-500/40'
          : urgent
            ? 'bg-amber-950/40 border-amber-500/40'
            : 'bg-emerald-950/30 border-emerald-500/30',
      )}
    >
      {/* Accent glow */}
      <div
        className={cn(
          'absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none',
          trialOver ? 'bg-danger-500' : urgent ? 'bg-amber-500' : 'bg-emerald-500',
        )}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border',
              trialOver
                ? 'bg-danger-500/15 text-danger-400 border-danger-500/30'
                : urgent
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            )}
          >
            {trialOver ? <Hourglass className="w-5 h-5 stroke-[2.2]" /> : <Clock className="w-5 h-5 stroke-[2.2]" />}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn('text-sm sm:text-base font-bold', trialOver ? 'text-danger-200' : 'text-white')}>
                {trialOver
                  ? 'Your 3-Month Free Trial Has Ended'
                  : '3-Month Pro Trial — Free Access Period'}
              </h3>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider',
                  trialOver
                    ? 'bg-danger-500/15 text-danger-300 border-danger-500/30'
                    : urgent
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                )}
              >
                {trialOver ? 'Trial Expired' : urgent ? 'Ending Soon' : 'Trial Active'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-surface-300 leading-relaxed">
              {trialOver ? (
                <>
                  Unlimited contact reveals, direct WhatsApp dispatch and priority matching are locked. Renew a pass to keep full marketplace access.
                </>
              ) : (
                <>
                  Full premium access unlocked — unlimited contact reveals, direct WhatsApp dispatch and priority matching.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4 shrink-0">
          {!trialOver && parts && (
            <div
              className={cn(
                'flex items-center gap-1.5 font-mono',
                urgent ? 'text-amber-200' : 'text-emerald-200',
              )}
            >
              {[
                { label: 'days', value: String(parts.days) },
                { label: 'hrs', value: pad(parts.hours) },
                { label: 'min', value: pad(parts.minutes) },
                { label: 'sec', value: pad(parts.seconds) },
              ].map((seg, i) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-surface-500">:</span>}
                  <div
                    className={cn(
                      'rounded-lg px-2 py-1 text-center border min-w-[46px]',
                      urgent
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/30',
                    )}
                  >
                    <div className="text-base sm:text-lg font-black tabular-nums leading-none">{seg.value}</div>
                    <div className="text-[9px] uppercase tracking-wider opacity-70 mt-0.5">{seg.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/subscribe"
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 border focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
              trialOver
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-glow-primary border-primary-400/30'
                : 'bg-surface-900 hover:bg-surface-800 text-white border-white/10 hover:border-primary-500/40',
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{trialOver ? 'Upgrade Now — from ₹999/mo' : 'Upgrade & Keep Access'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Trial progress bar */}
      {!trialOver && entitlement.trialStartedAt && entitlement.trialEndsAt && parts && (
        <div className="relative mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-surface-400 mb-1.5">
            <span>Trial Progress</span>
            <span>{entitlement.trialDaysRemaining} of {entitlement.trialDurationDays} days left</span>
          </div>
          <div className="h-2 rounded-full bg-surface-950 border border-white/5 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                urgent ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400',
              )}
              style={{
                width: `${Math.max(
                  2,
                  Math.min(
                    100,
                    ((entitlement.trialDurationDays - parts.totalMs / 86_400_000) / entitlement.trialDurationDays) * 100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
