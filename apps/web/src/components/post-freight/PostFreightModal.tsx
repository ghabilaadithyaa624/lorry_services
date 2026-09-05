'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  IndianRupee,
  MapPin,
  Route,
  Truck,
  UploadCloud,
  Weight,
} from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { LanguageToggle } from '@/components/layout'
import { useI18n } from '@/lib/i18n'
import { api, trucksApi } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { normalizeRole } from '@/lib/roles'

/**
 * PostFreightModal — role-aware quick-post dialog for the global
 * “Post Freight” CTA.
 *
 * Behaviour:
 * - Factory / load owners get the “Need Vehicle” form (pincode, tonnage,
 *   budget, advance) which publishes a real load via POST /loads.
 * - Truck owners get the “Need Load” form (capacity, route, per-km rate,
 *   RC upload) which registers the vehicle via POST /trucks and forwards
 *   the RC for Vahan verification.
 * - Anonymous operators are guided to sign in as the chosen role; they
 *   return to the same quick-post flow after OTP.
 *
 * A தமிழ் / हिन्दी / English toggle sits inside the modal and drives every
 * label through the shared i18n catalogue.
 */

export type PostFreightRole = 'factory_owner' | 'truck_driver'

type View = 'role' | PostFreightRole | 'success'

interface PostFreightModalProps {
  open: boolean
  onClose: () => void
  /** Signed-in user (from localStorage 'user'). Null when anonymous. */
  user: { role?: string } | null
}

const MAX_RC_BYTES = 10 * 1024 * 1024
const ACCEPTED_RC = ['application/pdf', 'image/jpeg', 'image/png']

/** Split "Chennai → Coimbatore" (or comma/arrow separated) into route legs. */
export function parseRoute(route: string): { origin: string; destinations: string[] } {
  const legs = route
    .split(/→|->|—|-|,|to\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    origin: legs[0] || '',
    destinations: legs.slice(1),
  }
}

const fieldClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-sunken/60 border border-hairline text-sm text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow'

