'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { complianceApi, ComplianceChecklist } from '@/lib/api'
import { ComplianceChecklist as ComplianceChecklistCard, FastagStatusControl, ValidateRCButton } from './ComplianceChecklist'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface TruckCompliancePanelProps {
  truck: {
    id: string
    registrationNumber?: string | null
    vahanValidatedAt?: string | null
    fastagStatus?: string | null
  }
  onChanged?: () => void
}

/**
 * Per-truck Verification & Compliance panel for the fleet page:
 * - live Vahan RC re-validation
 * - FASTag status reporting (Active / Low Balance / Inactive)
 * - full compliance checklist (RC, insurance, fitness, permit, PUC, FASTag)
 */
export function TruckCompliancePanel({ truck, onChanged }: TruckCompliancePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [checklist, setChecklist] = useState<ComplianceChecklist | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [savingFastag, setSavingFastag] = useState(false)

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true)
      const res = await complianceApi.getTruckChecklist(truck.id)
      setChecklist(res.data)
    } catch {
      setChecklist(null)
    } finally {
      setLoading(false)
    }
  }, [truck.id])

  // Lazy-load the checklist the first time the section is expanded.
  useEffect(() => {
    if (expanded && !checklist && !loading) {
      fetchChecklist()
    }
  }, [expanded, checklist, loading, fetchChecklist])

  const handleValidateRC = async () => {
    try {
      setValidating(true)
      const res = await complianceApi.validateTruckRc(truck.id)
      setChecklist(res.data.checklist)
      if (res.data.validation.valid) {
        toast.success(
          `RC ${res.data.validation.registrationNumber} verified via Vahan (${
            res.data.validation.source === 'sandbox' ? 'sandbox' : 'live registry'
          })`
        )
      } else {
        toast.error(res.data.validation.error || 'Vahan could not verify this RC')
      }
      onChanged?.()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Vahan validation failed')
    } finally {
      setValidating(false)
    }
  }

  const handleFastagChange = async (status: 'Active' | 'LowBalance' | 'Inactive') => {
    try {
      setSavingFastag(true)
      const res = await complianceApi.updateFastag(truck.id, status)
      setChecklist(res.data.checklist)
      toast.success(`FASTag marked ${status === 'LowBalance' ? 'low on balance' : status.toLowerCase()}`)
      onChanged?.()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update FASTag status')
    } finally {
      setSavingFastag(false)
    }
  }

  const fastagValue = truck.fastagStatus || 'Unknown'

  return (
    <div className="rounded-2xl bg-surface-950/60 border border-white/10 p-4 space-y-3">
      {/* Summary row: always visible */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-surface-200">
          <ShieldCheck className="w-4 h-4 text-primary-400 shrink-0" />
          <span className="uppercase tracking-widest font-mono text-[10px] text-surface-400">
            Compliance
          </span>
          {checklist && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                checklist.overall === 'compliant'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : checklist.overall === 'expired'
                  ? 'bg-danger-500/15 text-danger-300 border-danger-500/30'
                  : checklist.overall === 'action_required'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-surface-900 text-surface-300 border-white/10'
              )}
            >
              {checklist.overall.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ValidateRCButton
            onClick={handleValidateRC}
            loading={validating}
            validatedAt={truck.vahanValidatedAt}
          />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-900/60 hover:bg-surface-800 border border-white/10 text-surface-300 text-xs font-semibold transition-colors cursor-pointer"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Hide checklist' : 'View checklist'}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Expanded: FASTag control + full checklist */}
      {expanded && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-surface-300">FASTag status</span>
            <FastagStatusControl
              value={fastagValue}
              onChange={handleFastagChange}
              loading={savingFastag}
            />
          </div>

          <ComplianceChecklistCard checklist={checklist} loading={loading} onRetry={fetchChecklist} />
        </div>
      )}
    </div>
  )
}
