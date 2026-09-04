'use client'

import { api, subscriptionsApi } from '@/lib/api'

export type PaymentProvider = 'cashfree' | 'razorpay' | 'stripe'

export interface SubscriptionEntitlement {
  status: 'trial' | 'active' | 'expired'
  hasSubscription: boolean
  hasPremiumAccess: boolean
  isTrialActive: boolean
  plan: string | null
  expiresAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialDaysRemaining: number
  trialDurationDays: number
  upgradeRequired: boolean
  upgradeReason: string | null
}

export interface InitiateSubscriptionResult {
  provider: PaymentProvider
  paymentId: string
  orderId: string
  amount: number
  plan: string
  checkout: {
    paymentSessionId?: string
    razorpayOrderId?: string
    keyId?: string
    amount?: number
    currency?: string
    sessionId?: string
    checkoutUrl?: string
  }
}

/** Fetch the user's entitlement (trial + subscription) from the backend. */
export async function getEntitlement(): Promise<SubscriptionEntitlement> {
  const res = await subscriptionsApi.getStatus()
  return res.data as SubscriptionEntitlement
}

/**
 * Start a subscription with the gateway chosen by the server
 * (PAYMENT_PROVIDER env) or an explicit override.
 */
export async function initiateSubscription(
  plan: 'monthly' | 'quarterly' | 'annual',
  provider?: PaymentProvider,
): Promise<InitiateSubscriptionResult> {
  const res = await subscriptionsApi.initiate(plan, provider)
  return res.data as InitiateSubscriptionResult
}

/**
 * Open the provider checkout and return the gateway order id to verify,
 * or null when the browser is being redirected (Stripe / Cashfree).
 */
export async function openCheckout(result: InitiateSubscriptionResult): Promise<string | null> {
  const checkout = result.checkout || {}

  switch (result.provider) {
    case 'cashfree': {
      const { load } = await import('@cashfreepayments/cashfree-js')
      const cashfree = await load({ mode: process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox' })
      if (!cashfree || !checkout.paymentSessionId) {
        throw new Error('Unable to load Cashfree checkout gateway')
      }
      await cashfree.checkout({
        paymentSessionId: checkout.paymentSessionId,
        redirectTarget: '_self',
      })
      return null
    }

    case 'razorpay': {
      if (!checkout.razorpayOrderId || !checkout.keyId) {
        throw new Error('Invalid Razorpay checkout payload')
      }
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Unable to load Razorpay checkout')

      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key: checkout.keyId,
          amount: checkout.amount,
          currency: checkout.currency || 'INR',
          name: 'LorryCarry',
          description: 'LorryCarry Premium Subscription',
          order_id: checkout.razorpayOrderId,
          handler: () => resolve(),
          modal: { ondismiss: () => reject(new Error('Payment cancelled by user')) },
          theme: { color: '#F97316' },
        })
        rzp.on('payment.failed', () => reject(new Error('Payment failed. Please try again.')))
        rzp.open()
      })

      // Razorpay flow stays in-page; poll the server-side verification endpoint.
      return checkout.razorpayOrderId
    }

    case 'stripe': {
      if (!checkout.checkoutUrl) throw new Error('Invalid Stripe checkout payload')
      window.location.assign(checkout.checkoutUrl)
      return null
    }

    default:
      throw new Error(`Unsupported payment provider: ${result.provider}`)
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as any).Razorpay) return resolve(true)

    const existing = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/** Verify a gateway order server-side (used after Razorpay in-page checkout). */
export async function verifyOrder(orderId: string) {
  const res = await api.get(`/subscriptions/verify/${orderId}`)
  return res.data
}
