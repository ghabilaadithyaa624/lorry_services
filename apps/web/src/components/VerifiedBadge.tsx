'use client'

import React from 'react'
import { ShieldCheck, Clock, ShieldAlert, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VerificationTone = 'verified' | 'pending' | 'action_required' | 'rejected'

interface VerifiedBadgeProps {
  /** Whether the transporter/vehicle has completed verification. */
  verified: boolean
  /** 'vahan' renders the "Vahan Verified" label; other values adjust the copy. */
  source?: 'vahan' | 'kyc' | 'manual'
  /** ISO timestamp of the last validation — shown in the tooltip. */
  validatedAt?: string | null
  /** Explicit override when you need rejected / action-required states. */
  tone?: VerificationTone
  /** Match the page theme: marketplace pages are light, dashboards are dark. */
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md'
  className?: string
}

const COPY: Record<NonNullable<VerifiedBadgeProps['source']>, string> = {
  vahan: 'Vahan Verified',
  kyc: 'KYC Verified',
  manual: 'Verified',
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Verification badge for transporter / vehicle cards.
 *
 * Backed by the Vahan RC validation pipeline — a "Vahan Verified" badge means
 * the registration number resolved in the mParivahan (Vahan) database and the
 * RC is ACTIVE. `pending` means verification has not completed yet.
 */
export function VerifiedBadge({
  verified,
  source = 'vahan',
  validatedAt,
  tone,
  variant = 'light',
  size = 'sm',
  className,
}: VerifiedBadgeProps) {
  const resolvedTone: VerificationTone =
    tone ?? (verified ? 'verified' : 'pending')

  const dateLabel = formatDate(validatedAt)
  const tooltip =
    resolvedTone === 'verified'
      ? `Registration Certificate validated against the Vahan (mParivahan) database${dateLabel ? ` on ${dateLabel}` : ''}. RC is ACTIVE.`
      : resolvedTone === 'pending'
      ? 'Verification pending — the Registration Certificate has not been validated yet.'
      : resolvedTone === 'action_required'
      ? 'Verification flagged — action required before dispatch.'
      : 'Verification rejected — this vehicle cannot be booked.'

  const base =
    'inline-flex items-center rounded-full border font-semibold whitespace-nowrap'
  const sizeCls =
    size === 'sm'
      ? 'gap-1 px-2.5 py-0.5 text-xs'
      : 'gap-1.5 px-3 py-1 text-sm'
  const IconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  const toneCls =
    variant === 'light'
      ? {
          verified: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          pending: 'bg-gray-50 text-gray-600 border-gray-200',
          action_required: 'bg-amber-50 text-amber-700 border-amber-200/80',
          rejected: 'bg-red-50 text-red-600 border-red-200/80',
        }[resolvedTone]
      : {
          verified: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
          pending: 'bg-surface-900 text-surface-400 border-white/10',
          action_required: 'bg-amber-950/50 text-amber-300 border-amber-500/30',
          rejected: 'bg-danger-950/50 text-danger-400 border-danger-500/30',
        }[resolvedTone]

  const iconCls =
    variant === 'light'
      ? {
          verified: 'text-emerald-600',
          pending: 'text-gray-400',
          action_required: 'text-amber-600',
          rejected: 'text-red-500',
        }[resolvedTone]
      : {
          verified: 'text-emerald-400',
          pending: 'text-surface-400',
          action_required: 'text-amber-400',
          rejected: 'text-danger-400',
        }[resolvedTone]

  const Icon =
    resolvedTone === 'verified'
      ? ShieldCheck
      : resolvedTone === 'pending'
      ? Clock
      : resolvedTone === 'action_required'
      ? ShieldAlert
      : ShieldX

  const label =
    resolvedTone === 'verified'
      ? COPY[source]
      : resolvedTone === 'pending'
      ? 'Verification Pending'
      : resolvedTone === 'action_required'
      ? 'Action Required'
      : 'Verification Rejected'

  return (
    <span title={tooltip} className={cn(base, sizeCls, toneCls, className)}>
      <Icon className={cn(IconCls, iconCls)} aria-hidden />
      <span>{label}</span>
      {resolvedTone === 'verified' && dateLabel && size === 'md' && (
        <span className={cn('font-normal opacity-75', size === 'md' ? 'text-xs' : '')}>· {dateLabel}</span>
      )}
    </span>
  )
}
