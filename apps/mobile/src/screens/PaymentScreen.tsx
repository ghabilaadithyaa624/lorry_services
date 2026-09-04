import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getApiErrorMessage, paymentsApi } from '../services/api'
import {
  getCheckoutStrategy,
  getConfiguredProvider,
  getWebCheckoutUrl,
  startSubscriptionCheckout,
} from '../services/checkout'
import type { PaymentRecord, SubscriptionPlanId } from '../services/types'
import { useAuth } from '../contexts/AuthContext'
import { isVehicleSideRole } from '../lib/roles'

/**
 * Plan catalogue — prices and durations mirror `SUBSCRIPTION_PLANS` in
 * `packages/shared`. The backend is the source of truth for the amount actually
 * charged; these values are display copy only.
 */
interface PlanConfig {
  id: SubscriptionPlanId
  price: number
  durationDays: number
  durationLabel: string
  label: string
  desc: string
  popular?: boolean
  saving?: string
}

const PLANS: PlanConfig[] = [
  {
    id: 'monthly',
    price: 999,
    durationDays: 30,
    durationLabel: 'Month',
    label: 'Monthly Unlimited',
    desc: 'Best for flexible short-term corridor runs',
  },
  {
    id: 'quarterly',
    price: 2499,
    durationDays: 90,
    durationLabel: '3 Months',
    label: 'Quarterly Unlimited',
    desc: 'Our most popular value plan',
    popular: true,
  },
  {
    id: 'annual',
    price: 7999,
    durationDays: 365,
    durationLabel: 'Year',
    label: 'Annual Unlimited',
    desc: 'Maximize savings for year-round logistics',
    saving: 'Save 33%',
  },
]

const PLAN_LABELS: Record<SubscriptionPlanId, string> = {
  monthly: 'Monthly Unlimited',
  quarterly: 'Quarterly Unlimited',
  annual: 'Annual Unlimited',
}

