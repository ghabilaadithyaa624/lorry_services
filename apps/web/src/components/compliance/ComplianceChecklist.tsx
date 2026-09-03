'use client'

import React from 'react'
import {
  BadgeCheck,
  FileText,
  HeartPulse,
  ShieldCheck,
  Leaf,
  Stamp,
  Receipt,
  CircleDollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import type { ComplianceChecklist, ComplianceItem, ComplianceItemStatus } from '@/lib/api'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const ITEM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rc_vahan: BadgeCheck,
  insurance: HeartPulse,
  fitness: ShieldCheck,
  permit: Stamp,
  puc: Leaf,
  eway_bill: Receipt,
  fastag: CircleDollarSign,
}

const STATUS_META: Record<
  ComplianceItemStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; cls: string; iconCls: string }
> = {
  compliant: {
    icon: CheckCircle2,
    label: 'Compliant',
    cls: 'bg-emerald-500/10 border-emerald-500/25',
    iconCls: 'text-emerald-400',
  },
  action_required: {
    icon: AlertTriangle,
    label: 'Action Required',
    cls: 'bg-amber-500/10 border-amber-500/25',
    iconCls: 'text-amber-400',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    cls: 'bg-surface-900/80 border-white/10',
    iconCls: 'text-surface-400',
  },
  expired: {
    icon: XCircle,
    label: 'Expired',
    cls: 'bg-danger-500/10 border-danger-500/25',
    iconCls: 'text-danger-400',
  },
}

const OVERALL_META: Record<ComplianceItemStatus, { label: string; cls: string }> = {
  compliant: { label: 'Fully Compliant', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  action_required: { label: 'Action Required', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  pending: { label: 'Compliance Pending', cls: 'bg-surface-900 text-surface-300 border-white/10' },
  expired: { label: 'Expired Documents', cls: 'bg-danger-500/15 text-danger-300 border-danger-500/30' },
}

const SOURCE_LABEL: Record<ComplianceItem['source'], string> = {
  vahan_api: 'Vahan API',
  sandbox: 'Vahan Sandbox',
  booking: 'Booking',
  manual: 'Operator',
  document: 'KYC Document',
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface ComplianceChecklistProps {
  checklist: ComplianceChecklist | null
  loading?: boolean
  /** Right-aligned header action, e.g. a re-validate button. */
  headerAction?: React.ReactNode
  /** Retry handler rendered inside a compact banner when the checklist is unavailable. */
  onRetry?: () => void
  /** Optional content rendered below the checklist (e.g. E-Way Bill editor). */
  footer?: React.ReactNode
  className?: string
}

/**
 * Verification & Compliance checklist card.
 * Renders RC (Vahan), Insurance, Fitness, Permit, PUC, FASTag and E-Way Bill
 * lifecycle items for a truck or a booking.
 */
export function ComplianceChecklist({
  checklist,
  loading,
  headerAction,
  onRetry,
  footer,
  className,
}: ComplianceChecklistProps) {
  if (loading && !checklist) {
    return (
      <div className={cn('bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-3', className)}>
        <div className="h-5 w-52 bg-surface-900 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-surface-900/70 border border-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!checklist) {
    if (!onRetry) return null
    return (
      <div className={cn('bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal text-center space-y-3', className)}>
        <p className="text-xs text-surface-400 font-mono">
          Compliance snapshot unavailable right now.
        </p>
        <Button variant="secondary" size="sm" onClick={onRetry} className="text-xs font-semibold border-white/10">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    )
  }

  const overall = OVERALL_META[checklist.overall]
  const compliantCount = checklist.items.filter((i) => i.status === 'compliant').length

  return (
    <div className={cn('bg-panel rounded-[20px] border border-white/10 p-6 sm:p-7 shadow-modal space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <h2 className="text-base font-bold text-white">Compliance Checklist</h2>
          </div>
          <p className="text-xs text-surface-400">
            {checklist.registrationNumber ? (
              <>
                Vehicle <span className="font-mono font-bold text-surface-200">{checklist.registrationNumber}</span> ·{' '}
              </>
            ) : null}
            {compliantCount}/{checklist.items.length} checks passed
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-xs font-mono font-bold px-3 py-1 rounded-full border', overall.cls)}>
            {overall.label}
          </span>
          {headerAction}
        </div>
      </div>

      <ul className="space-y-2.5">
        {checklist.items.map((item) => (
          <ComplianceItemRow key={item.key} item={item} />
        ))}
      </ul>

      <p className="text-[10px] text-surface-500 font-mono pt-1">
        Snapshot taken {formatDate(checklist.checkedAt)} · RC data via Vahan (mParivahan) integration
      </p>

      {footer}
    </div>
  )
}

export function ComplianceItemRow({ item }: { item: ComplianceItem }) {
  const meta = STATUS_META[item.status]
  const StatusIcon = meta.icon
  const ItemIcon = ITEM_ICONS[item.key] || FileText
  const expiry = formatDate(item.expiresAt)

  return (
    <li className={cn('rounded-xl border p-3.5 flex items-start gap-3', meta.cls)}>
      <div className="w-8 h-8 rounded-lg bg-surface-950/70 border border-white/10 flex items-center justify-center shrink-0">
        <ItemIcon className="w-4 h-4 text-surface-300" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-white">{item.label}</span>
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider', meta.iconCls)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
        </div>
        <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{item.detail}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-mono text-surface-500">
          <span className="px-1.5 py-0.5 rounded bg-surface-950 border border-white/5">
            src: {SOURCE_LABEL[item.source] || item.source}
          </span>
          {item.verifiedAt && formatDate(item.verifiedAt) && <span>verified {formatDate(item.verifiedAt)}</span>}
          {expiry && <span>· valid till {expiry}</span>}
        </div>
      </div>
    </li>
  )
}

/** Compact "Validate via Vahan" pill-button used on truck cards. */
export function ValidateRCButton({
  onClick,
  loading,
  validatedAt,
}: {
  onClick: () => void
  loading?: boolean
  validatedAt?: string | null
}) {
  const lastChecked = formatDate(validatedAt)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-surface-200 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className={cn('w-3.5 h-3.5 text-primary-400', loading && 'animate-spin')} />
      <span>{loading ? 'Validating…' : 'Validate RC via Vahan'}</span>
      {lastChecked && !loading && <span className="text-surface-500 font-normal">· {lastChecked}</span>}
    </button>
  )
}

/** FASTag status selector for truck owners. */
export function FastagStatusControl({
  value,
  onChange,
  loading,
}: {
  value: string
  onChange: (status: 'Active' | 'LowBalance' | 'Inactive') => void
  loading?: boolean
}) {
  const options: Array<{ value: 'Active' | 'LowBalance' | 'Inactive'; label: string; activeCls: string }> = [
    { value: 'Active', label: 'Active', activeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { value: 'LowBalance', label: 'Low Balance', activeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { value: 'Inactive', label: 'Inactive', activeCls: 'bg-danger-500/20 text-danger-300 border-danger-500/40' },
  ]

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-950 border border-white/10"
      role="group"
      aria-label="FASTag status"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={loading}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none disabled:opacity-50 cursor-pointer',
            value === opt.value
              ? opt.activeCls
              : 'bg-transparent text-surface-400 border-transparent hover:text-surface-200 hover:bg-white/5'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
