'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 999,
    per: 'month',
    badge: null,
    highlight: false,
    description: 'Ideal for occasional use',
    features: ['Unlimited contact reveals', 'Priority search listing', 'Basic support'],
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    price: 2499,
    per: '3 months',
    badge: 'POPULAR',
    highlight: true,
    description: 'Best value for regular users',
    features: ['Unlimited contact reveals', 'Priority search listing', 'Email & WhatsApp support', 'Save ₹498 vs monthly'],
  },
  {
    id: 'annual',
    label: 'Annual',
    price: 7999,
    per: 'year',
    badge: 'BEST VALUE',
    highlight: false,
    description: 'For power users & fleet operators',
    features: ['Unlimited contact reveals', 'Top search listing', 'Dedicated support', 'Save ₹3,989 vs monthly'],
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
    api.get('/search/subscription-status')
      .then(res => setHasSubscription(res.data.hasSubscription))
      .catch(() => setHasSubscription(false))
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/subscriptions/initiate', { plan: selectedPlan })
      // Redirect to Cashfree payment page
      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl
      } else {
        setError('Payment initiation failed. Please try again.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS.find(p => p.id === selectedPlan)!

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">

        {/* Paywall banner */}
        {reason === 'reveal' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-card p-4 mb-8 flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Subscription Required</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Revealing contact details requires an active subscription. Choose a plan below to get instant access.
              </p>
            </div>
          </div>
        )}

        {/* Already subscribed */}
        {hasSubscription === true && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-card p-4 mb-8 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">You have an active subscription</p>
              <p className="text-sm text-green-700 dark:text-green-400">
                You can reveal contacts freely.{' '}
                <button onClick={() => router.back()} className="underline font-medium">Go back</button>
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Unlock Full Access</h1>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Reveal truck owner &amp; load poster contact details. Connect directly — no middlemen, no commissions.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`relative rounded-card p-6 text-left transition-all border-2 ${
                selectedPlan === p.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
              }`}
            >
              {p.badge && (
                <span className={`absolute -top-3 left-4 text-xs font-bold px-3 py-1 rounded-full ${
                  p.badge === 'POPULAR'
                    ? 'bg-primary-500 text-white'
                    : 'bg-amber-400 text-amber-900'
                }`}>
                  {p.badge}
                </span>
              )}

              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-lg">{p.label}</span>
                {selectedPlan === p.id && (
                  <span className="text-primary-500 text-xl">✓</span>
                )}
              </div>

              <div className="mb-1">
                <span className="text-3xl font-bold">₹{p.price.toLocaleString()}</span>
                <span className="text-gray-500 text-sm ml-1">/ {p.per}</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">{p.description}</p>

              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Selected: <strong>{plan.label}</strong> — ₹{plan.price.toLocaleString()} / {plan.per}
          </p>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading || hasSubscription === true}
            className="btn-primary text-lg px-10 py-3 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirecting to payment...
              </>
            ) : (
              <>💳 Subscribe Now — ₹{plan.price.toLocaleString()}</>
            )}
          </button>

          <div className="flex items-center justify-center gap-6 mt-5 text-xs text-gray-400">
            <span>🔒 Secure payment via Cashfree</span>
            <span>📱 Instant activation</span>
            <span>↩️ Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  )
}
