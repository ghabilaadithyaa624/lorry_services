'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Button, Card, Input, Select } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface VehicleFormState {
  registrationNumber: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  tonnageCapacity: string
  lengthFt: string
  heightFt: string
  currentLocationAddress: string
  serviceableRadiusKm: string
  preferredDestinations: string
}

const initialState: VehicleFormState = {
  registrationNumber: '',
  bodyType: 'Open',
  tonnageCapacity: '16',
  lengthFt: '24',
  heightFt: '8',
  currentLocationAddress: '',
  serviceableRadiusKm: '50',
  preferredDestinations: '',
}

/** Transporter-side vehicle onboarding form with a verification-first flow. */
export function NeedVehicleForm() {
  const router = useRouter()
  const { t } = useI18n()
  const [form, setForm] = useState<VehicleFormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = <K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await api.post('/trucks', {
        registrationNumber: form.registrationNumber.toUpperCase().trim(),
        bodyType: form.bodyType,
        tonnageCapacity: Number(form.tonnageCapacity),
        lengthFt: Number(form.lengthFt),
        heightFt: Number(form.heightFt),
        currentLocationAddress: form.currentLocationAddress.trim(),
        serviceableRadiusKm: Number(form.serviceableRadiusKm),
        preferredDestinations: form.preferredDestinations
          .split(',')
          .map((destination) => destination.trim())
          .filter(Boolean),
      })
      toast.success(t('needVehicle.success'))
      router.push('/my-trucks')
    } catch (err: any) {
      const message = err.response?.data?.message || t('needVehicle.error')
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-panel bg-slate-950 px-5 py-7 text-white shadow-elevated sm:px-8 sm:py-9">
        <div className="absolute -right-8 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <Link href="/dashboard/truck-owner" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t('needVehicle.backToDashboard')}
          </Link>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              {t('needVehicle.eyebrow')}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{t('needVehicle.stepLabel')}</span>
          </div>
          <h1 className="max-w-xl text-2xl font-bold tracking-tight sm:text-4xl">{t('needVehicle.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t('needVehicle.subtitle')}</p>

          <div className="mt-7 flex max-w-xl items-center gap-2" aria-label={t('needVehicle.progressLabel')}>
            {[t('needVehicle.progressVehicle'), t('needVehicle.progressDetails'), t('needVehicle.progressVerify')].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', index === 0 ? 'bg-emerald-500 text-white' : 'border border-slate-600 bg-slate-800 text-slate-400')}>
                    {index + 1}
                  </span>
                  <span className={cn('hidden truncate text-xs font-semibold sm:block', index === 0 ? 'text-white' : 'text-slate-500')}>{step}</span>
                </div>
                {index < 2 && <span className="h-px min-w-4 flex-1 bg-slate-700" aria-hidden="true" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-card border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-300">
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Truck className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <Card.Title as="h2">{t('needVehicle.vehicleTitle')}</Card.Title>
                  <p className="mt-0.5 text-xs text-muted">{t('needVehicle.vehicleHint')}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{t('needVehicle.secure')}</span>
            </Card.Header>
            <Card.Body className="space-y-4">
              <Input
                label={t('needVehicle.registration')}
                placeholder={t('needVehicle.registrationPlaceholder')}
                value={form.registrationNumber}
                onChange={(event) => update('registrationNumber', event.target.value.toUpperCase())}
                hint={t('needVehicle.registrationHint')}
                required
                autoComplete="off"
                className="font-mono font-semibold tracking-wide"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label={t('needVehicle.bodyType')}
                  value={form.bodyType}
                  onChange={(event) => update('bodyType', event.target.value as VehicleFormState['bodyType'])}
                  required
                >
                  <option value="Open">{t('needVehicle.openBody')}</option>
                  <option value="Container">{t('needVehicle.container')}</option>
                  <option value="OpenBody">{t('needVehicle.trailer')}</option>
                </Select>
                <Input
                  label={t('needVehicle.capacity')}
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={form.tonnageCapacity}
                  onChange={(event) => update('tonnageCapacity', event.target.value)}
                  rightElement={<span className="text-xs font-medium">T</span>}
                  required
                />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400">
                  <Navigation className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <Card.Title as="h2">{t('needVehicle.operationTitle')}</Card.Title>
                  <p className="mt-0.5 text-xs text-muted">{t('needVehicle.operationHint')}</p>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('needVehicle.location')}
                  placeholder={t('needVehicle.locationPlaceholder')}
                  value={form.currentLocationAddress}
                  onChange={(event) => update('currentLocationAddress', event.target.value)}
                  leftElement={<MapPin className="h-4 w-4" />}
                  required
                />
                <Input
                  label={t('needVehicle.radius')}
                  type="number"
                  min="10"
                  max="500"
                  value={form.serviceableRadiusKm}
                  onChange={(event) => update('serviceableRadiusKm', event.target.value)}
                  rightElement={<span className="text-xs font-medium">km</span>}
                  hint={t('needVehicle.radiusHint')}
                  required
                />
                <Input
                  label={t('needVehicle.destinations')}
                  placeholder={t('needVehicle.destinationsPlaceholder')}
                  value={form.preferredDestinations}
                  onChange={(event) => update('preferredDestinations', event.target.value)}
                  hint={t('needVehicle.destinationsHint')}
                  containerClassName="sm:col-span-2"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-hairline pt-4">
                <Input
                  label={t('needVehicle.deckLength')}
                  type="number"
                  min="8"
                  max="60"
                  value={form.lengthFt}
                  onChange={(event) => update('lengthFt', event.target.value)}
                  rightElement={<span className="text-xs font-medium">ft</span>}
                  required
                />
                <Input
                  label={t('needVehicle.deckHeight')}
                  type="number"
                  min="6"
                  max="15"
                  value={form.heightFt}
                  onChange={(event) => update('heightFt', event.target.value)}
                  rightElement={<span className="text-xs font-medium">ft</span>}
                  required
                />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted"><UploadCloud className="h-4 w-4" aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">{t('needVehicle.documentsTitle')}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">{t('needVehicle.documentsHint')}</p>
                </div>
              </div>
              <Link href="/documents" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">{t('needVehicle.uploadLater')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </Card.Body>
          </Card>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t('needVehicle.privacy')}</p>
            <div className="flex w-full gap-3 sm:w-auto">
              <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1 sm:flex-none">{t('common.cancel')}</Button>
              <Button type="submit" size="lg" loading={submitting} rightIcon={<ArrowRight className="h-4 w-4" />} className="flex-1 sm:flex-none">{t('needVehicle.register')}</Button>
            </div>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">{t('needVehicle.previewEyebrow')}</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{t('needVehicle.previewTitle')}</h2>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <div className="mt-5 space-y-3 rounded-xl border border-hairline bg-panel p-3.5">
                <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-600" aria-hidden="true" /><p className="truncate text-sm font-semibold text-ink">{form.registrationNumber || t('needVehicle.previewRegistration')}</p></div>
                <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">{t('needVehicle.previewBody')}</span><span className="font-semibold text-ink">{form.bodyType === 'Container' ? t('needVehicle.containerShort') : t('needVehicle.openShort')}</span></div>
                <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">{t('needVehicle.previewCapacity')}</span><span className="font-semibold text-ink">{form.tonnageCapacity || '—'} T</span></div>
                <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">{t('needVehicle.previewRadius')}</span><span className="font-semibold text-emerald-700 dark:text-emerald-400">{form.serviceableRadiusKm || '—'} km</span></div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-body"><Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t('needVehicle.matchNote')}</div>
                <div className="flex items-center gap-2 text-xs text-body"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t('needVehicle.verificationNote')}</div>
              </div>
            </Card.Body>
          </Card>
          <div className="rounded-card border border-hairline bg-sunken/60 p-4 text-xs leading-5 text-muted">
            <p className="font-semibold text-ink">{t('needVehicle.tipTitle')}</p>
            <p className="mt-1">{t('needVehicle.tipBody')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default NeedVehicleForm
