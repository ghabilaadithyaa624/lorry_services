'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { api, usersApi } from '@/lib/api'
import { load } from '@cashfreepayments/cashfree-js'
import { Navbar, Footer } from '@/components/layout'
import { Button, Badge, GlassPanel, StatusDot, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatINR } from '@/lib/utils'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [subStatus, setSubStatus] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setFetching(true)
        const [searchRes, profileRes] = await Promise.all([
          api.get('/search/subscription-status').catch(() => ({ data: { hasSubscription: false } })),
          usersApi.getProfile().catch(() => ({ data: null })),
        ])
        setSubStatus({
          hasSubscription: searchRes.data?.hasSubscription || false,
          profileSub: profileRes.data?.subscription || null,
        })
      } catch {
        setError('Failed to fetch subscription details')
      } finally {
        setFetching(false)
      }
    }
    fetchStatus()
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/subscriptions/initiate', {
        plan: 'monthly',
      })

      const { paymentSessionId } = res.data
      if (!paymentSessionId) {
        throw new Error('Payment session was not created')
      }

      const cashfree = await load({ mode: 'sandbox' })
      if (!cashfree) {
        throw new Error('Unable to load Cashfree checkout gateway')
      }

      await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self',
      })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to initiate subscription payment.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  const isSubscribed = subStatus?.hasSubscription === true || subStatus?.profileSub?.isActive === true

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col justify-between font-sans selection:bg-primary-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        
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

        {/* Current Active Status Card */}
        {fetching ? (
          <Skeleton.Card />
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
                    Plan: <strong className="text-white uppercase">{subStatus?.profileSub?.plan || 'PRO ACCESS'}</strong>
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
                {isSubscribed ? 'BASIC LEVEL' : 'CURRENT LEVEL'}
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
                disabled={isSubscribed}
                variant="primary"
                size="lg"
                fullWidth
                className="py-3.5 text-sm font-bold shadow-glow-primary"
              >
                {loading ? 'Initializing Payment Gateway...' : isSubscribed ? 'PASS ACTIVE' : `Subscribe Now — ${formatINR(999)}`}
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
