'use client'

import React, { useMemo, useState } from 'react'
import { Modal, Button, Input, Select } from '@/components/ui'
import { loadsApi } from '@/lib/api'
import { toast } from '@/lib/toast'

/**
 * EditLoadModal — owner-only editor for an open freight load.
 *
 * Mirrors `PATCH /loads/:id` (server enforces `load.userId === currentUser.id`
 * or admin). Only changed fields are submitted so untouched route data is not
 * re-geocoded unnecessarily. The server rejects edits once a load leaves the
 * Open status; the modal is only mounted for open, owned loads.
 */
export const TRUCK_TYPE_OPTIONS = ['Open', 'Container', 'OpenBody'] as const

export interface EditableLoad {
  id: string
  userId?: string
  status: string
  loadingAddress: string
  loadingPin?: string | null
  unloadingAddress: string
  unloadingPin?: string | null
  tonnageRequired: number | string
  truckType: string
  urgent?: boolean
  maxPrice?: number | string | null
  minLengthFt?: number | string | null
  minHeightFt?: number | string | null
  expectedDeliveryAt?: string | Date | null
}

interface EditLoadModalProps {
  load: EditableLoad
  onClose: () => void
  onSaved: () => void | Promise<void>
}

const PIN_PATTERN = /^\d{4,10}$/

