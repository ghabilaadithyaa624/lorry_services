'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { GlassPanel, Badge, Button, Spinner } from '@/components/ui'

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
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 font-sans text-surface-100 selection:bg-primary-500 selection:text-white">
      <GlassPanel padding="lg" className="max-w-md w-full text-center space-y-6">

        {/* Checking State */}
        {state === 'checking' && (
          <div className="space-y-4 font-mono">
            <div className="flex justify-center my-2">
              <Spinner size="lg" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-white font-sans">
                VERIFYING PAYMENT
              </h1>
              <p className="text-xs text-surface-400 font-sans">
                Please wait while we confirm your payment with the payment gateway...
              </p>
            </div>
            <div className="pt-2">
              <Badge variant="info" size="sm" className="font-mono text-xs">
                Attempt {attempts} of 10
              </Badge>
            </div>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="space-y-5 font-mono">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ✅
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-emerald-400 font-sans">
                PAYMENT SUCCESSFUL
              </h1>
              <p className="text-xs text-surface-300 font-sans">
                Your <strong className="capitalize text-white font-mono">{subscription?.plan?.replace(/_/g, ' ') || 'Access Pass'}</strong> is now active.
              </p>
            </div>

            {subscription?.expiresAt && (
              <p className="text-xs text-surface-400">
                Valid until{' '}
                <strong className="text-white">
                  {new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </strong>
              </p>
            )}

            <p className="text-xs text-primary-400 animate-pulse">
              Redirecting to dashboard...
            </p>

            <div className="space-y-2 pt-2">
              <Link href="/dashboard" className="w-full inline-block">
                <Button variant="primary" size="md" fullWidth className="font-bold text-xs shadow-glow-primary">
                  GO TO DASHBOARD
                </Button>
              </Link>
              <Link href="/search" className="w-full inline-block">
                <Button variant="secondary" size="md" fullWidth className="font-bold text-xs border-white/10">
                  🔍 START SEARCHING LOADS
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Pending / Unconfirmed State */}
        {state === 'pending' && (
          <div className="space-y-5 font-mono">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ⏳
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-amber-300 font-sans">
                VERIFICATION PENDING
              </h1>
              <p className="text-xs text-surface-300 font-sans leading-relaxed">
                Your payment may still be processing with your bank or the payment gateway. Your subscription will activate automatically once confirmed.
              </p>
            </div>

            <div className="p-3 bg-surface-950/80 border border-white/10 rounded-2xl text-xs text-left space-y-1">
              <div>Order ID: <strong className="text-white">{orderId}</strong></div>
              {paymentId && <div>Payment Ref: <strong className="text-white">{paymentId}</strong></div>}
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleRetry}
                className="font-bold text-xs shadow-glow-primary"
              >
                🔄 CHECK AGAIN
              </Button>
              <Link href="/subscribe" className="w-full inline-block">
                <Button variant="secondary" size="md" fullWidth className="font-bold text-xs border-white/10">
                  RETURN TO PLANS
                </Button>
              </Link>
              <Link href="/dashboard" className="text-xs text-surface-400 hover:text-white block pt-2 underline">
                Continue to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Failed State */}
        {state === 'failed' && (
          <div className="space-y-5 font-mono">
            <div className="w-16 h-16 bg-danger-500/20 text-danger-400 border border-danger-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ❌
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-danger-400 font-sans">
                PAYMENT NOT COMPLETED
              </h1>
              <p className="text-xs text-surface-300 font-sans leading-relaxed">
                Something went wrong with your payment attempt. No amount was deducted, or the transaction was cancelled.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link href="/subscribe" className="w-full inline-block">
                <Button variant="primary" size="md" fullWidth className="font-bold text-xs shadow-glow-primary">
                  TRY AGAIN
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full inline-block">
                <Button variant="secondary" size="md" fullWidth className="font-bold text-xs border-white/10">
                  GO TO DASHBOARD
                </Button>
              </Link>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  )
}

export default function SubscribeCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
          <Spinner size="lg" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
