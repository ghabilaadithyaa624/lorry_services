'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  CircleHelp,
  IndianRupee,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Button, Card, Input, Select } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface LoadFormState {
  loadingAddress: string
  loadingPin: string
  unloadingAddress: string
  unloadingPin: string
  tonnageRequired: string
  truckType: 'Open' | 'Container' | 'OpenBody'
  expectedDeliveryAt: string
  maxPrice: string
  urgent: boolean
}

const initialState: LoadFormState = {
  loadingAddress: '',
  loadingPin: '',
  unloadingAddress: '',
  unloadingPin: '',
  tonnageRequired: '',
  truckType: 'Open',
  expectedDeliveryAt: '',
  maxPrice: '',
  urgent: false,
}

/**
 * Shipper-side load request form. The form intentionally keeps the first step
 * focused on the information a transporter needs to quote quickly.
 */
export function NeedLoadForm() {
  const router = useRouter()
  const { t } = useI18n()
  const [form, setForm] = useState<LoadFormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = <K extends keyof LoadFormState>(key: K, value: LoadFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const routeLabel = useMemo(() => {
    if (form.loadingAddress && form.unloadingAddress) {
      return `${form.loadingAddress} → ${form.unloadingAddress}`
    }
    return t('needLoad.routePlaceholder')
  }, [form.loadingAddress, form.unloadingAddress, t])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await api.post('/loads', {
        loadingAddress: form.loadingAddress.trim(),
        loadingPin: form.loadingPin.trim(),
        unloadingAddress: form.unloadingAddress.trim(),
        unloadingPin: form.unloadingPin.trim(),
        tonnageRequired: Number(form.tonnageRequired),
        truckType: form.truckType,
        expectedDeliveryAt: form.expectedDeliveryAt || undefined,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
        urgent: form.urgent,
      })
      toast.success(t('needLoad.success'))
      router.push('/my-loads?success=true')
    } catch (err: any) {
      const message = err.response?.data?.message || t('needLoad.error')
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-panel bg-slate-950 px-5 py-7 text-white shadow-elevated sm:px-8 sm:py-9">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <Link
            href="/dashboard/load-owner"
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t('needLoad.backToDashboard')}
          </Link>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-400/30 bg-primary-400/10 px-2.5 py-1">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              {t('needLoad.eyebrow')}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{t('needLoad.stepLabel')}</span>
          </div>
          <h1 className="max-w-xl text-2xl font-bold tracking-tight sm:text-4xl">{t('needLoad.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t('needLoad.subtitle')}</p>

          <div className="mt-7 flex max-w-xl items-center gap-2" aria-label={t('needLoad.progressLabel')}>
            {[t('needLoad.progressRoute'), t('needLoad.progressCargo'), t('needLoad.progressPublish')].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', index === 0 ? 'bg-primary-500 text-white' : 'border border-slate-600 bg-slate-800 text-slate-400')}>
                    {index === 0 ? '1' : index + 1}
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
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <Card.Title as="h2">{t('needLoad.routeTitle')}</Card.Title>
                  <p className="mt-0.5 text-xs text-muted">{t('needLoad.routeHint')}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{t('needLoad.verifiedRoute')}</span>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_145px]">
                <Input
                  label={t('needLoad.pickup')}
                  placeholder={t('needLoad.pickupPlaceholder')}
                  value={form.loadingAddress}
                  onChange={(event) => update('loadingAddress', event.target.value)}
                  leftElement={<MapPin className="h-4 w-4" />}
                  required
                  autoComplete="street-address"
                />
                <Input
                  label={t('needLoad.pickupPin')}
                  placeholder="411018"
                  value={form.loadingPin}
                  onChange={(event) => update('loadingPin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <div className="relative ml-5 h-3 border-l border-dashed border-primary-500/50" aria-hidden="true"><span className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary-500" /></div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_145px]">
                <Input
                  label={t('needLoad.destination')}
                  placeholder={t('needLoad.destinationPlaceholder')}
                  value={form.unloadingAddress}
                  onChange={(event) => update('unloadingAddress', event.target.value)}
                  leftElement={<MapPin className="h-4 w-4" />}
                  required
                  autoComplete="street-address"
                />
                <Input
                  label={t('needLoad.destinationPin')}
                  placeholder="560100"
                  value={form.unloadingPin}
                  onChange={(event) => update('unloadingPin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Package className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <Card.Title as="h2">{t('needLoad.cargoTitle')}</Card.Title>
                  <p className="mt-0.5 text-xs text-muted">{t('needLoad.cargoHint')}</p>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('needLoad.weight')}
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  placeholder="15"
                  value={form.tonnageRequired}
                  onChange={(event) => update('tonnageRequired', event.target.value)}
                  rightElement={<span className="text-xs font-medium">T</span>}
                  required
                />
                <Select
                  label={t('needLoad.vehicleType')}
                  value={form.truckType}
                  onChange={(event) => update('truckType', event.target.value as LoadFormState['truckType'])}
                  required
                >
                  <option value="Open">{t('needLoad.openBody')}</option>
                  <option value="Container">{t('needLoad.container')}</option>
                  <option value="OpenBody">{t('needLoad.trailer')}</option>
                </Select>
                <Input
                  label={t('needLoad.readyDate')}
                  type="datetime-local"
                  value={form.expectedDeliveryAt}
                  onChange={(event) => update('expectedDeliveryAt', event.target.value)}
                  leftElement={<CalendarDays className="h-4 w-4" />}
                  containerClassName="sm:col-span-2"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <Input
                  label={t('needLoad.budget')}
                  type="number"
                  min="1000"
                  placeholder="45,000"
                  value={form.maxPrice}
                  onChange={(event) => update('maxPrice', event.target.value)}
                  leftElement={<IndianRupee className="h-4 w-4" />}
                  hint={t('needLoad.budgetHint')}
                />
                <div className="flex items-end">
                  <label className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-input border border-hairline-strong bg-panel px-3.5 py-2.5 transition-colors hover:border-primary-500/50 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-500/5">
                    <input type="checkbox" checked={form.urgent} onChange={(event) => update('urgent', event.target.checked)} className="h-4 w-4 rounded border-hairline accent-primary-500" />
                    <span className="text-sm font-semibold text-ink">{t('needLoad.urgent')}</span>
                  </label>
                </div>
              </div>
            </Card.Body>
          </Card>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t('needLoad.privacy')}</p>
            <div className="flex w-full gap-3 sm:w-auto">
              <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1 sm:flex-none">{t('common.cancel')}</Button>
              <Button type="submit" size="lg" loading={submitting} rightIcon={<ArrowRight className="h-4 w-4" />} className="flex-1 sm:flex-none">{t('needLoad.publish')}</Button>
            </div>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="border-primary-500/20 bg-primary-500/[0.03]">
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-400">{t('needLoad.previewEyebrow')}</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{t('needLoad.previewTitle')}</h2>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow-primary"><Truck className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <div className="mt-5 rounded-xl border border-hairline bg-panel p-3.5">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary-500 ring-4 ring-primary-500/10" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t('needLoad.previewRoute')}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-ink">{routeLabel}</p>
                  </div>
                </div>
                <div className="my-3 border-t border-dashed border-hairline" />
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[11px] text-muted">{t('needLoad.previewCargo')}</p><p className="mt-1 text-sm font-bold text-ink">{form.tonnageRequired || '—'} T</p></div>
                  <div><p className="text-[11px] text-muted">{t('needLoad.previewVehicle')}</p><p className="mt-1 text-sm font-bold text-ink">{form.truckType === 'Container' ? t('needLoad.containerShort') : t('needLoad.openShort')}</p></div>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-body"><Sparkles className="h-4 w-4 text-primary-500" aria-hidden="true" />{t('needLoad.matchNote')}</div>
                <div className="flex items-center gap-2 text-xs text-body"><Zap className="h-4 w-4 text-amber-500" aria-hidden="true" />{t('needLoad.alertNote')}</div>
                <div className="flex items-center gap-2 text-xs text-body"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t('needLoad.verifiedNote')}</div>
              </div>
            </Card.Body>
          </Card>
          <div className="rounded-card border border-hairline bg-sunken/60 p-4 text-xs leading-5 text-muted">
            <p className="font-semibold text-ink">{t('needLoad.tipTitle')}</p>
            <p className="mt-1">{t('needLoad.tipBody')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default NeedLoadForm
