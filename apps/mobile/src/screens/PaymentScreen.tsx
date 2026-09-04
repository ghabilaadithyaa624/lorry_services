import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { isVehicleSideRole } from '../lib/roles'
import { WEB_APP_URL } from '../lib/env'
import {
  PLAN_DISPLAY,
  PLAN_ORDER,
  formatDate,
  formatDateTime,
  formatInr,
  getPlanLabel,
  getProviderLabel,
  type PlanDisplay,
} from '../lib/plans'
import { useSubscription } from '../hooks/useSubscription'
import { getApiError, getApiErrorMessage, paymentsApi, subscriptionsApi } from '../services/api'
import type {
  InitiateSubscriptionResult,
  PaymentRecord,
  SubscriptionVerifyResult,
} from '../services/types'

type Tab = 'pass' | 'upgrade' | 'history'

/**
 * Checkout lifecycle. Every transition is driven by a server response —
 * nothing here marks a payment as paid on its own.
 *
 *  idle → initiating → awaiting_payment → verifying → succeeded
 *                                                  ↘ pending (still unconfirmed after polling)
 *                                                  ↘ failed
 *  any → failed (initiate/verify errors)
 */
type CheckoutPhase = 'idle' | 'initiating' | 'awaiting_payment' | 'verifying' | 'succeeded' | 'pending' | 'failed'

interface CheckoutState {
  phase: CheckoutPhase
  plan: PlanDisplay | null
  order: InitiateSubscriptionResult | null
  /** How the user was sent to pay (drives the copy in the modal). */
  handoff: 'gateway_url' | 'web_app' | null
  /** Entitlement when checkout began — a web hand-off only counts as paid once this changes. */
  baseline: { plan: string | null; expiresAt: string | null } | null
  /** Epoch ms when checkout began; used to spot a new successful payment in history. */
  startedAt: number
  verification: SubscriptionVerifyResult | null
  errorMessage: string | null
}

const INITIAL_CHECKOUT: CheckoutState = {
  phase: 'idle',
  plan: null,
  order: null,
  handoff: null,
  baseline: null,
  startedAt: 0,
  verification: null,
  errorMessage: null,
}

const VERIFY_POLL_ATTEMPTS = 10
const VERIFY_POLL_INTERVAL_MS = 2500
/** Stripe sessions live 24h; Cashfree/Razorpay far less. Older attempts are just history. */
const PENDING_ORDER_WINDOW_MS = 24 * 60 * 60 * 1000

/** Web app subscription page. The website runs the Cashfree/Razorpay SDKs this build does not bundle. */
const webCheckoutUrl = (plan: string) => `${WEB_APP_URL}/subscribe?plan=${encodeURIComponent(plan)}&source=mobile`

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function purposeLabel(record: PaymentRecord): string {
  if (record.purpose === 'subscription') {
    const plan = (record.metadata as { plan?: string } | null)?.plan
    return getPlanLabel(plan)
  }
  if (record.purpose === 'booking_advance') return 'Booking advance (50%)'
  if (record.purpose === 'booking_balance') return 'Booking balance (50%)'
  return 'Payment'
}