type Tab = 'pass' | 'upgrade' | 'history'

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAmount(amount: string | number): string {
  const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (!Number.isFinite(numeric)) return '—'
  return numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function describePayment(payment: PaymentRecord): string {
  const planLabel = payment.metadata?.planLabel
  if (typeof planLabel === 'string' && planLabel) return planLabel

  switch (payment.purpose) {
    case 'subscription':
      return 'Access Pass'
    case 'booking_advance':
      return 'Booking Advance (50%)'
    case 'booking_balance':
      return 'Delivery Balance (50%)'
    case 'penalty':
      return 'Penalty'
    case 'refund':
      return 'Refund'
    default:
      return 'Payment'
  }
}

export function PaymentScreen() {
  const { user, entitlement, entitlementLoading, entitlementError, refreshEntitlement } = useAuth()

  const [activeTab, setActiveTab] = useState<Tab>('pass')
  const [refreshing, setRefreshing] = useState(false)

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)

  // Checkout state
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null)
  const [checkoutStage, setCheckoutStage] = useState<'idle' | 'starting' | 'verifying'>('idle')
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null)

  const provider = getConfiguredProvider()
  const strategy = getCheckoutStrategy(provider)
  const processing = checkoutStage !== 'idle'

  const fetchPayments = useCallback(async () => {
    setPaymentsError(null)
    try {
      const { data } = await paymentsApi.getHistory()
      setPayments(Array.isArray(data) ? data : [])
    } catch (error) {
      setPayments([])
      setPaymentsError(getApiErrorMessage(error, 'Could not load your payment history.'))
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    await Promise.all([refreshEntitlement(), fetchPayments()])
  }, [refreshEntitlement, fetchPayments])

  useEffect(() => {
    void fetchPayments()
  }, [fetchPayments])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadAll()
    } finally {
      setRefreshing(false)
    }
  }, [loadAll])

  const hasSubscription = entitlement?.hasSubscription === true
  const isTrialActive = entitlement?.isTrialActive === true
  const activePlan = entitlement?.plan ?? null

  const subscriptionPayments = useMemo(
    () => payments.filter((p) => p.purpose === 'subscription'),
    [payments],
  )

  const handleOpenCheckout = (plan: PlanConfig) => {
    setSelectedPlan(plan)
    setCheckoutNotice(null)
    setModalVisible(true)
  }

  const closeCheckout = () => {
    if (processing) return
    setModalVisible(false)
    setSelectedPlan(null)
    setCheckoutNotice(null)
  }

  /**
   * Start a real checkout. Activation is decided exclusively by the backend —
   * this handler never sets a local "subscribed" flag.
   */
  const handleStartCheckout = async () => {
    if (!selectedPlan || processing) return

    setCheckoutStage('starting')
    setCheckoutNotice(null)

    const outcome = await startSubscriptionCheckout({
      plan: selectedPlan.id,
      provider,
      onVerifyingChange: (verifying) => setCheckoutStage(verifying ? 'verifying' : 'starting'),
    })

    setCheckoutStage('idle')

    switch (outcome.result) {
      case 'success': {
        await fetchPayments()
        setModalVisible(false)
        setSelectedPlan(null)
        setActiveTab('pass')
        Alert.alert(
          'Pass activated',
          `Your ${PLAN_LABELS[outcome.entitlement.plan ?? selectedPlan.id]} pass is active until ${formatDate(
            outcome.entitlement.expiresAt,
          )}.`,
        )
        break
      }

      case 'pending': {
        await loadAll()
        setCheckoutNotice(outcome.message)
        Alert.alert('Payment not confirmed yet', outcome.message)
        break
      }

      case 'failed': {
        await loadAll()
        setCheckoutNotice(outcome.message)
        Alert.alert('Payment failed', outcome.message)
        break
      }

      case 'cancelled': {
        setCheckoutNotice(outcome.message)
        break
      }

      case 'error':
      default: {
        setCheckoutNotice(outcome.message)
        Alert.alert('Checkout unavailable', outcome.message)
        break
      }
    }
  }

  // ── Tab: My Pass ─────────────────────────────────────────────────────────
  const renderActivePass = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      key="active-pass-tab"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {entitlementError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{entitlementError}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn} accessibilityRole="button">
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {hasSubscription ? (
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passLabel}>ACTIVE DIRECT MARKETPLACE PASS</Text>
              <Text style={styles.passTitle}>
                {activePlan ? PLAN_LABELS[activePlan] : 'Access Pass'}
              </Text>
            </View>
            <View style={styles.pulseBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.passMetaRow}>
            <View>
              <Text style={styles.metaLabel}>EXPIRES ON</Text>
              <Text style={styles.metaValue}>{formatDate(entitlement?.expiresAt)}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.metaLabel}>STATUS</Text>
              <Text style={[styles.metaValue, { color: '#22C55E' }]}>UNLIMITED REVEAL</Text>
            </View>
          </View>
        </View>
      ) : isTrialActive ? (
        <View style={styles.trialCard}>
          <Text style={styles.passLabel}>FREE TRIAL ACTIVE</Text>
          <Text style={styles.passTitle}>
            {entitlement?.trialDaysRemaining ?? 0} days of full access left
          </Text>
          <View style={styles.divider} />
          <Text style={styles.trialDesc}>
            Your trial ends on {formatDate(entitlement?.trialEndsAt)}. Upgrade any time — your pass
            starts the moment payment is confirmed.
          </Text>
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={() => setActiveTab('upgrade')}
            accessibilityRole="button"
            accessibilityLabel="View pricing plans"
          >
            <Text style={styles.activateBtnText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noPassCard}>
          <Text style={styles.noPassIcon}>🎫</Text>
          <Text style={styles.noPassTitle}>No Active Transporter Pass</Text>
          <Text style={styles.noPassDesc}>
            {isVehicleSideRole(user?.role)
              ? 'Contact details, direct phone calls, and direct load booking triggers are restricted. Get direct load logistics intelligence without third-party broker friction.'
              : 'Contact details, direct phone calls, and direct truck booking triggers are restricted. Get direct truck logistics intelligence without third-party broker friction.'}
          </Text>
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={() => setActiveTab('upgrade')}
            accessibilityLabel="View pricing plans to activate transporter pass"
            accessibilityRole="button"
          >
            <Text style={styles.activateBtnText}>Activate Access Pass Now</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>PASS INCLUDED BENEFITS</Text>
      <View style={styles.benefitsContainer}>
        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>📞</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Unlimited Phone Reveals</Text>
            <Text style={styles.benefitDesc}>Reveal and call verified load owners or truck owners directly.</Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>💬</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Direct WhatsApp Connect</Text>
            <Text style={styles.benefitDesc}>Initiate negotiations on WhatsApp with single-tap quick chat triggers.</Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>📋</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Unlimited Direct Bookings</Text>
            <Text style={styles.benefitDesc}>Create contract commitments and confirm transit operations instantly.</Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>📍</Text>
          <View style={styles.benefitTextCol}>
            <Text style={styles.benefitTitle}>Geofence Milestones</Text>
            <Text style={styles.benefitDesc}>Real-time 5-stage automated highway checkpoint tracking alerts.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )

  // ── Tab: Upgrade ─────────────────────────────────────────────────────────
  const renderUpgradePlans = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      key="upgrade-plans-tab"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.upgradeHeader}>Choose Your Direct Access Plan</Text>
      <Text style={styles.upgradeSub}>
        Payment is processed by our secure gateway. Your pass activates only after the payment is
        confirmed.
      </Text>

      {PLANS.map((plan) => {
        const isActive = hasSubscription && activePlan === plan.id
        return (
          <View
            key={plan.id}
            style={[styles.planCard, plan.popular && styles.popularPlanCard, isActive && styles.activePlanCard]}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}
            {plan.saving && (
              <View style={styles.savingBadge}>
                <Text style={styles.savingBadgeText}>{plan.saving}</Text>
              </View>
            )}

            <Text style={styles.planLabelText}>{plan.label}</Text>
            <Text style={styles.planDescText}>{plan.desc}</Text>

            <View style={styles.priceContainer}>
              <Text style={styles.priceSymbol}>₹</Text>
              <Text style={styles.priceAmount}>{plan.price.toLocaleString('en-IN')}</Text>
              <Text style={styles.priceDuration}>/ {plan.durationLabel}</Text>
            </View>

            <TouchableOpacity
              style={[styles.planBtn, plan.popular && styles.popularPlanBtn, isActive && styles.activePlanBtn]}
              onPress={() => !isActive && handleOpenCheckout(plan)}
              disabled={isActive || processing}
              accessibilityLabel={
                isActive ? `${plan.label} is currently active` : `Subscribe to ${plan.label} for rupees ${plan.price}`
              }
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.planBtnText,
                  plan.popular && styles.popularPlanBtnText,
                  isActive && styles.activePlanBtnText,
                ]}
              >
                {isActive ? 'CURRENT PLAN' : `Choose ${plan.label}`}
              </Text>
            </TouchableOpacity>
          </View>
        )
      })}
    </ScrollView>
  )

  // ── Tab: History ─────────────────────────────────────────────────────────
  const renderHistory = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      key="payment-history-tab"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>TRANSACTION LOGS</Text>

      {paymentsError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{paymentsError}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn} accessibilityRole="button">
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryIcon}>💸</Text>
          <Text style={styles.emptyHistoryText}>
            No payments recorded on your LorryCarry account yet.
          </Text>
        </View>
      ) : (
        payments.map((payment) => (
          <View style={styles.historyCard} key={payment.id}>
            <View style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyPlan}>{describePayment(payment)}</Text>
                <Text style={styles.historyId}>Ref: {payment.providerOrderId || payment.id.slice(0, 12)}</Text>
                <Text style={styles.historyDate}>{formatDate(payment.paidAt || payment.createdAt)}</Text>
                {payment.status === 'Failed' && payment.failureReason ? (
                  <Text style={styles.historyFailure}>{payment.failureReason}</Text>
                ) : null}
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.historyAmount}>₹{formatAmount(payment.amount)}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    payment.status === 'Success' && styles.successBadge,
                    payment.status === 'Failed' && styles.failedBadge,
                    payment.status === 'Pending' && styles.pendingBadge,
                    payment.status === 'Refunded' && styles.pendingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      payment.status === 'Success' && styles.successText,
                      payment.status === 'Failed' && styles.failedText,
                      payment.status === 'Pending' && styles.pendingText,
                      payment.status === 'Refunded' && styles.pendingText,
                    ]}
                  >
                    {payment.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))
      )}

      {subscriptionPayments.length > 0 && (
        <Text style={styles.historyFootnote}>
          Pass renewals are listed here as soon as the gateway confirms them.
        </Text>
      )}
    </ScrollView>
  )

  const initialLoading = paymentsLoading && entitlement === null && entitlementLoading

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Payments & Passes</Text>
            <Text style={styles.subtitle}>Direct Marketplace Access Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshing}
              style={styles.refreshBtn}
              accessibilityLabel="Refresh payment records"
              accessibilityRole="button"
            >
              <Text style={styles.refreshIcon}>{refreshing ? '⏳' : '🔄'}</Text>
            </TouchableOpacity>
            {user && (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText}>👤 {user.name || user.role.replace('_', ' ')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pass' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pass')}
          accessibilityLabel="My Pass tab button"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'pass' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'pass' && styles.tabButtonTextActive]}>
            🎟️ My Pass
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upgrade' && styles.tabButtonActive]}
          onPress={() => setActiveTab('upgrade')}
          accessibilityLabel="Upgrade tab button"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'upgrade' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'upgrade' && styles.tabButtonTextActive]}>
            ⚡ Upgrade
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
          accessibilityLabel="History tab button"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'history' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
            📋 History
          </Text>
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading your billing records…</Text>
        </View>
      ) : activeTab === 'pass' ? (
        renderActivePass()
      ) : activeTab === 'upgrade' ? (
        renderUpgradePlans()
      ) : (
        renderHistory()
      )}

      {/* ── Secure checkout handoff ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeCheckout}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLock}>🔒</Text>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>SECURE CHECKOUT</Text>
                <Text style={styles.modalSub}>
                  Payment is handled by our PCI-compliant gateway. LorryCarry never sees your card
                  or UPI credentials.
                </Text>
              </View>
            </View>

            {selectedPlan && (
              <View style={styles.checkoutSummary}>
                <Text style={styles.checkoutLabel}>ORDER DETAILS</Text>
                <View style={styles.checkoutRow}>
                  <Text style={styles.checkoutPlanName}>{selectedPlan.label}</Text>
                  <Text style={styles.checkoutPrice}>₹{selectedPlan.price.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.checkoutValidity}>
                  Valid for {selectedPlan.durationDays} days from activation
                </Text>
              </View>
            )}

            <View style={styles.browserNotice}>
              <Text style={styles.browserNoticeTitle}>You will continue in your browser</Text>
              <Text style={styles.browserNoticeText}>
                {strategy === 'api-checkout-url'
                  ? 'We will open the secure checkout page provided by the payment gateway. Come back to the app once you are done — we will confirm the payment with our servers.'
                  : `We will open the LorryCarry secure checkout at ${getWebCheckoutUrl(
                      selectedPlan?.id ?? 'monthly',
                    ).replace(/^https?:\/\//, '')}. Return to the app after paying and we will confirm your pass.`}
              </Text>
            </View>

            {checkoutNotice ? <Text style={styles.checkoutNotice}>{checkoutNotice}</Text> : null}

            {processing ? (
              <View style={styles.processingBox}>
                <ActivityIndicator size="small" color="#F97316" />
                <Text style={styles.processingText}>
                  {checkoutStage === 'starting'
                    ? 'Opening secure checkout…'
                    : 'Confirming your payment with the gateway. Do not close the app.'}
                </Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={closeCheckout}
                  accessibilityLabel="Cancel checkout"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitModalBtn, { backgroundColor: '#F97316' }]}
                  onPress={handleStartCheckout}
                  accessibilityLabel="Continue to secure payment in browser"
                  accessibilityRole="button"
                >
                  <Text style={styles.submitModalText}>Continue in Browser</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.pciDisclaimer}>
              Your pass activates only after the payment gateway confirms the transaction.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBlock: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#F97316',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  tabContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    gap: 10,
  },
  errorText: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
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
  trialCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F97316',
    gap: 4,
  },
  trialDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 12,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 1,
  },
  passTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  pulseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A7F3D0',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  passMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  noPassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noPassIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  noPassTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  noPassDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  activateBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  activateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 8,
  },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  benefitIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  benefitTextCol: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  benefitDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  upgradeHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  upgradeSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 17,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 8,
    position: 'relative',
  },
  popularPlanCard: {
    borderColor: '#F97316',
    borderWidth: 2,
  },
  activePlanCard: {
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  savingBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planLabelText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  planDescText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  priceSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceDuration: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  planBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularPlanBtn: {
    backgroundColor: '#F97316',
  },
  activePlanBtn: {
    backgroundColor: '#DCFCE7',
  },
  planBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  popularPlanBtnText: {
    color: '#FFFFFF',
  },
  activePlanBtnText: {
    color: '#15803D',
  },
  emptyHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryIcon: {
    fontSize: 32,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyInfo: { flex: 1, paddingRight: 12 },
  historyPlan: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyId: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyFailure: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 4,
    lineHeight: 14,
  },
  historyFootnote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  successBadge: { backgroundColor: '#DCFCE7' },
  failedBadge: { backgroundColor: '#FEE2E2' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 9, fontWeight: '800' },
  successText: { color: '#16A34A' },
  failedText: { color: '#DC2626' },
  pendingText: { color: '#D97706' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalHeaderText: { flex: 1 },
  modalLock: {
    fontSize: 24,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  checkoutSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkoutLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutPlanName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkoutPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  checkoutValidity: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  browserNotice: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  browserNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
  browserNoticeText: {
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 16,
  },
  checkoutNotice: {
    fontSize: 11,
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    lineHeight: 16,
  },
  processingBox: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  submitModalBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitModalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pciDisclaimer: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 14,
  },
  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
    textTransform: 'capitalize',
  },
})
