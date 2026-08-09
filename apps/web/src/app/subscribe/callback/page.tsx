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
  const paymentId = searchParams.get('payment_id')

  const [state, setState] = useState<State>('checking')
  const [subscription, setSubscription] = useState<{
    plan: string | null
    expiresAt: string | null
  } | null>(null)
  const [attempts, setAttempts] = useState(1)

  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    if (!orderId) {
      setState('failed')
      return
    }

    let isMounted = true

    const pollStatus = async () => {
      setState('checking')

      for (let attempt = 1; attempt <= 10; attempt++) {
        if (!isMounted) return
        setAttempts(attempt)

        try {
          const res = await api.get(`/subscriptions/callback/${orderId}`)
          console.log(`Payment verification (attempt ${attempt}/10):`, res.data)

          if (res.data?.status === 'SUCCESS' || res.data?.hasSubscription === true) {
            if (!isMounted) return
            setSubscription({
              plan: res.data.plan,
              expiresAt: res.data.expiresAt,
            })
            setState('success')

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              if (isMounted) {
                router.push('/dashboard')
              }
            }, 2000)
            return
          }

          if (res.data?.status === 'FAILED') {
            if (!isMounted) return
            setState('failed')
            return
          }
        } catch (err) {
          console.error(`Verification attempt ${attempt} error:`, err)
        }

        if (attempt < 10 && isMounted) {
          await new Promise(r => setTimeout(r, 2500))
        }
      }

      if (isMounted) {
        setState('pending')
      }
    }

    pollStatus()

    return () => {
      isMounted = false
    }
  }, [orderId, router, pollCount])

  const handleRetry = () => {
    if (!orderId) return
    setAttempts(1)
    setPollCount(prev => prev + 1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full card p-8 text-center">

        {/* Checking */}
        {state === 'checking' && (
          <>
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-bold mb-2">Verifying Payment</h1>
            <p className="text-gray-500 text-sm mb-3">
              Please wait while we confirm your payment with Cashfree...
            </p>
            <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full font-medium">
              Attempt {attempts} of 10
            </span>
          </>
        )}

        {/* Success */}
        {state === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              Your <strong className="capitalize">{subscription?.plan?.replace(/_/g, ' ')}</strong> subscription is now active.
            </p>
            {subscription?.expiresAt && (
              <p className="text-xs text-gray-400 mb-4">
                Valid until{' '}
                <strong>
                  {new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </strong>
              </p>
            )}
            <p className="text-xs text-primary-600 dark:text-primary-400 mb-6 animate-pulse">
              Redirecting to dashboard...
            </p>
            <div className="space-y-3">
              <Link href="/dashboard" className="btn-primary block w-full py-3">
                Go to Dashboard
              </Link>
              <Link href="/search" className="btn-secondary block w-full py-2.5">
                🔍 Start Searching Loads
              </Link>
            </div>
          </>
        )}

        {/* Pending / Unconfirmed */}
        {state === 'pending' && (
          <>
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="text-xl font-bold mb-2">We couldn&apos;t confirm your payment yet</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Your payment may still be processing with your bank or Cashfree. Your subscription will activate automatically once confirmed.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-card p-3 text-xs text-amber-700 dark:text-amber-400 mb-6 text-left break-all">
              <div>Order ID: <strong>{orderId}</strong></div>
              {paymentId && <div>Payment Ref: <strong>{paymentId}</strong></div>}
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="btn-primary block w-full py-3"
              >
                🔄 Check Again
              </button>
              <Link href="/subscribe" className="btn-secondary block w-full py-2.5">
                Back to Plans
              </Link>
              <Link href="/dashboard" className="text-xs text-gray-400 hover:underline block pt-2">
                Continue to Dashboard
              </Link>
            </div>
          </>
        )}

        {/* Failed */}
        {state === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Payment Failed</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Something went wrong with your payment. No amount was deducted, or the transaction was cancelled.
            </p>
            <div className="space-y-3">
              <Link href="/subscribe" className="btn-primary block w-full py-3">
                Try Again
              </Link>
              <Link href="/dashboard" className="btn-secondary block w-full py-2.5">
                Go to Dashboard
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
