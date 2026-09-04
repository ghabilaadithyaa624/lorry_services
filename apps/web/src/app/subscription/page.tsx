'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { usersApi, api } from '@/lib/api'
import { Navbar, Footer } from '@/components/layout'
import { TrialAccessBanner, type TrialStatus } from '@/components/dashboard/TrialAccessBanner'
import { Button, Badge, GlassPanel, StatusDot, Skeleton } from '@/components/ui'
import { TrialCountdownBanner } from '@/components/subscription/TrialCountdownBanner'
import { toast } from '@/lib/toast'
import { formatINR } from '@/lib/utils'
import {
  checkoutLoginUrl,
  getEntitlement,
  hasClientSession,
  initiateSubscription,
  openCheckout,
  SubscriptionEntitlement,
} from '@/lib/subscription'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [subStatus, setSubStatus] = useState<any>(null)
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    /**
     * Public plans page: anonymous visitors see pricing only. Private
     * subscription/profile data is fetched exclusively for a logged-in session.
     */
    if (!hasClientSession()) {
      setIsAuthenticated(false)
      setFetching(false)
      return
    }
    setIsAuthenticated(true)

    const fetchStatus = async () => {
      try {
        setFetching(true)
        const [entRes, profileRes] = await Promise.allSettled([
          getEntitlement(),
          usersApi.getProfile(),
        ])
        const ent = entRes.status === 'fulfilled' ? entRes.value : null
        setEntitlement(ent)
        setSubStatus({
          hasSubscription: ent?.hasSubscription || false,
          profileSub: profileRes.status === 'fulfilled' ? profileRes.value.data?.subscription : null,
        })
        const statusRes = await api.get<TrialStatus>('/subscriptions/status')
        setSubStatus(statusRes.data)
      } catch {
        setError('Failed to fetch subscription details')
      } finally {
        setFetching(false)
      }
    }
    fetchStatus()
  }, [])

  const handleSubscribe = async () => {
    // Checkout is protected: send anonymous visitors to login and back here.
    if (!hasClientSession()) {
      window.location.href = checkoutLoginUrl('/subscription')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await initiateSubscription('monthly')
      const gatewayOrderId = await openCheckout(result)
      if (gatewayOrderId) {
        window.location.href = `/subscribe/callback?provider=razorpay&order_id=${encodeURIComponent(gatewayOrderId)}`
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to initiate subscription payment.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  const isSubscribed = subStatus?.hasSubscription === true
  const isTrial = subStatus?.isTrial === true

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col justify-between font-sans selection:bg-primary-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Trial countdown + expired upgrade CTA */}
        {isAuthenticated === true && entitlement && !entitlement.hasSubscription && (
          <TrialCountdownBanner entitlement={entitlement} />
        )}

        {/* Header Title */}
        <div className="text-center space-y-3 font-mono">
          <Badge variant="primary" size="md" className="text-xs">
            DIRECT MARKETPLACE ACCESS PASS
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-sans">
            Transporter Pass & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-surface-400 max-w-xl mx-auto">
            Direct freight intelligence without broker friction. Connect directly with verified truck drivers and shippers across national corridors.
          </p>
        </div>

        {/* Public plan facts — readable without a session */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassPanel padding="md" className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white font-sans">90-Day Free Trial</h3>
            <p className="text-xs text-surface-400 leading-relaxed font-sans">
              New accounts get a 90-day free trial with full access before any payment is required.
            </p>
          </GlassPanel>
          <GlassPanel padding="md" className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white font-sans">Unlocks Direct Contact</h3>
            <p className="text-xs text-surface-400 leading-relaxed font-sans">
              A pass reveals verified operators&apos; direct phone and WhatsApp details for
              shipper-to-transporter negotiation.
            </p>
          </GlassPanel>
          <GlassPanel padding="md" className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white font-sans">No Broker Commission</h3>
            <p className="text-xs text-surface-400 leading-relaxed font-sans">
              A flat access pass only — no per-trip broker commission and no cut of your freight value.
            </p>
          </GlassPanel>
        </div>

        {/* Current Active Status Card */}
        {isAuthenticated === false ? null : fetching ? (
          <Skeleton.Card />
        ) : isTrial ? (
          <TrialAccessBanner status={subStatus} />
        ) : isSubscribed ? (
          <GlassPanel padding="lg" className="border-emerald-500/30 bg-emerald-950/30 font-mono">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusDot variant="active" pulse />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      ACTIVE DIRECT CONTACT PASS
                    </h3>
                    <Badge variant="success" size="sm">
                      ACTIVE
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-300/80 font-sans mt-0.5">
                    Plan: <strong className="text-white uppercase">{subStatus?.plan || 'PRO ACCESS'}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right text-xs font-mono">
                <span className="text-surface-400 block">Status: Active</span>
                <span className="text-emerald-400 font-bold">Unlimited Phone & WhatsApp Reveal</span>
              </div>
            </div>
          </GlassPanel>
        ) : null}

        {error && (
          <div className="p-4 rounded-2xl bg-danger-950/40 border border-danger-900/60 text-xs font-mono font-medium text-danger-300 text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-4">
          
          {/* Free Starter */}
          <GlassPanel padding="lg" className="flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white font-sans">Free Starter</h3>
                <p className="text-xs font-mono text-surface-400 mt-1">For casual browsing and corridor previews</p>
              </div>

              <div className="flex items-baseline font-mono">
                <span className="text-4xl font-extrabold text-white">₹0</span>
                <span className="text-xs text-surface-400 ml-2">/ forever</span>
              </div>

              <ul className="space-y-3 text-xs font-mono text-surface-300">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Browse load & truck listings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>View route summaries & tonnage</span>
                </li>
                <li className="flex items-center space-x-2 text-surface-500 line-through">
                  <span>Contact details hidden</span>
                </li>
                <li className="flex items-center space-x-2 text-surface-500 line-through">
                  <span>Cannot create direct bookings</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 font-mono">
              <button disabled className="w-full py-3 rounded-xl bg-surface-950 text-surface-500 text-xs font-mono font-bold cursor-default border border-white/5">
                {isAuthenticated === false
                  ? 'FREE TO BROWSE'
                  : isTrial
                    ? 'TRIAL ACTIVE'
                    : isSubscribed
                      ? 'BASIC LEVEL'
                      : 'CURRENT LEVEL'}
              </button>
            </div>
          </GlassPanel>

          {/* Pro Unlimited */}
          <GlassPanel padding="lg" className="border-2 border-primary-500 shadow-glow-primary relative flex flex-col justify-between space-y-6">
            <div className="absolute -top-3.5 right-6 bg-primary-500 text-white text-[10px] font-mono font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-glow-primary">
              MOST POPULAR
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white font-sans">Pro Unlimited</h3>
                <p className="text-xs font-mono text-surface-400 mt-1">For active factory owners & fleet operators</p>
              </div>

              <div className="flex items-baseline font-mono">
                <span className="text-4xl font-black text-white">{formatINR(999)}</span>
                <span className="text-xs text-surface-400 ml-2">/ month</span>
              </div>

              <ul className="space-y-3 text-xs font-mono text-surface-300">
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white font-sans">Unlimited phone contact reveals</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white font-sans">Direct WhatsApp integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white font-sans">Create unlimited direct bookings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-sans">5-stage trip tracking & notifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-sans">256-bit Encrypted Cashfree checkout</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 font-mono">
              <Button
                onClick={handleSubscribe}
                loading={loading}
                disabled={isAuthenticated === true && isSubscribed && !isTrial}
                variant="primary"
                size="lg"
                fullWidth
                className="py-3.5 text-sm font-bold shadow-glow-primary"
              >
                {loading
                  ? 'Initializing Payment Gateway...'
                  : isAuthenticated !== true
                    ? `Log in to subscribe — ${formatINR(999)}`
                    : isSubscribed && !isTrial
                      ? 'PASS ACTIVE'
                      : isTrial
                        ? `Upgrade from trial — ${formatINR(999)}`
                        : `Subscribe Now — ${formatINR(999)}`}
              </Button>
            </div>
          </GlassPanel>

        </div>

        {/* Security & Cashfree Gateway Banner */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-mono text-surface-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            <span>256-bit Encrypted Cashfree Payment Gateway</span>
          </span>
          <span>⚡ Instant Pass Activation</span>
        </div>
      </main>

      <Footer />
    </div>
  )
}
