'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { complianceApi, ComplianceChecklist } from '@/lib/api'
import { ComplianceChecklist as ComplianceChecklistCard } from './ComplianceChecklist'
import { Button } from '@/components/ui'
import { toast } from '@/lib/toast'
import { isAdminRole, isFreightSideRole } from '@/lib/roles'

interface BookingComplianceCardProps {
  bookingId: string
  /** Role of the current viewer — factory owners edit the E-Way Bill. */
  viewerRole?: string
  onChecklistRefresh?: () => void
}

/**
 * Trip-level Verification & Compliance card:
 * RC (Vahan), Insurance, E-Way Bill lifecycle and FASTag readiness, with an
 * inline E-Way Bill editor for the load owner (consignor generates the bill
 * on the GST/NIC portal and attaches the 12-digit number here).
 */
export function BookingComplianceCard({
  bookingId,
  viewerRole,
  onChecklistRefresh,
}: BookingComplianceCardProps) {
  const [checklist, setChecklist] = useState<ComplianceChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingEway, setSavingEway] = useState(false)
  const [ewayInput, setEwayInput] = useState('')
  const [ewayValidUpto, setEwayValidUpto] = useState('')
  const [inputDirty, setInputDirty] = useState(false)

  const currentNumber =
    checklist?.items.find((i) => i.key === 'eway_bill')?.detail.match(/#(\d{12})/)?.[1] || ''

  // Keep the input in sync with the server value until the user starts typing.
  useEffect(() => {
    if (!inputDirty) setEwayInput(currentNumber)
  }, [currentNumber, inputDirty])

  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true)
      const res = await complianceApi.getBookingChecklist(bookingId)
      setChecklist(res.data)
    } catch {
      // Compliance data is additive — fail soft so the booking page stays usable.
      setChecklist(null)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    if (bookingId) loadChecklist()
  }, [bookingId, loadChecklist])

  const handleSaveEwayBill = async (e: React.FormEvent) => {
    e.preventDefault()
    const number = ewayInput.replace(/\D/g, '')
    if (number.length !== 12) {
      toast.error('E-Way Bill number must be exactly 12 digits (GST/NIC portal format)')
      return
    }

    try {
      setSavingEway(true)
      const res = await complianceApi.updateEwayBill(bookingId, number, ewayValidUpto || undefined)
      setChecklist(res.data.checklist)
      setInputDirty(false)
      toast.success('E-Way Bill attached and compliance checklist updated')
      onChecklistRefresh?.()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save the E-Way Bill number')
    } finally {
      setSavingEway(false)
    }
  }

  const canEditEway = isFreightSideRole(viewerRole) || isAdminRole(viewerRole)

  return (
    <ComplianceChecklistCard
      checklist={checklist}
      loading={loading}
      onRetry={loadChecklist}
      footer={
        canEditEway ? (
          <form
            onSubmit={handleSaveEwayBill}
            className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <div className="flex-1 space-y-1">
              <label
                htmlFor="eway-bill-number"
                className="text-[10px] font-mono uppercase tracking-widest text-surface-400 flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5 text-primary-400" />
                E-Way Bill Number (12 digits)
              </label>
              <input
                id="eway-bill-number"
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={ewayInput}
                onChange={(e) => {
                  setEwayInput(e.target.value.replace(/\D/g, ''))
                  setInputDirty(true)
                }}
                placeholder="e.g. 381234567890"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/80 border border-white/10 text-white font-mono text-sm placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="w-full sm:w-44 space-y-1">
              <label
                htmlFor="eway-bill-valid-upto"
                className="text-[10px] font-mono uppercase tracking-widest text-surface-400 block"
              >
                Valid Upto (optional)
              </label>
              <input
                id="eway-bill-valid-upto"
                type="date"
                value={ewayValidUpto}
                onChange={(e) => setEwayValidUpto(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/80 border border-white/10 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent [color-scheme:dark]"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingEway}
              className="shrink-0 text-xs font-bold shadow-glow-primary"
            >
              {currentNumber ? 'Update E-Way Bill' : 'Attach E-Way Bill'}
            </Button>
          </form>
        ) : null
      }
    />
  )
}
