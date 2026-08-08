'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

type State = 'checking' | 'success' | 'pending' | 'failed'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id')

  const [state, setState] = useState<State>('checking')
  const [subscription, setSubscription] = useState<{
    plan: string | null
    expiresAt: string | null
  } | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!orderId) {
      setState('failed')
      return
    }
    pollStatus()
  }, [orderId])

  const pollStatus = async () => {
    // Poll up to 10 times (30s total) waiting for webhook to activate subscription
    for (let i = 0; i < 10; i++) {
      try {
        const res = await api.get('/subscriptions/status')
        setAttempts(i + 1)

        if (res.data.hasSubscription) {
          setSubscription(res.data)
          setState('success')
          return
        }
      } catch {
        // continue polling
      }
      await new Promise(r => setTimeout(r, 3000))
    }
    // After 30s, if no subscription activated, show pending
    setState('pending')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full card p-8 text-center">

        {/* Checking */}
        {state === 'checking' && (
          <>
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-bold mb-2">Verifying Payment</h1>
            <p className="text-gray-500 text-sm mb-2">
              Please wait while we confirm your payment with Cashfree...
            </p>
            <p className="text-xs text-gray-400">Attempt {attempts + 1} of 10</p>
          </>
        )}

        {/* Success */}
        {state === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              Subscription Activated!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              Your <strong className="capitalize">{subscription?.plan}</strong> plan is now active.
            </p>
            {subscription?.expiresAt && (
              <p className="text-xs text-gray-400 mb-6">
                Valid until{' '}
                <strong>
                  {new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </strong>
              </p>
            )}
            <div className="space-y-3">
              <Link href="/search" className="btn-primary block w-full py-3">
                🔍 Start Searching
              </Link>
              <Link href="/dashboard" className="btn-secondary block w-full py-2.5">
                Go to Dashboard
              </Link>
            </div>
          </>
        )}

        {/* Pending (webhook delayed) */}
        {state === 'pending' && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="text-xl font-bold mb-2">Payment Processing</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Your payment is being processed. This can take a few minutes.
              Your subscription will activate automatically once confirmed.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-card p-3 text-xs text-amber-700 dark:text-amber-400 mb-6">
              Order ID: <strong>{orderId}</strong>
              <br />Keep this for reference if you need to contact support.
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setState('checking'); setAttempts(0); pollStatus() }}
                className="btn-primary block w-full py-3"
              >
                🔄 Check Again
              </button>
              <Link href="/subscribe" className="btn-secondary block w-full py-2.5">
                Back to Plans
              </Link>
            </div>
          </>
        )}

        {/* Failed */}
        {state === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Something went wrong with your payment. No amount has been deducted.
            </p>
            <div className="space-y-3">
              <Link href="/subscribe" className="btn-primary block w-full py-3">
                Try Again
              </Link>
              <Link href="/search" className="btn-secondary block w-full py-2.5">
                Browse Without Subscription
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SubscribeCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