function toDatetimeLocal(value?: string | Date | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface EditLoadFormState {
  loadingAddress: string
  loadingPin: string
  unloadingAddress: string
  unloadingPin: string
  tonnage: string
  truckType: string
  maxPrice: string
  urgent: boolean
  expectedDelivery: string
}

/**
 * Diff the form against the stored load — only genuinely changed fields are
 * submitted, so an untouched route is never re-geocoded unnecessarily.
 */
export function collectChangedFields(
  load: EditableLoad,
  form: EditLoadFormState
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  if (form.loadingAddress.trim() !== (load.loadingAddress ?? '')) {
    fields.loadingAddress = form.loadingAddress.trim()
  }
  if (form.loadingPin.trim() !== String(load.loadingPin ?? '')) {
    fields.loadingPin = form.loadingPin.trim()
  }
  if (form.unloadingAddress.trim() !== (load.unloadingAddress ?? '')) {
    fields.unloadingAddress = form.unloadingAddress.trim()
  }
  if (form.unloadingPin.trim() !== String(load.unloadingPin ?? '')) {
    fields.unloadingPin = form.unloadingPin.trim()
  }

  const tonnageNum = parseFloat(form.tonnage)
  if (!Number.isNaN(tonnageNum) && tonnageNum !== Number(load.tonnageRequired)) {
    fields.tonnageRequired = tonnageNum
  }
  if (form.truckType !== load.truckType) {
    fields.truckType = form.truckType
  }
  if (form.urgent !== Boolean(load.urgent)) {
    fields.urgent = form.urgent
  }
  if (form.maxPrice.trim() !== '') {
    const maxPriceNum = parseFloat(form.maxPrice)
    if (!Number.isNaN(maxPriceNum) && maxPriceNum !== Number(load.maxPrice)) {
      fields.maxPrice = maxPriceNum
    }
  }

  if (form.expectedDelivery) {
    const nextIso = new Date(form.expectedDelivery).toISOString()
    const currentIso = load.expectedDeliveryAt ? new Date(load.expectedDeliveryAt).toISOString() : ''
    if (nextIso !== currentIso) {
      fields.expectedDeliveryAt = nextIso
    }
  }

  return fields
}

export function EditLoadModal({ load, onClose, onSaved }: EditLoadModalProps) {
  const [loadingAddress, setLoadingAddress] = useState(load.loadingAddress ?? '')
  const [loadingPin, setLoadingPin] = useState(String(load.loadingPin ?? ''))
  const [unloadingAddress, setUnloadingAddress] = useState(load.unloadingAddress ?? '')
  const [unloadingPin, setUnloadingPin] = useState(String(load.unloadingPin ?? ''))
  const [tonnage, setTonnage] = useState(String(load.tonnageRequired ?? ''))
  const [truckType, setTruckType] = useState(
    (TRUCK_TYPE_OPTIONS as readonly string[]).includes(load.truckType) ? load.truckType : 'Open'
  )
  const [maxPrice, setMaxPrice] = useState(load.maxPrice != null ? String(load.maxPrice) : '')
  const [urgent, setUrgent] = useState(Boolean(load.urgent))
  const [expectedDelivery, setExpectedDelivery] = useState(toDatetimeLocal(load.expectedDeliveryAt))
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')

  const changedFields = useMemo(
    () =>
      collectChangedFields(load, {
        loadingAddress,
        loadingPin,
        unloadingAddress,
        unloadingPin,
        tonnage,
        truckType,
        maxPrice,
        urgent,
        expectedDelivery,
      }),
    [load, loadingAddress, loadingPin, unloadingAddress, unloadingPin, tonnage, truckType, urgent, maxPrice, expectedDelivery]
  )

  const validate = (): string => {
    const tonnageNum = parseFloat(tonnage)
    if (Number.isNaN(tonnageNum) || tonnageNum < 0.5 || tonnageNum > 100) {
      return 'Tonnage must be between 0.5 and 100 tonnes.'
    }
    if (!loadingAddress.trim() || !unloadingAddress.trim()) {
      return 'Loading and unloading addresses are required.'
    }
    for (const pin of [loadingPin.trim(), unloadingPin.trim()]) {
      if (pin && !PIN_PATTERN.test(pin)) {
        return 'PIN codes must be numeric.'
      }
    }
    if (maxPrice.trim()) {
      const maxPriceNum = parseFloat(maxPrice)
      if (Number.isNaN(maxPriceNum) || maxPriceNum < 1000) {
        return 'Target budget must be at least ₹1,000.'
      }
    }
    return ''
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = validate()
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError('')

    const fields = changedFields
    if (Object.keys(fields).length === 0) {
      toast.info('No changes to save')
      onClose()
      return
    }

    setSaving(true)
    try {
      await loadsApi.updateLoad(load.id, fields as Parameters<typeof loadsApi.updateLoad>[1])
      toast.success('Load updated')
      await onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update load')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit load" size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-xs text-subtle">
          <span className="font-mono font-semibold text-ink">
            LOAD-{load.id.slice(0, 8).toUpperCase()}
          </span>{' '}
          — changes are saved live and re-broadcast to nearby lorries.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Loading address"
            required
            value={loadingAddress}
            onChange={(e) => setLoadingAddress(e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Input
            label="Loading PIN"
            value={loadingPin}
            onChange={(e) => setLoadingPin(e.target.value)}
            inputMode="numeric"
          />
          <Input
            label="Unloading address"
            required
            value={unloadingAddress}
            onChange={(e) => setUnloadingAddress(e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Input
            label="Unloading PIN"
            value={unloadingPin}
            onChange={(e) => setUnloadingPin(e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Tonnage (T)"
            required
            type="number"
            step="0.5"
            min="0.5"
            max="100"
            value={tonnage}
            onChange={(e) => setTonnage(e.target.value)}
          />
          <Select label="Truck type" value={truckType} onChange={(e) => setTruckType(e.target.value)}>
            {TRUCK_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Input
            label="Target budget (₹)"
            type="number"
            min="1000"
            step="500"
            placeholder="Open budget"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Input
            label="Expected delivery"
            type="datetime-local"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
          />
          <label className="flex items-center gap-2.5 pb-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <span className="text-xs font-semibold text-body">Mark as urgent</span>
          </label>
        </div>

        {validationError && (
          <p role="alert" className="text-xs font-semibold text-danger-600 dark:text-danger-400">
            {validationError}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default EditLoadModal