export function PostFreightModal({ open, onClose, user }: PostFreightModalProps) {
  const router = useRouter()
  const { t } = useI18n()

  const isAuthenticated = Boolean(user)
  const userRole: PostFreightRole | null =
    (() => {
      const canonical = normalizeRole(user?.role)
      // Transporters can post BOTH loads and trucks, so — like anonymous
      // operators — they start on the role chooser instead of being locked
      // into a single side. Admins never post.
      return canonical === 'factory_owner' || canonical === 'truck_driver'
        ? canonical
        : null
    })()

  // Signed-in operators land directly on their role's form; anonymous
  // operators first choose who they are posting as.
  const [view, setView] = useState<View>('role')
  const [submitting, setSubmitting] = useState(false)
  const [successRole, setSuccessRole] = useState<PostFreightRole | null>(null)

  // ── Need Vehicle (factory owner) form state ──
  const [pin, setPin] = useState('')
  const [destinationPin, setDestinationPin] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [budget, setBudget] = useState('')
  const [advance, setAdvance] = useState('')
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({})

  // ── Need Load (truck owner) form state ──
  const [capacity, setCapacity] = useState('')
  const [routeText, setRouteText] = useState('')
  const [perKmRate, setPerKmRate] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [rcFile, setRcFile] = useState<File | null>(null)
  const [truckErrors, setTruckErrors] = useState<Record<string, string>>({})

  // Reset the dialog whenever it is (re)opened.
  useEffect(() => {
    if (open) {
      setView(userRole ?? 'role')
      setSubmitting(false)
      setSuccessRole(null)
      setLoadErrors({})
      setTruckErrors({})
    }
  }, [open, userRole])

  // Lock background scroll while the dialog is open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const goToSignIn = (role: PostFreightRole) => {
    onClose()
    router.push(`/login?role=${role}&redirect=/`)
  }

  const chooseRole = (role: PostFreightRole) => {
    if (!isAuthenticated) {
      goToSignIn(role)
      return
    }
    setView(role)
  }

  // ── Submissions ────────────────────────────────────────────────────────

  const submitNeedVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    const pinDigits = pin.trim()
    const destDigits = destinationPin.trim()
    const tonnageNum = Number(tonnage)
    const budgetNum = budget ? Number(budget) : undefined
    const advanceNum = advance ? Number(advance) : undefined

    if (!/^\d{6}$/.test(pinDigits)) errors.pin = t('pf.field.pincode')
    if (!/^\d{6}$/.test(destDigits)) errors.destinationPin = t('pf.field.destinationPincode')
    if (!tonnage || Number.isNaN(tonnageNum) || tonnageNum < 0.5 || tonnageNum > 100) {
      errors.tonnage = t('pf.field.tonnage')
    }
    if (budget && (Number.isNaN(budgetNum) || (budgetNum as number) < 1000)) {
      errors.budget = t('pf.field.budget')
    }
    if (advance && (Number.isNaN(advanceNum) || (advanceNum as number) < 0)) {
      errors.advance = t('pf.field.advance')
    }
    setLoadErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      // Pincodes are geocoded server-side; the address string carries a
      // human-readable locator until the full corridor is enriched.
      await api.post('/loads', {
        tonnageRequired: tonnageNum,
        loadingAddress: `Pincode ${pinDigits}`,
        loadingPin: pinDigits,
        unloadingAddress: `Pincode ${destDigits}`,
        unloadingPin: destDigits,
        truckType: 'Open',
        maxPrice: budgetNum,
        advancePayable: advanceNum,
      })
      toast.success(t('pf.success.load.title'))
      setSuccessRole('factory_owner')
      setView('success')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('pf.error.load')
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitNeedLoad = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    const capacityNum = Number(capacity)
    const rateNum = Number(perKmRate)
    const { origin, destinations } = parseRoute(routeText)
    const reg = regNumber.trim().toUpperCase()

    if (!capacity || Number.isNaN(capacityNum) || capacityNum < 0.5 || capacityNum > 100) {
      errors.capacity = t('pf.field.capacity')
    }
    if (!origin) errors.route = t('pf.field.route')
    if (!perKmRate || Number.isNaN(rateNum) || rateNum <= 0) errors.perKmRate = t('pf.field.perKmRate')
    if (!/^[A-Z]{2}[0-9A-Z]{4,10}$/.test(reg.replace(/\s+/g, ''))) errors.reg = t('pf.field.regNumber')
    if (rcFile && (!ACCEPTED_RC.includes(rcFile.type) || rcFile.size > MAX_RC_BYTES)) {
      errors.rc = t('pf.file.sizeError')
    }
    setTruckErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const created = await api.post('/trucks', {
        registrationNumber: reg.replace(/\s+/g, ''),
        bodyType: 'Open',
        lengthFt: 24,
        heightFt: 8,
        tonnageCapacity: capacityNum,
        currentLocationAddress: origin,
        serviceableRadiusKm: 50,
        preferredDestinations: destinations,
        // Quoted alongside the listing during matching; stripped by the
        // API whitelist until a dedicated column ships.
        ratePerKm: rateNum,
      })

      if (rcFile && created?.data?.id) {
        try {
          await trucksApi.uploadDocument(created.data.id, 'RC', rcFile, reg)
        } catch {
          toast.warning(t('pf.field.rcUpload.hint'))
        }
      }

      toast.success(t('pf.success.truck.title'))
      setSuccessRole('truck_driver')
      setView('success')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('pf.error.truck')
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const modalTitle =
    view === 'success'
      ? successRole === 'truck_driver'
        ? t('pf.success.truck.title')
        : t('pf.success.load.title')
      : t('pf.title')

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="md">
      {/* In-modal language toggle — தமிழ் / हिन्दी / English */}
      <div className="absolute top-4 right-12">
        <LanguageToggle compact />
      </div>

      {/* ── ROLE PICKER ── */}
      {view === 'role' && (
        <div className="space-y-4" data-testid="pf-role-picker">
          <p className="text-sm text-muted">{t('pf.step.role')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => chooseRole('factory_owner')}
              aria-label={t('pf.role.factoryOwner')}
              className={cn(
                'group text-left p-4 rounded-2xl border border-hairline bg-sunken/50 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[120px] flex flex-col gap-2'
              )}
            >
              <span className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-ink">{t('pf.role.factoryOwner')}</span>
              <span className="text-xs text-muted leading-relaxed">{t('pf.factory.tagline')}</span>
            </button>

            <button
              type="button"
              onClick={() => chooseRole('truck_driver')}
              aria-label={t('pf.role.truckOwner')}
              className={cn(
                'group text-left p-4 rounded-2xl border border-hairline bg-sunken/50 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[120px] flex flex-col gap-2'
              )}
            >
              <span className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Truck className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-ink">{t('pf.role.truckOwner')}</span>
              <span className="text-xs text-muted leading-relaxed">{t('pf.truck.tagline')}</span>
            </button>
          </div>

          {!isAuthenticated && (
            <div className="rounded-xl bg-sunken/70 border border-hairline p-3.5 text-xs text-muted leading-relaxed">
              <p className="font-semibold text-body mb-1">{t('pf.auth.title')}</p>
              <p>{t('pf.auth.body')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── NEED VEHICLE (FACTORY OWNER) ── */}
      {view === 'factory_owner' && (
        <form onSubmit={submitNeedVehicle} className="space-y-4" data-testid="pf-need-vehicle">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
            <Building2 className="w-4 h-4" aria-hidden="true" />
            {t('pf.form.needVehicle')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pf-pin" className="block text-xs font-semibold text-body mb-1.5">
                {t('pf.field.pincode')}
                <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="pf-pin"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder={t('pf.field.pincode.placeholder')}
                aria-invalid={Boolean(loadErrors.pin)}
                className={fieldClass}
                dir="ltr"
              />
            </div>
            <div>
              <label htmlFor="pf-dest-pin" className="block text-xs font-semibold text-body mb-1.5">
                {t('pf.field.destinationPincode')}
                <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="pf-dest-pin"
                inputMode="numeric"
                maxLength={6}
                value={destinationPin}
                onChange={(e) => setDestinationPin(e.target.value.replace(/\D/g, ''))}
                placeholder={t('pf.field.pincode.placeholder')}
                aria-invalid={Boolean(loadErrors.destinationPin)}
                aria-describedby="pf-dest-pin-hint"
                className={fieldClass}
                dir="ltr"
              />
              <p id="pf-dest-pin-hint" className="text-[11px] text-subtle mt-1">
                {t('pf.field.destinationPincode.hint')}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="pf-tonnage" className="block text-xs font-semibold text-body mb-1.5">
              {t('pf.field.tonnage')}
              <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
              <input
                id="pf-tonnage"
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={tonnage}
                onChange={(e) => setTonnage(e.target.value)}
                placeholder={t('pf.field.tonnage.placeholder')}
                aria-invalid={Boolean(loadErrors.tonnage)}
                className={cn(fieldClass, 'pl-10')}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pf-budget" className="block text-xs font-semibold text-body mb-1.5">
                {t('pf.field.budget')}
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
                <input
                  id="pf-budget"
                  type="number"
                  min="1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={t('pf.field.budget.placeholder')}
                  aria-invalid={Boolean(loadErrors.budget)}
                  className={cn(fieldClass, 'pl-10')}
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pf-advance" className="block text-xs font-semibold text-body mb-1.5">
                {t('pf.field.advance')}
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
                <input
                  id="pf-advance"
                  type="number"
                  min="0"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                  placeholder={t('pf.field.advance.placeholder')}
                  aria-invalid={Boolean(loadErrors.advance)}
                  aria-describedby="pf-advance-hint"
                  className={cn(fieldClass, 'pl-10')}
                  dir="ltr"
                />
              </div>
              <p id="pf-advance-hint" className="text-[11px] text-subtle mt-1">
                {t('pf.field.advance.hint')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            {!userRole ? (
              <Button variant="ghost" size="sm" onClick={() => setView('role')} type="button"
                leftIcon={<ArrowLeft className="w-4 h-4" />}>
                {t('pf.back')}
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting}
              leftIcon={submitting ? undefined : <ArrowRight className="w-4 h-4" />}
              className="bg-gradient-to-r from-primary-500 to-primary-600 shadow-glow-primary"
            >
              {submitting ? t('pf.submitting') : t('pf.submit.needVehicle')}
            </Button>
          </div>
        </form>
      )}

      {/* ── NEED LOAD (TRUCK OWNER) ── */}
      {view === 'truck_driver' && (
        <form onSubmit={submitNeedLoad} className="space-y-4" data-testid="pf-need-load">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <Truck className="w-4 h-4" aria-hidden="true" />
            {t('pf.form.needLoad')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pf-capacity" className="block text-xs font-semibold text-body mb-1.5">
                {t('pf.field.capacity')}
                <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
                <input
                  id="pf-capacity"
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder={t('pf.field.capacity.placeholder')}
                  aria-invalid={Boolean(truckErrors.capacity)}
                  className={cn(fieldClass, 'pl-10')}
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pf-rate" className="block text-xs font-semibold text-body mb-1.5">
                {t('pf.field.perKmRate')}
                <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
                <input
                  id="pf-rate"
                  type="number"
                  min="1"
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(e.target.value)}
                  placeholder={t('pf.field.perKmRate.placeholder')}
                  aria-invalid={Boolean(truckErrors.perKmRate)}
                  className={cn(fieldClass, 'pl-10')}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="pf-route" className="block text-xs font-semibold text-body mb-1.5">
              {t('pf.field.route')}
              <span className="text-danger-600 dark:text-danger-400 ml-0.5" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Route className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
              <input
                id="pf-route"
                type="text"
                value={routeText}
                onChange={(e) => setRouteText(e.target.value)}
                placeholder={t('pf.field.route.placeholder')}
                aria-invalid={Boolean(truckErrors.route)}
                aria-describedby="pf-route-hint"
                className={cn(fieldClass, 'pl-10')}
                dir="ltr"
              />
            </div>
            <p id="pf-route-hint" className="text-[11px] text-subtle mt-1">
              {t('pf.field.route.hint')}
            </p>
          </div>

          {/* RC upload — registration number + document */}
          <div className="rounded-xl border border-hairline bg-sunken/40 p-3.5 space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-body">
                <FileText className="w-4 h-4 text-subtle" aria-hidden="true" />
                {t('pf.field.rcUpload')}
              </div>
              <p className="text-[11px] text-subtle mt-1">{t('pf.rc.recommended')}</p>
            </div>
            <div>
              <label htmlFor="pf-reg" className="block text-[11px] font-medium text-muted mb-1">
                {t('pf.field.regNumber')}
              </label>
              <input
                id="pf-reg"
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                placeholder="TN 01 AB 1234"
                aria-invalid={Boolean(truckErrors.reg)}
                className={cn(fieldClass, 'font-mono')}
                dir="ltr"
              />
            </div>
            <label
              htmlFor="pf-rc-file"
              className={cn(
                'flex items-center justify-center gap-2 w-full px-3.5 py-3 rounded-xl border border-dashed cursor-pointer transition-colors',
                truckErrors.rc
                  ? 'border-danger-500/60 bg-danger-500/5'
                  : 'border-hairline-strong hover:border-primary-500/60 hover:bg-primary-500/5',
                'focus-within:ring-2 focus-within:ring-primary-500'
              )}
            >
              <UploadCloud className="w-4 h-4 text-subtle" aria-hidden="true" />
              <span className="text-xs font-medium text-body">
                {rcFile ? rcFile.name : t('pf.file.choose')}
              </span>
              {rcFile && (
                <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">
                  {t('pf.file.replace')}
                </span>
              )}
              <input
                id="pf-rc-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => setRcFile(e.target.files?.[0] ?? null)}
                aria-describedby="pf-rc-hint"
              />
            </label>
            <p id="pf-rc-hint" className="text-[11px] text-subtle">
              {truckErrors.rc || t('pf.field.rcUpload.hint')}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            {!userRole ? (
              <Button variant="ghost" size="sm" onClick={() => setView('role')} type="button"
                leftIcon={<ArrowLeft className="w-4 h-4" />}>
                {t('pf.back')}
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting}
              leftIcon={submitting ? undefined : <ArrowRight className="w-4 h-4" />}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25 shadow-lg"
            >
              {submitting ? t('pf.submitting') : t('pf.submit.needLoad')}
            </Button>
          </div>
        </form>
      )}

      {/* ── SUCCESS ── */}
      {view === 'success' && (
        <div className="space-y-5 text-center py-2" data-testid="pf-success">
          <div className="flex justify-center">
            <span className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-ink">
              {successRole === 'truck_driver' ? t('pf.success.truck.title') : t('pf.success.load.title')}
            </p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">
              {successRole === 'truck_driver' ? t('pf.success.truck.body') : t('pf.success.load.body')}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => {
                onClose()
                router.push(successRole === 'truck_driver' ? '/my-trucks' : '/my-loads')
              }}
              leftIcon={<MapPin className="w-4 h-4" />}
            >
              {successRole === 'truck_driver' ? t('pf.success.viewTrucks') : t('pf.success.viewLoads')}
            </Button>
            <Button variant="secondary" size="md" fullWidth onClick={onClose}>
              {t('pf.done')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default PostFreightModal
