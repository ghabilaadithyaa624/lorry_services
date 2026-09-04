'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Navbar, Footer } from '@/components/layout'
import { TrialAccessBanner, type TrialStatus } from '@/components/dashboard/TrialAccessBanner'
import { Button, Badge, GlassPanel, Spinner } from '@/components/ui'
import { TrialCountdownBanner } from '@/components/subscription/TrialCountdownBanner'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { cn, formatINR } from '@/lib/utils'
import {
  checkoutLoginUrl,
  getEntitlement,
  hasClientSession,
  initiateSubscription,
  openCheckout,
  SubscriptionEntitlement,
} from '@/lib/subscription'

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly Access Pass',
    price: 999,
    per: 'month',
    badge: null,
    highlight: false,
    description: 'Essential direct contact access for occasional freight requirements',
    features: [
      'Unlimited direct phone & WhatsApp reveals',
      '50km radius PostGIS proximity search',
      'Direct transporter negotiations',
      'Standard customer support',
    ],
  },
  {
    id: 'quarterly',
    label: 'Quarterly Pass',
    price: 2499,
    per: '3 months',
    badge: 'MOST POPULAR',
    highlight: true,
    description: 'Best value for active shippers & frequent fleet operators',
    features: [
      'Unlimited direct contact reveals 90 days',
      'Priority search ranking in 50km radius',
      'Instant WhatsApp notification alerts',
      '5-stage transit checkpoint tracking',
      'Save ₹498 compared to monthly plan',
    ],
  },
  {
    id: 'annual',
    label: 'Annual Enterprise Pass',
    price: 7999,
    per: 'year',
    badge: 'MAX SAVINGS',
    highlight: false,
    description: 'For power fleet operators, factories & logistics enterprises',
    features: [
      'Unlimited contact reveals 365 days',
      'Top search placement across all corridors',
      'Dedicated relationship account manager',
      'Bulk load dispatching & return AI tools',
      'Save ₹3,989 compared to monthly plan',
    ],
  },
]

function SubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const planParam = searchParams.get('plan')

  const [selectedPlan, setSelectedPlan] = useState(
    PLANS.some((p) => p.id === planParam) ? (planParam as string) : 'quarterly'
  )
  // `null` until the browser has been probed, so SSR and the first paint match.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<TrialStatus | null>(null)
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    /**
     * `/subscribe` is a public pricing page. An anonymous visitor must be able
     * to read plans without any authenticated request firing, so we probe the
     * local session first and only ask the API for entitlement data when a
     * session exists. This also keeps private subscription status off the
     * public view.
     */
    const authed = hasClientSession()
    setIsAuthenticated(authed)
    if (!authed) {
      setHasSubscription(false)
      return
    }

    getEntitlement()
      .then((ent) => {
        setEntitlement(ent)
        setSubscriptionStatus({
          hasSubscription: ent.hasSubscription,
          plan: ent.plan,
          isTrial: ent.status === 'trial',
          trialDaysTotal: ent.trialDurationDays,
          trialDaysLeft: ent.trialDaysRemaining,
          expiresAt: ent.expiresAt || ent.trialEndsAt,
        })
        setHasSubscription(ent.hasSubscription)
      })
      .catch(() => {
        api
          .get<TrialStatus>('/subscriptions/status')
          .then((res) => {
            setSubscriptionStatus(res.data)
            setHasSubscription(res.data.hasSubscription)
          })
          .catch(() => setHasSubscription(false))
      })
  }, [])

  const isTrial = subscriptionStatus?.isTrial === true
  const hasPaidSubscription = hasSubscription === true && !isTrial

  const handleSubscribe = async () => {
    /**
     * Checkout stays protected. Anonymous visitors are sent to login with a
     * redirect back to this pricing page, where they can complete payment.
     * (The backend `/subscriptions/initiate` endpoint is authenticated too —
     * this is the UX half of the gate, not the enforcement.)
     */
    if (!hasClientSession()) {
      router.push(checkoutLoginUrl(`/subscribe?plan=${selectedPlan}`))
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await initiateSubscription(selectedPlan as 'monthly' | 'quarterly' | 'annual')
      const gatewayOrderId = await openCheckout(result)

      // Razorpay's in-page checkout resolves after payment: verify server-side.
      if (gatewayOrderId) {
        router.push(`/subscribe/callback?provider=razorpay&order_id=${encodeURIComponent(gatewayOrderId)}`)
      }
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
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-8">
        
        {/* Trial countdown + expired upgrade CTA */}
        {entitlement && !entitlement.hasSubscription && (
          <TrialCountdownBanner entitlement={entitlement} />
        )}

        {/* Paywall Alert Banner if redirected from contact reveal */}
        {reason === 'reveal' && (
          <GlassPanel padding="lg" className="border-amber-500/30 bg-amber-950/40 font-sans">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
                <LockClosedIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[15px] font-semibold text-amber-200 font-sans">
                  Subscription Required to Reveal Direct Transporter Contacts
                </h4>
                <p className="text-xs text-amber-300/80 leading-relaxed font-sans">
                  Unlock direct phone numbers and WhatsApp access for all truck operators and load posters across India with zero broker cuts.
                </p>
              </div>
            </div>
          </GlassPanel>
        )}

        {/* The trial stays actionable; a paid pass simply confirms access. */}
        {isTrial && <TrialAccessBanner status={subscriptionStatus} />}
        {hasPaidSubscription && (
          <GlassPanel padding="lg" className="border-emerald-500/30 bg-emerald-950/40 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-emerald-200 font-sans">
                    Active Direct Transporter Pass Enabled
                  </h4>
                  <p className="text-xs text-emerald-300/80 font-sans">
                    You have full unlimited access to transporter contacts and marketplace features.
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push('/dashboard')}
                className="font-bold text-xs border-white/10 hover:border-white/20 shrink-0"
              >
                GO TO COCKPIT
              </Button>
            </div>
          </GlassPanel>
        )}

        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3 font-sans">
          <Badge variant="primary" size="md" className="text-xs">
            LORRYCARRY ACCESS PASSES
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-sans">
            Direct Freight Intelligence Passes
          </h1>
          <p className="text-xs sm:text-sm text-surface-400 max-w-lg mx-auto">
            Direct freight intelligence without broker friction. Connect directly with verified truck drivers and shippers.
          </p>
        </div>

        {/* What a pass includes — public, factual copy (visible without login) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassPanel padding="md" className="space-y-2">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-emerald-400 shrink-0" />
              <h3 className="text-sm font-semibold text-white font-sans">90-Day Free Trial</h3>
            </div>
            <p className="text-xs text-surface-400 leading-relaxed font-sans">
              New accounts start on a 90-day free trial with full marketplace access. No payment is
              taken until the trial ends — you can compare passes here before you commit.
            </p>
          </GlassPanel>

          <GlassPanel padding="md" className="space-y-2">
            <div className="flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-primary-400 shrink-0" />
              <h3 className="text-sm font-semibold text-white font-sans">Unlocks Direct Contact</h3>
            </div>
            <p className="text-xs text-surface-400 leading-relaxed font-sans">
              A subscription reveals the direct phone number and WhatsApp contact of verified truck
              operators and load posters, so you negotiate with the counterparty yourself.
            </p>
          </GlassPanel>

          <GlassPanel padding="md" className="space-y-2">
            <div className="flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-sm font-semibold text-white font-sans">No Broker Commission</h3>
            </div>
            <p className="text-xs text-surface-400 leading-relaxed font-sans">
              LorryCarry charges a flat access pass only. There is no per-trip broker commission and
              no cut of your freight value — payment settles directly between shipper and transporter.
            </p>
          </GlassPanel>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-danger-950/40 border border-danger-900/60 text-danger-300 text-xs font-sans font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative rounded-[20px] p-7 text-left transition-all cursor-pointer flex flex-col justify-between space-y-6 shadow-modal',
                  isSelected
                    ? 'border-2 border-primary-500 bg-surface-900 shadow-glow-primary'
                    : 'border border-white/10 bg-surface-900/70 hover:border-white/20'
                )}
              >
                {/* Badge Tag */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-6">
                    <span
                      className={cn(
                        'px-3.5 py-1 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.06em] shadow-glow-primary',
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
                    <h3 className="text-lg font-bold text-white font-sans">
                      {plan.label}
                    </h3>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shadow-glow-primary">
                        ✓
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {formatINR(plan.price)}
                      </span>
                      <span className="text-xs font-bold text-surface-400">
                        / {plan.per}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400 mt-1 font-sans">
                      {plan.description}
                    </p>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-surface-300 font-sans">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 font-mono">
                  <button
                    type="button"
                    className={cn(
                      'w-full py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer',
                      isSelected
                        ? 'bg-primary-500 text-white shadow-glow-primary'
                        : 'bg-surface-950 border border-white/10 text-surface-300 hover:text-white'
                    )}
                  >
                    {isSelected ? 'SELECTED PASS' : 'CHOOSE PASS'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Checkout Action Footer Card */}
        <GlassPanel padding="lg" className="text-center space-y-4">
          <p className="text-xs sm:text-sm text-surface-300 font-mono">
            Selected: <strong className="text-white font-bold">{activePlan.label}</strong> — {formatINR(activePlan.price)} for {activePlan.per}
          </p>

          <Button
            variant="primary"
            size="lg"
            loading={loading}
            disabled={isAuthenticated === true && hasPaidSubscription}
            onClick={handleSubscribe}
            className="px-10 py-4 text-base font-bold mx-auto shadow-glow-primary font-mono"
          >
            {loading
              ? 'Initializing payment gateway...'
              : isAuthenticated !== true
                ? `LOG IN TO SUBSCRIBE — ${formatINR(activePlan.price)}`
                : hasPaidSubscription
                  ? 'YOUR PASS IS ACTIVE'
                  : isTrial
                    ? `UPGRADE TO ${activePlan.label.toUpperCase()} — ${formatINR(activePlan.price)}`
                    : `COMPLETE PAYMENT — ${formatINR(activePlan.price)}`}
          </Button>

          {isAuthenticated === false && (
            <p className="text-xs text-surface-400 font-sans">
              You are browsing public pricing. Log in to start checkout — we will bring you straight
              back to this page to complete payment.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-mono text-surface-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
              <span>256-bit Encrypted Cashfree • Razorpay • Stripe Gateways</span>
            </span>
            <span>⚡ Instant Pass Activation</span>
            <span>↩️ Transparent Direct Terms</span>
          </div>
        </GlassPanel>
      </main>

      <Footer />
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  )
}