export function PaymentScreen() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('pass')

  const {
    entitlement,
    loading: entitlementLoading,
    error: entitlementError,
    refresh: refreshEntitlement,
  } = useSubscription({ autoLoad: false })

  const [history, setHistory] = useState<PaymentRecord[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [checkout, setCheckout] = useState<CheckoutState>(INITIAL_CHECKOUT)
  const checkoutRef = useRef(checkout)
  checkoutRef.current = checkout
  const verifyRunId = useRef(0)

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const response = await paymentsApi.getHistory()
      setHistory(Array.isArray(response.data) ? response.data : [])
      setHistoryError(null)
    } catch (err) {
      setHistoryError(getApiErrorMessage(err, 'Could not load your payment history.'))
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshEntitlement({ silent: true })
      loadHistory()
    }, [refreshEntitlement, loadHistory])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshEntitlement({ silent: true }), loadHistory()])
    setRefreshing(false)
  }, [refreshEntitlement, loadHistory])

  // ── Confirmation ──────────────────────────────────────────────────────────

  /**
   * Gateway-URL path: ask the API to verify the exact order we created.
   * Only a SUCCESS response from the server activates the plan; PENDING after
   * all attempts is surfaced as "still processing", never as paid.
   */
  const verifyOrder = useCallback(
    async (orderId: string, attempts: number, runId: number) => {
      let last: SubscriptionVerifyResult | null = null
      let transportError: string | null = null

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (verifyRunId.current !== runId) return
        try {
          const response = await subscriptionsApi.verify(orderId)
          last = response.data
          transportError = null
          if (last.status === 'SUCCESS' || last.status === 'FAILED') break
        } catch (err) {
          const info = getApiError(err)
          transportError = info.message
          // 401 here means our session expired (verify itself is public).
          if (info.status === 401) break
        }
        if (attempt < attempts - 1) await sleep(VERIFY_POLL_INTERVAL_MS)
      }

      if (verifyRunId.current !== runId) return

      if (last?.status === 'SUCCESS') {
        setCheckout((prev) => ({ ...prev, phase: 'succeeded', verification: last, errorMessage: null }))
        await Promise.all([refreshEntitlement({ silent: true }), loadHistory()])
        return
      }

      if (last?.status === 'FAILED') {
        setCheckout((prev) => ({
          ...prev,
          phase: 'failed',
          verification: last,
          errorMessage: last?.message || 'The payment was not completed.',
        }))
        loadHistory()
        return
      }

      setCheckout((prev) => ({
        ...prev,
        phase: 'pending',
        verification: last,
        errorMessage: transportError,
      }))
    },
    [refreshEntitlement, loadHistory]
  )

  /**
   * Web-app path: the website creates its own gateway order, so we cannot
   * verify a specific order id. Activation is detected only from server data:
   * the entitlement changing versus when checkout began, or a new successful
   * subscription payment appearing in history since then.
   */
  const pollEntitlement = useCallback(
    async (attempts: number, runId: number) => {
      let lastError: string | null = null
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (verifyRunId.current !== runId) return
        try {
          const [statusResponse, historyResponse] = await Promise.all([
            subscriptionsApi.getStatus(),
            paymentsApi.getHistory(),
          ])
          lastError = null

          const { baseline, startedAt } = checkoutRef.current
          const status = statusResponse.data
          const entitlementChanged =
            status.status === 'active' &&
            status.hasSubscription &&
            (!baseline || status.expiresAt !== baseline.expiresAt || status.plan !== baseline.plan)

          const records = Array.isArray(historyResponse.data) ? historyResponse.data : []
          const sinceMs = startedAt - 60_000
          const newPayment = records.find(
            (record) =>
              record.purpose === 'subscription' &&
              record.status === 'Success' &&
              new Date(record.paidAt ?? record.createdAt).getTime() >= sinceMs
          )

          if (entitlementChanged || newPayment) {
            if (verifyRunId.current !== runId) return
            setCheckout((prev) => ({
              ...prev,
              phase: 'succeeded',
              verification: {
                status: 'SUCCESS',
                orderId: newPayment?.providerOrderId ?? prev.order?.orderId ?? '',
                paymentId: newPayment?.id,
                hasSubscription: true,
                plan: status.plan ?? (newPayment?.metadata as { plan?: string } | null)?.plan ?? null,
                expiresAt: status.expiresAt,
              },
              errorMessage: null,
            }))
            await Promise.all([refreshEntitlement({ silent: true }), loadHistory()])
            return
          }
        } catch (err) {
          lastError = getApiErrorMessage(err)
        }
        if (attempt < attempts - 1) await sleep(VERIFY_POLL_INTERVAL_MS)
      }
      if (verifyRunId.current !== runId) return
      setCheckout((prev) => ({ ...prev, phase: 'pending', errorMessage: lastError }))
    },
    [refreshEntitlement, loadHistory]
  )

  const confirmPayment = useCallback(
    (attempts: number) => {
      const current = checkoutRef.current
      if (!current.order) return
      const runId = ++verifyRunId.current
      setCheckout((prev) => ({ ...prev, phase: 'verifying', errorMessage: null }))
      if (current.handoff === 'web_app') {
        pollEntitlement(Math.min(attempts, 4), runId)
      } else {
        verifyOrder(current.order.orderId, attempts, runId)
      }
    },
    [pollEntitlement, verifyOrder]
  )

  // When the user comes back from the browser / UPI app, confirm once more.
  // Only runs while a checkout is actually awaiting payment.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return
      const { phase } = checkoutRef.current
      if (phase === 'awaiting_payment') confirmPayment(VERIFY_POLL_ATTEMPTS)
      else if (phase === 'pending') confirmPayment(2)
    })
    return () => subscription.remove()
  }, [confirmPayment])

  useEffect(
    () => () => {
      // Abandon any in-flight polling on unmount.
      verifyRunId.current += 1
    },
    []
  )

  // ── Checkout ──────────────────────────────────────────────────────────────

  const openExternal = useCallback(async (url: string): Promise<boolean> => {
    try {
      await Linking.openURL(url)
      return true
    } catch {
      return false
    }
  }, [])

  const startCheckout = useCallback(
    async (plan: PlanDisplay) => {
      setCheckout({
        ...INITIAL_CHECKOUT,
        phase: 'initiating',
        plan,
        baseline: entitlement ? { plan: entitlement.plan, expiresAt: entitlement.expiresAt } : null,
        startedAt: Date.now(),
      })

      let order: InitiateSubscriptionResult
      try {
        const response = await subscriptionsApi.initiate(plan.id)
        order = response.data
      } catch (err) {
        setCheckout((prev) => ({
          ...prev,
          phase: 'failed',
          errorMessage: getApiErrorMessage(err, 'We could not start the checkout. Please try again.'),
        }))
        return
      }

      if (!order?.orderId) {
        setCheckout((prev) => ({
          ...prev,
          phase: 'failed',
          errorMessage: 'The payment service returned an incomplete order. Please try again.',
        }))
        return
      }

      // Stripe returns a hosted page we can open directly. Cashfree and
      // Razorpay only return session/order ids that require their SDKs, which
      // are not bundled in this app — hand off to the web app, which has them.
      const gatewayUrl = typeof order.checkout?.checkoutUrl === 'string' ? order.checkout.checkoutUrl : null

      if (!gatewayUrl) {
        // Explain the hand-off first; the modal's primary action opens the site.
        setCheckout((prev) => ({ ...prev, order, handoff: 'web_app', phase: 'awaiting_payment' }))
        return
      }

      // Mark as awaiting before leaving the app so the foreground listener
      // sees the right phase even if the OS suspends us immediately.
      setCheckout((prev) => ({ ...prev, order, handoff: 'gateway_url', phase: 'awaiting_payment' }))
      const opened = await openExternal(gatewayUrl)
      if (!opened) {
        setCheckout((prev) => ({
          ...prev,
          phase: 'failed',
          errorMessage:
            'We could not open the payment page on this device. You can complete the payment on the LorryCarry website instead.',
        }))
      }
    },
    [openExternal, entitlement]
  )

  const dismissCheckout = useCallback(() => {
    verifyRunId.current += 1
    setCheckout(INITIAL_CHECKOUT)
  }, [])

  const confirmCancelCheckout = useCallback(() => {
    const { phase } = checkoutRef.current
    if (phase === 'awaiting_payment' || phase === 'verifying') {
      Alert.alert(
        'Leave checkout?',
        'If you already paid, your plan will activate automatically once the gateway confirms it. You can re-check from this screen at any time.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: dismissCheckout },
        ]
      )
      return
    }
    dismissCheckout()
  }, [dismissCheckout])

  const handleSelectPlan = useCallback(
    (plan: PlanDisplay) => {
      if (entitlement?.status === 'active' && entitlement.plan === plan.id) return
      const isRenewal = entitlement?.status === 'active'
      Alert.alert(
        isRenewal ? `Switch to ${plan.label}?` : `Activate ${plan.label}?`,
        isRenewal
          ? `Your current plan is active until ${formatDate(entitlement?.expiresAt)}. A new ${plan.label} (${formatInr(plan.price)}) starts on the day payment is confirmed and does not extend your current plan.`
          : `You will be taken to a secure payment page to pay ${formatInr(plan.price)}. Your plan activates as soon as the payment is confirmed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => startCheckout(plan) },
        ]
      )
    },
    [entitlement, startCheckout]
  )

  // ── Derived ───────────────────────────────────────────────────────────────

  const subscriptionHistory = useMemo(
    () => (history ?? []).filter((record) => record.purpose === 'subscription'),
    [history]
  )
  const bookingHistory = useMemo(
    () => (history ?? []).filter((record) => record.purpose !== 'subscription'),
    [history]
  )

  // Recent subscription attempts the gateway has not confirmed. Shown only
  // while the user has no active plan, so an abandoned checkout never nags a
  // paying customer. Re-checking runs the same server-side verification the
  // web callback page uses (covers a missed webhook).
  const pendingSubscriptionOrders = useMemo(() => {
    if (entitlement?.status === 'active') return []
    const cutoff = Date.now() - PENDING_ORDER_WINDOW_MS
    return subscriptionHistory
      .filter((record) => record.status === 'Pending' && record.providerOrderId)
      .filter((record) => new Date(record.createdAt).getTime() >= cutoff)
      .slice(0, 3)
  }, [subscriptionHistory, entitlement?.status])

  const recheckPendingOrder = useCallback(
    (record: PaymentRecord) => {
      if (!record.providerOrderId) return
      const planId = (record.metadata as { plan?: string } | null)?.plan
      const plan = PLAN_DISPLAY[(planId as PlanDisplay['id']) ?? 'monthly'] ?? null
      const runId = ++verifyRunId.current
      setCheckout({
        ...INITIAL_CHECKOUT,
        plan,
        order: {
          provider: record.provider as InitiateSubscriptionResult['provider'],
          paymentId: record.id,
          orderId: record.providerOrderId,
          amount: Number(record.amount),
          plan: plan?.id ?? 'monthly',
          checkout: {},
        },
        handoff: null,
        phase: 'verifying',
      })
      verifyOrder(record.providerOrderId, 3, runId)
    },
    [verifyOrder]
  )

  // ── Render: Pass tab ──────────────────────────────────────────────────────

  const renderPass = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      key="pass-tab"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      {entitlementLoading && !entitlement ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Checking your subscription…</Text>
        </View>
      ) : null}

      {!entitlementLoading && !entitlement ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Subscription status unavailable</Text>
          <Text style={styles.errorText}>{entitlementError ?? 'Please try again.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refreshEntitlement()} accessibilityRole="button">
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {entitlement?.status === 'active' ? (
        <View style={styles.passCard} accessibilityLabel="Active subscription pass">
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passLabel}>LORRYCARRY PRO</Text>
              <Text style={styles.passTitle}>{getPlanLabel(entitlement.plan)}</Text>
            </View>
            <View style={styles.pulseBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>ACTIVE</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.passMetaRow}>
            <View>
              <Text style={styles.metaLabel}>MEMBER</Text>
              <Text style={styles.metaValue}>{user?.name || user?.phone || '—'}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.metaLabel}>VALID UNTIL</Text>
              <Text style={styles.metaValue}>{formatDate(entitlement.expiresAt)}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {entitlement?.status === 'trial' ? (
        <View style={styles.trialCard} accessibilityLabel="Free trial active">
          <View style={styles.passHeader}>
            <View style={styles.flex1}>
              <Text style={styles.trialLabel}>FREE TRIAL</Text>
              <Text style={styles.trialTitle}>
                {entitlement.trialDaysRemaining} {entitlement.trialDaysRemaining === 1 ? 'day' : 'days'} of full access
                left
              </Text>
            </View>
          </View>
          <Text style={styles.trialDesc}>
            Your {entitlement.trialDurationDays}-day trial ends on {formatDate(entitlement.trialEndsAt)}. Pick a plan
            any time — it activates the moment payment is confirmed.
          </Text>
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={() => setActiveTab('upgrade')}
            accessibilityRole="button"
            accessibilityLabel="View plans"
          >
            <Text style={styles.activateBtnText}>View plans</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {entitlement?.status === 'expired' ? (
        <View style={styles.noPassCard}>
          <Text style={styles.noPassIcon}>🔒</Text>
          <Text style={styles.noPassTitle}>
            {entitlement.upgradeReason === 'trial_expired' ? 'Your free trial has ended' : 'No active plan'}
          </Text>
          <Text style={styles.noPassDesc}>
            Contact reveals and new bookings are paused until you activate a plan. Browsing stays free.
          </Text>
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={() => setActiveTab('upgrade')}
            accessibilityRole="button"
            accessibilityLabel="Choose a plan"
          >
            <Text style={styles.activateBtnText}>Choose a plan</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {pendingSubscriptionOrders.length > 0 ? (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Unfinished checkout</Text>
          <Text style={styles.pendingDesc}>
            {pendingSubscriptionOrders.length === 1
              ? 'A recent checkout has not been confirmed by the payment gateway. If you did complete the payment, re-check to activate your plan.'
              : `${pendingSubscriptionOrders.length} recent checkouts have not been confirmed by the payment gateway. If you completed one of them, re-check it.`}
          </Text>
          {pendingSubscriptionOrders.slice(0, 3).map((record) => (
            <TouchableOpacity
              key={record.id}
              style={styles.pendingRow}
              onPress={() => recheckPendingOrder(record)}
              accessibilityRole="button"
              accessibilityLabel={`Re-check payment of ${formatInr(record.amount)} started ${formatDateTime(record.createdAt)}`}
            >
              <View style={styles.flex1}>
                <Text style={styles.pendingRowTitle}>
                  {purposeLabel(record)} · {formatInr(record.amount)}
                </Text>
                <Text style={styles.pendingRowMeta}>
                  {getProviderLabel(record.provider)} · started {formatDateTime(record.createdAt)}
                </Text>
              </View>
              <Text style={styles.pendingRowAction}>Re-check</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>WHAT YOU GET</Text>
      <View style={styles.benefitsContainer}>
        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>📞</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Unlimited phone reveals</Text>
            <Text style={styles.benefitDesc}>
              {isVehicleSideRole(user?.role)
                ? 'Reveal and call verified load owners directly — no broker cuts.'
                : 'Reveal and call verified truck owners directly — no broker cuts.'}
            </Text>
          </View>
        </View>
        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>💬</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Direct WhatsApp connect</Text>
            <Text style={styles.benefitDesc}>Start negotiations on WhatsApp with a single tap.</Text>
          </View>
        </View>
        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>📋</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Unlimited direct bookings</Text>
            <Text style={styles.benefitDesc}>Lock in agreed prices with the 50/50 advance-balance escrow flow.</Text>
          </View>
        </View>
        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>📍</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Live checkpoint tracking</Text>
            <Text style={styles.benefitDesc}>Five-stage trip tracking with WhatsApp updates at every milestone.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )

  // ── Render: Upgrade tab ───────────────────────────────────────────────────

  const renderUpgrade = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      key="upgrade-tab"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      <Text style={styles.upgradeHeader}>Choose your plan</Text>
      <Text style={styles.upgradeSub}>
        Payments are processed by a secure gateway. Your plan activates only after the gateway confirms the payment.
      </Text>

      {PLAN_ORDER.map((planId) => {
        const plan = PLAN_DISPLAY[planId]
        const isCurrent = entitlement?.status === 'active' && entitlement.plan === plan.id
        const busy = checkout.phase === 'initiating' && checkout.plan?.id === plan.id
        return (
          <View
            key={plan.id}
            style={[styles.planCard, plan.popular && styles.popularPlanCard, isCurrent && styles.activePlanCard]}
          >
            {isCurrent ? (
              <View style={styles.savingBadge}>
                <Text style={styles.savingBadgeText}>CURRENT PLAN</Text>
              </View>
            ) : plan.popular ? (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            ) : plan.saving ? (
              <View style={styles.savingBadge}>
                <Text style={styles.savingBadgeText}>{plan.saving.toUpperCase()}</Text>
              </View>
            ) : null}

            <Text style={styles.planLabelText}>{plan.label}</Text>
            <Text style={styles.planDescText}>{plan.description}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceSymbol}>₹</Text>
              <Text style={styles.priceAmount}>{plan.price.toLocaleString('en-IN')}</Text>
              <Text style={styles.priceDuration}>/ {plan.durationLabel}</Text>
            </View>
            <TouchableOpacity
              style={[styles.planBtn, plan.popular && styles.popularPlanBtn, isCurrent && styles.activePlanBtn]}
              onPress={() => handleSelectPlan(plan)}
              disabled={isCurrent || checkout.phase === 'initiating'}
              accessibilityRole="button"
              accessibilityLabel={
                isCurrent ? `${plan.label} is your current plan` : `Activate ${plan.label} for ${formatInr(plan.price)}`
              }
            >
              {busy ? (
                <ActivityIndicator size="small" color={plan.popular ? '#FFFFFF' : '#475569'} />
              ) : (
                <Text
                  style={[
                    styles.planBtnText,
                    plan.popular && styles.popularPlanBtnText,
                    isCurrent && styles.activePlanBtnText,
                  ]}
                >
                  {isCurrent ? 'CURRENT PLAN' : `Activate ${plan.label}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )
      })}

      <Text style={styles.pciDisclaimer}>
        Card and UPI details are entered on the payment gateway's page, never in this app. Prices include GST where
        applicable.
      </Text>
    </ScrollView>
  )

  // ── Render: History tab ───────────────────────────────────────────────────

  const renderHistoryRecord = (record: PaymentRecord) => {
    const statusStyle =
      record.status === 'Success'
        ? [styles.statusBadge, styles.successBadge]
        : record.status === 'Failed'
          ? [styles.statusBadge, styles.failedBadge]
          : record.status === 'Refunded'
            ? [styles.statusBadge, styles.refundedBadge]
            : [styles.statusBadge, styles.pendingBadge]
    const statusTextStyle =
      record.status === 'Success'
        ? [styles.statusText, styles.successText]
        : record.status === 'Failed'
          ? [styles.statusText, styles.failedText]
          : record.status === 'Refunded'
            ? [styles.statusText, styles.refundedText]
            : [styles.statusText, styles.pendingText]

    return (
      <View style={styles.historyCard} key={record.id}>
        <View style={styles.historyRow}>
          <View style={styles.flex1}>
            <Text style={styles.historyPlan}>{purposeLabel(record)}</Text>
            <Text style={styles.historyId} numberOfLines={1}>
              {getProviderLabel(record.provider)}
              {record.providerTxnId ? ` · ${record.providerTxnId}` : record.providerOrderId ? ` · ${record.providerOrderId}` : ''}
            </Text>
            <Text style={styles.historyDate}>{formatDateTime(record.paidAt ?? record.createdAt)}</Text>
            {record.status === 'Failed' && record.failureReason ? (
              <Text style={styles.historyFailure} numberOfLines={2}>
                {record.failureReason}
              </Text>
            ) : null}
          </View>
          <View style={styles.alignRight}>
            <Text style={styles.historyAmount}>{formatInr(record.amount)}</Text>
            <View style={statusStyle}>
              <Text style={statusTextStyle}>{record.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderHistory = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      key="history-tab"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      {historyLoading && history === null ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading payments…</Text>
        </View>
      ) : null}

      {historyError && history === null ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Payment history unavailable</Text>
          <Text style={styles.errorText}>{historyError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadHistory} accessibilityRole="button">
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {history !== null ? (
        <>
          <Text style={styles.sectionTitle}>SUBSCRIPTION PAYMENTS</Text>
          {subscriptionHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>🧾</Text>
              <Text style={styles.emptyHistoryText}>No subscription payments yet.</Text>
            </View>
          ) : (
            subscriptionHistory.map(renderHistoryRecord)
          )}

          <Text style={styles.sectionTitle}>BOOKING PAYMENTS</Text>
          {bookingHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>🚚</Text>
              <Text style={styles.emptyHistoryText}>Advance and balance payments for your trips will appear here.</Text>
            </View>
          ) : (
            bookingHistory.map(renderHistoryRecord)
          )}
        </>
      ) : null}
    </ScrollView>
  )

  // ── Render: Checkout modal ────────────────────────────────────────────────

  const renderCheckoutModal = () => {
    const { phase, plan, order, handoff, verification, errorMessage } = checkout
    const visible = phase !== 'idle'
    const isWebHandoff = handoff === 'web_app'
    const canRecheck = Boolean(order?.orderId) && (phase === 'awaiting_payment' || phase === 'pending')
    const canReopen = Boolean(order) && handoff !== null && (phase === 'awaiting_payment' || phase === 'pending')

    const openPaymentPage = async () => {
      if (!order) return
      const gatewayUrl = typeof order.checkout?.checkoutUrl === 'string' ? order.checkout.checkoutUrl : null
      const opened = await openExternal(gatewayUrl ?? webCheckoutUrl(order.plan))
      if (!opened) {
        Alert.alert(
          'Could not open browser',
          `Open ${WEB_APP_URL}/subscribe on any device, sign in with ${user?.phone ?? 'your phone number'} and complete the payment there.`
        )
      }
    }

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={confirmCancelCheckout}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLock}>
                {phase === 'succeeded' ? '✅' : phase === 'failed' ? '⚠️' : phase === 'pending' ? '⏳' : '🔒'}
              </Text>
              <Text style={styles.modalTitle}>
                {phase === 'initiating' && 'Preparing secure checkout'}
                {phase === 'awaiting_payment' && (handoff === 'web_app' ? 'Continue in your browser' : 'Complete payment in your browser')}
                {phase === 'verifying' && 'Confirming your payment'}
                {phase === 'succeeded' && 'Plan activated'}
                {phase === 'pending' && 'Payment not confirmed yet'}
                {phase === 'failed' && 'Payment not completed'}
              </Text>
              {plan ? (
                <Text style={styles.modalSub}>
                  {plan.label} · {formatInr(order?.amount ?? plan.price)}
                  {order ? ` · via ${getProviderLabel(order.provider)}` : ''}
                </Text>
              ) : null}
            </View>

            {phase === 'initiating' ? (
              <View style={styles.processingBox}>
                <ActivityIndicator color="#F97316" />
                <Text style={styles.processingText}>Creating your order with the payment gateway…</Text>
              </View>
            ) : null}

            {phase === 'awaiting_payment' ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  {handoff === 'gateway_url'
                    ? 'The payment page has opened in your browser. Finish the payment there, then come back to this screen — we will confirm it automatically.'
                    : `${getProviderLabel(order?.provider)} checkout is not available inside this app yet. Continue on the LorryCarry website: sign in with the same phone number (${user?.phone ?? 'your number'}), pay there, then return here and your plan will sync automatically.`}
                </Text>
                {handoff === 'gateway_url' && order?.orderId ? (
                  <Text style={styles.infoHint}>Order reference: {order.orderId}</Text>
                ) : null}
              </View>
            ) : null}

            {phase === 'verifying' ? (
              <View style={styles.processingBox}>
                <ActivityIndicator color="#F97316" />
                <Text style={styles.processingText}>
                  Waiting for the payment gateway to confirm. This usually takes a few seconds.
                </Text>
              </View>
            ) : null}

            {phase === 'succeeded' ? (
              <View style={styles.successBox}>
                <Text style={styles.successBoxText}>
                  {getPlanLabel(verification?.plan ?? order?.plan)} is active
                  {verification?.expiresAt ? ` until ${formatDate(verification.expiresAt)}` : ''}. Contact reveals and
                  bookings are unlocked.
                </Text>
              </View>
            ) : null}

            {phase === 'pending' ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  {isWebHandoff
                    ? 'No new subscription payment has reached your account yet. If you completed the payment on the website, it can take a minute to sync — check again shortly.'
                    : 'The gateway has not reported this payment as complete. If you finished paying, it can take a minute for the confirmation to arrive — your plan will activate automatically when it does.'}
                </Text>
                {errorMessage ? <Text style={styles.infoHint}>{errorMessage}</Text> : null}
              </View>
            ) : null}

            {phase === 'failed' ? (
              <View style={styles.failureBox}>
                <Text style={styles.failureText}>{errorMessage ?? 'The payment was not completed.'}</Text>
                <Text style={styles.failureHint}>No plan was activated and you have not been charged for a failed attempt.</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              {phase === 'succeeded' ? (
                <TouchableOpacity style={styles.submitModalBtn} onPress={dismissCheckout} accessibilityRole="button">
                  <Text style={styles.submitModalText}>Done</Text>
                </TouchableOpacity>
              ) : null}

              {isWebHandoff && phase === 'awaiting_payment' ? (
                <TouchableOpacity
                  style={styles.submitModalBtn}
                  onPress={openPaymentPage}
                  accessibilityRole="button"
                  accessibilityLabel="Continue on the LorryCarry website"
                >
                  <Text style={styles.submitModalText}>Continue on the website</Text>
                </TouchableOpacity>
              ) : null}

              {canRecheck ? (
                <TouchableOpacity
                  style={isWebHandoff && phase === 'awaiting_payment' ? styles.secondaryModalBtn : styles.submitModalBtn}
                  onPress={() => confirmPayment(phase === 'awaiting_payment' ? VERIFY_POLL_ATTEMPTS : 3)}
                  accessibilityRole="button"
                  accessibilityLabel="I have paid, check status"
                >
                  <Text
                    style={isWebHandoff && phase === 'awaiting_payment' ? styles.secondaryModalText : styles.submitModalText}
                  >
                    I've paid — check status
                  </Text>
                </TouchableOpacity>
              ) : null}

              {canReopen && !(isWebHandoff && phase === 'awaiting_payment') ? (
                <TouchableOpacity style={styles.secondaryModalBtn} onPress={openPaymentPage} accessibilityRole="button">
                  <Text style={styles.secondaryModalText}>{isWebHandoff ? 'Open the website' : 'Reopen payment page'}</Text>
                </TouchableOpacity>
              ) : null}

              {phase === 'failed' && plan ? (
                <TouchableOpacity
                  style={styles.secondaryModalBtn}
                  onPress={() => startCheckout(plan)}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryModalText}>Try again</Text>
                </TouchableOpacity>
              ) : null}

              {phase !== 'succeeded' ? (
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={confirmCancelCheckout}
                  disabled={phase === 'initiating'}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelModalText}>{phase === 'failed' ? 'Close' : 'Cancel'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  // ── Screen ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Plans & Payments</Text>
            <Text style={styles.subtitle}>Subscription, trial status and payment history</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh"
          >
            {refreshing ? <ActivityIndicator size="small" color="#F97316" /> : <Text style={styles.refreshIcon}>↻</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {(
          [
            ['pass', 'My Pass'],
            ['upgrade', 'Plans'],
            ['history', 'History'],
          ] as Array<[Tab, string]>
        ).map(([tab, label]) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'pass' && renderPass()}
      {activeTab === 'upgrade' && renderUpgrade()}
      {activeTab === 'history' && renderHistory()}

      {renderCheckoutModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  headerBlock: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B' },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: { fontSize: 18, color: '#F97316', fontWeight: '700' },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#E2E8F0' },
  tabButtonActive: { backgroundColor: '#F97316' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabButtonTextActive: { color: '#FFFFFF' },

  loadingContainer: { justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  loadingText: { fontSize: 13, color: '#64748B' },
  tabContent: { padding: 16, paddingBottom: 40, gap: 16 },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  errorText: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },

  passCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#475569',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  passLabel: { fontSize: 10, fontWeight: '800', color: '#F97316', letterSpacing: 1 },
  passTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  pulseText: { fontSize: 10, fontWeight: '800', color: '#A7F3D0' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  passMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  alignRight: { alignItems: 'flex-end' },

  trialCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 18,
    gap: 8,
  },
  trialLabel: { fontSize: 10, fontWeight: '800', color: '#C2410C', letterSpacing: 1 },
  trialTitle: { fontSize: 18, fontWeight: '800', color: '#7C2D12', marginTop: 2 },
  trialDesc: { fontSize: 13, color: '#9A3412', lineHeight: 18, marginBottom: 4 },

  noPassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noPassIcon: { fontSize: 48, marginBottom: 8 },
  noPassTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  noPassDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  activateBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  activateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    gap: 8,
  },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  pendingDesc: { fontSize: 12, color: '#B45309', lineHeight: 17 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingRowTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  pendingRowMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  pendingRowAction: { fontSize: 12, fontWeight: '800', color: '#F97316' },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginTop: 8 },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  benefitRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  benefitIcon: { fontSize: 20, marginTop: 2 },
  benefitTextCol: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  benefitDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },

  upgradeHeader: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  upgradeSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 2, marginBottom: 8, lineHeight: 17 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 8,
    position: 'relative',
  },
  popularPlanCard: { borderColor: '#F97316', borderWidth: 2 },
  activePlanCard: { borderColor: '#22C55E', borderWidth: 2 },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  savingBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  planLabelText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  planDescText: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 4 },
  priceSymbol: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginRight: 2 },
  priceAmount: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  priceDuration: { fontSize: 12, color: '#64748B', marginLeft: 4 },
  planBtn: { backgroundColor: '#E2E8F0', paddingVertical: 10, borderRadius: 8, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  popularPlanBtn: { backgroundColor: '#F97316' },
  activePlanBtn: { backgroundColor: '#DCFCE7' },
  planBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  popularPlanBtnText: { color: '#FFFFFF' },
  activePlanBtnText: { color: '#15803D' },
  pciDisclaimer: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16, marginTop: 4 },

  emptyHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryIcon: { fontSize: 32 },
  emptyHistoryText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  historyPlan: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  historyId: { fontSize: 10, color: '#64748B', marginTop: 2 },
  historyDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  historyFailure: { fontSize: 11, color: '#B91C1C', marginTop: 4 },
  historyAmount: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  successBadge: { backgroundColor: '#DCFCE7' },
  failedBadge: { backgroundColor: '#FEE2E2' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  refundedBadge: { backgroundColor: '#E0E7FF' },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  successText: { color: '#16A34A' },
  failedText: { color: '#DC2626' },
  pendingText: { color: '#D97706' },
  refundedText: { color: '#4338CA' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    gap: 16,
  },
  modalHeader: { alignItems: 'center', gap: 4 },
  modalLock: { fontSize: 32, marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  modalSub: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  processingBox: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  processingText: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 18 },
  infoBox: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, gap: 8 },
  infoText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  infoHint: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  successBox: { backgroundColor: '#DCFCE7', borderRadius: 12, padding: 14 },
  successBoxText: { fontSize: 13, color: '#166534', lineHeight: 19, textAlign: 'center' },
  failureBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, gap: 6 },
  failureText: { fontSize: 13, color: '#991B1B', lineHeight: 19 },
  failureHint: { fontSize: 11, color: '#B91C1C', lineHeight: 16 },
  modalActions: { gap: 10 },
  submitModalBtn: { backgroundColor: '#F97316', paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  submitModalText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryModalBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryModalText: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  cancelModalBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelModalText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
})
