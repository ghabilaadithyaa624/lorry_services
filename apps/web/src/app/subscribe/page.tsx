'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { load } from '@cashfreepayments/cashfree-js'
import { Navbar, Footer } from '@/components/layout'
import { Button, Badge, Card, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatINR } from '@/lib/utils'

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly Access',
    price: 999,
    per: 'month',
    badge: null,
    highlight: false,
    description: 'Essential access for occasional freight requirements',
    features: [
      'Unlimited direct phone & WhatsApp reveals',
      '50km radius proximity search',
      'Direct transporter negotiations',
      'Standard email support',
    ],
  },
  {
    id: 'quarterly',
    label: 'Quarterly Pass',
    price: 2499,
    per: '3 months',
    badge: 'MOST POPULAR',
    highlight: true,
    description: 'Best value for active shippers & frequent transporters',
    features: [
      'Unlimited direct contact reveals',
      'Priority search ranking in 50km radius',
      'Instant WhatsApp notification alerts',
      'Direct deal confirmation & tracking',
      'Save ₹498 compared to monthly plan',
    ],
  },
  {
    id: 'annual',
    label: 'Annual Enterprise',
    price: 7999,
    per: 'year',
    badge: 'MAX SAVINGS',
    highlight: false,
    description: 'For power fleet operators, factories & logistics enterprises',
    features: [
      'Unlimited contact reveals 365 days',
      'Top search placement across all corridors',
      'Dedicated relationship account manager',
      'Bulk load dispatching tools',
      'Save ₹3,989 compared to monthly plan',
    ],
  },
]

function SubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const [selectedPlan, setSelectedPlan] = useState('quarterly')
  const [loading, setLoading] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/search/subscription-status')
      .then((res) => setHasSubscription(res.data.hasSubscription))
      .catch(() => setHasSubscription(false))
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/subscriptions/initiate', {
        plan: selectedPlan,
      })

      const paymentSessionId = res.data?.paymentSessionId
      if (!paymentSessionId) {
        throw new Error('Payment session was not created')
      }

      const cashfree = await load({
        mode: 'sandbox',
      })

      if (!cashfree) {
        throw new Error('Unable to load Cashfree checkout gateway')
      }

      await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self',
      })
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Payment initiation failed. Please try again.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  const activePlan = PLANS.find((p) => p.id === selectedPlan)!

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark text-surface-900 dark:text-surface-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Paywall Alert Banner if redirected from reveal */}
        {reason === 'reveal' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 flex items-start gap-4 animate-fade-in shadow-xs">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
              <LockClosedIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Subscription Required to Reveal Direct Contacts
              </h4>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                Unlock direct phone numbers and WhatsApp access for all truck operators and load posters across India.
              </p>
            </div>
          </div>
        )}

        {/* Already Subscribed Banner */}
        {hasSubscription === true && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Active Subscription Enabled
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/90">
                  You have full unlimited access to transporter contacts and marketplace features.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Go to Workspace
            </Button>
          </div>
        )}

        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="primary" size="md">
            Direct Access Passes
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-white">
            Unlock Full Transporter Access
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400">
            Connect directly with verified truck owners and shippers. Zero commission on your freight bookings.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-xl bg-danger-50 text-danger-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* ── Plans Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative rounded-2xl p-6 sm:p-7 text-left transition-all cursor-pointer flex flex-col justify-between space-y-6',
                  isSelected
                    ? 'border-2 border-primary-500 bg-white dark:bg-surface-900 shadow-elevated ring-4 ring-primary-500/10'
                    : 'border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-primary-300 dark:hover:border-surface-600 shadow-card'
                )}
              >
                {/* Badge Tag */}
                {plan.badge && (
                  <div className="absolute -top-3 left-6">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs',
                        plan.highlight
                          ? 'bg-primary-500 text-white'
                          : 'bg-amber-400 text-amber-950'
                      )}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-surface-900 dark:text-white">
                      {plan.label}
                    </h3>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-surface-900 dark:text-white">
                        {formatINR(plan.price)}
                      </span>
                      <span className="text-xs font-semibold text-surface-400">
                        / {plan.per}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      {plan.description}
                    </p>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 pt-4 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-600 dark:text-surface-300">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    className={cn(
                      'w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center',
                      isSelected
                        ? 'bg-primary-500 text-white shadow-xs'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200'
                    )}
                  >
                    {isSelected ? 'Selected Plan' : 'Choose Plan'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Checkout Action Footer Card ── */}
        <Card padding="lg" className="text-center space-y-4 shadow-card border-surface-200/80 dark:border-surface-700/80">
          <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
            Selected: <strong className="text-surface-900 dark:text-white font-bold">{activePlan.label}</strong> — {formatINR(activePlan.price)} for {activePlan.per}
          </p>

          <Button
            variant="primary"
            size="lg"
            loading={loading}
            disabled={hasSubscription === true}
            onClick={handleSubscribe}
            className="px-10 py-3.5 text-base font-bold mx-auto shadow-elevated"
          >
            💳 Complete Payment — {formatINR(activePlan.price)}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-surface-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
              <span>256-bit Encrypted Cashfree Checkout</span>
            </span>
            <span>⚡ Instant Account Activation</span>
            <span>↩️ Transparent Terms</span>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  )
}
