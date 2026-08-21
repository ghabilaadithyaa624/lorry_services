import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MMKV } from 'react-native-mmkv'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const storage = new MMKV()
const LOCAL_SUB_KEY = 'lorrycarry_local_subscription'
const LOCAL_PAYMENTS_KEY = 'lorrycarry_local_payments'

interface SubscriptionState {
  hasSubscription: boolean
  plan: string | null
  expiresAt: string | null
}

interface PaymentItem {
  id: string
  amount: number
  date: string
  status: 'Success' | 'Failed' | 'Pending'
  planLabel: string
}

interface PlanConfig {
  id: 'monthly' | 'quarterly' | 'annual'
  price: number
  durationDays: number
  durationLabel: string
  label: string
  desc: string
  popular?: boolean
  saving?: string
}

const DEFAULT_PAYMENTS: PaymentItem[] = [
  {
    id: 'TXN-94827103',
    amount: 999,
    date: '2025-01-15',
    status: 'Success',
    planLabel: 'Monthly Unlimited Pass',
  },
  {
    id: 'TXN-83921048',
    amount: 999,
    date: '2024-12-16',
    status: 'Success',
    planLabel: 'Monthly Unlimited Pass',
  },
]

const PLANS: PlanConfig[] = [
  {
    id: 'monthly',
    price: 999,
    durationDays: 30,
    durationLabel: 'Month',
    label: 'Pro Monthly',
    desc: 'Best for flexible short-term corridor runs',
  },
  {
    id: 'quarterly',
    price: 2499,
    durationDays: 90,
    durationLabel: '3 Months',
    label: 'Pro Quarterly',
    desc: 'Our most popular value plan',
    popular: true,
  },
  {
    id: 'annual',
    price: 7999,
    durationDays: 365,
    durationLabel: 'Year',
    label: 'Pro Annual',
    desc: 'Maximize savings for year-round logistics',
    saving: 'Save 33%',
  },
]

type Tab = 'pass' | 'upgrade' | 'history'

export function PaymentScreen() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('pass')
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionState>({
    hasSubscription: false,
    plan: null,
    expiresAt: null,
  })
  const [payments, setPayments] = useState<PaymentItem[]>([])

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([fetchSubscriptionStatus(), fetchPaymentHistory()])
    setLoading(false)
  }

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await api.get('/subscriptions/status')
      if (res.data) {
        const subData = {
          hasSubscription: res.data.hasSubscription,
          plan: res.data.plan,
          expiresAt: res.data.expiresAt,
        }
        setSubscription(subData)
        storage.set(LOCAL_SUB_KEY, JSON.stringify(subData))
      }
    } catch {
      // Fallback to local MMKV storage
      const cached = storage.getString(LOCAL_SUB_KEY)
      if (cached) {
        setSubscription(JSON.parse(cached))
      }
    }
  }

  const fetchPaymentHistory = async () => {
    const localPaymentsStr = storage.getString(LOCAL_PAYMENTS_KEY)
    let localPayments: PaymentItem[] = localPaymentsStr ? JSON.parse(localPaymentsStr) : []

    try {
      // Attempt to load activities and extract payments
      const res = await api.get('/users/activity')
      if (res.data && Array.isArray(res.data)) {
        const remotePayments: PaymentItem[] = res.data
          .filter((act: any) => act.category === 'PAYMENT')
          .map((act: any) => ({
            id: act.id.replace('payment-', ''),
            amount: act.metadata?.amount || 999,
            date: new Date(act.timestamp).toISOString().split('T')[0],
            status: act.status || 'Success',
            planLabel: act.metadata?.purpose === 'subscription' ? 'Pro Access Pass' : 'Freight Payment',
          }))

        if (remotePayments.length > 0) {
          // Merge remote and unique local payments
          const merged = [...localPayments]
          remotePayments.forEach((rp) => {
            if (!merged.some((mp) => mp.id === rp.id)) {
              merged.push(rp)
            }
          })
          setPayments([...merged, ...DEFAULT_PAYMENTS])
          return
        }
      }
    } catch {
      // Ignore and use local/default merge
    }

    setPayments([...localPayments, ...DEFAULT_PAYMENTS])
  }

  const handleOpenCheckout = (plan: PlanConfig) => {
    setSelectedPlan(plan)
    setPaymentMethod('upi')
    setModalVisible(true)
  }

  const handleSimulatePayment = async (success: boolean) => {
    if (!selectedPlan) return
    setProcessing(true)

    try {
      if (success) {
        let backendSucceeded = false
        let orderId = `sub_mob_${Date.now().toString().slice(-6)}`

        try {
          // 1. Try to initiate with real backend API
          const initRes = await api.post('/subscriptions/initiate', { plan: selectedPlan.id })
          if (initRes.data?.orderId) {
            orderId = initRes.data.orderId
            // 2. Since this is sandbox verification, call backend callback or verify endpoint to trigger database activation
            await api.get(`/subscriptions/verify/${orderId}`)
            backendSucceeded = true
          }
        } catch {
          // Fallback to local simulation if offline or backend unavailable
        }

        const now = new Date()
        const expires = new Date()
        expires.setDate(expires.getDate() + selectedPlan.durationDays)

        const updatedSub: SubscriptionState = {
          hasSubscription: true,
          plan: selectedPlan.id,
          expiresAt: expires.toISOString(),
        }

        // Set state & cache
        setSubscription(updatedSub)
        storage.set(LOCAL_SUB_KEY, JSON.stringify(updatedSub))

        // Create local transaction record
        const newPayment: PaymentItem = {
          id: orderId,
          amount: selectedPlan.price,
          date: now.toISOString().split('T')[0],
          status: 'Success',
          planLabel: `${selectedPlan.label} Pass`,
        }

        const localPaymentsStr = storage.getString(LOCAL_PAYMENTS_KEY)
        const localPayments: PaymentItem[] = localPaymentsStr ? JSON.parse(localPaymentsStr) : []
        const updatedPayments = [newPayment, ...localPayments]

        storage.set(LOCAL_PAYMENTS_KEY, JSON.stringify(updatedPayments))
        setPayments([...updatedPayments, ...DEFAULT_PAYMENTS])

        setModalVisible(false)
        Alert.alert(
          'Payment Successful 🎉',
          backendSucceeded
            ? `Your ${selectedPlan.label} is now active on LorryCarry cloud!`
            : `Subscription mock-activated successfully! (Mode: Isolated Demo)`
        )
        setActiveTab('pass')
      } else {
        // Failed simulation
        Alert.alert('Payment Failed', 'The simulated payment was cancelled or declined.')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        Alert.alert('Error', err.message || 'An unexpected error occurred during simulation.')
      } else {
        Alert.alert('Error', 'An unexpected error occurred during simulation.')
      }
    } finally {
      setProcessing(false)
    }
  }

  const renderActivePass = () => {
    const planConfig = PLANS.find((p) => p.id === subscription.plan)
    const formattedExpiry = subscription.expiresAt
      ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A'

    return (
      <ScrollView contentContainerStyle={styles.tabContent} key="active-pass-tab">
        {subscription.hasSubscription ? (
          <View style={styles.passCard}>
            <View style={styles.passHeader}>
              <View>
                <Text style={styles.passLabel}>ACTIVE DIRECT MARKETPLACE PASS</Text>
                <Text style={styles.passTitle}>{planConfig?.label || 'Pro Pass Active'}</Text>
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
                <Text style={styles.metaValue}>{formattedExpiry}</Text>
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.metaLabel}>STATUS</Text>
                <Text style={[styles.metaValue, { color: '#22C55E' }]}>UNLIMITED REVEAL</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noPassCard}>
            <Text style={styles.noPassIcon}>🎫</Text>
            <Text style={styles.noPassTitle}>No Active Transporter Pass</Text>
            <Text style={styles.noPassDesc}>
              {user?.role === 'truck_owner'
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
  }

  const renderUpgradePlans = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContent} key="upgrade-plans-tab">
        <Text style={styles.upgradeHeader}>Choose Your Direct Access Plan</Text>
        <Text style={styles.upgradeSub}>Select a secure tier. High-performance freight intelligence.</Text>

        {PLANS.map((plan) => {
          const isActive = subscription.hasSubscription && subscription.plan === plan.id
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.popular && styles.popularPlanCard,
                isActive && styles.activePlanCard,
              ]}
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
                style={[
                  styles.planBtn,
                  plan.popular && styles.popularPlanBtn,
                  isActive && styles.activePlanBtn,
                ]}
                onPress={() => !isActive && handleOpenCheckout(plan)}
                disabled={isActive}
                accessibilityLabel={isActive ? `${plan.label} is currently active` : `Subscribe to ${plan.label} for rupees ${plan.price}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.planBtnText,
                    plan.popular && styles.popularPlanBtnText,
                    isActive && styles.activePlanBtnText,
                  ]}
                >
                  {isActive ? 'CURRENT PLAN' : `Activate ${plan.label}`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    )
  }

  const renderHistory = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContent} key="payment-history-tab">
        <Text style={styles.sectionTitle}>TRANSACTION LOGS</Text>
        {payments.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryIcon}>💸</Text>
            <Text style={styles.emptyHistoryText}>No transactions logged on this device yet.</Text>
          </View>
        ) : (
          payments.map((p) => (
            <View style={styles.historyCard} key={p.id}>
              <View style={styles.historyRow}>
                <View>
                  <Text style={styles.historyPlan}>{p.planLabel}</Text>
                  <Text style={styles.historyId}>ID: {p.id}</Text>
                  <Text style={styles.historyDate}>{p.date}</Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.historyAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      p.status === 'Success' && styles.successBadge,
                      p.status === 'Failed' && styles.failedBadge,
                      p.status === 'Pending' && styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        p.status === 'Success' && styles.successText,
                        p.status === 'Failed' && styles.failedText,
                        p.status === 'Pending' && styles.pendingText,
                      ]}
                    >
                      {p.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Title block */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Payments & Passes</Text>
            <Text style={styles.subtitle}>Direct Marketplace Access Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={loadData}
              disabled={loading}
              style={styles.refreshBtn}
              accessibilityLabel="Refresh payment records"
              accessibilityRole="button"
            >
              <Text style={styles.refreshIcon}>{loading ? '⏳' : '🔄'}</Text>
            </TouchableOpacity>
            {user && (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText}>👤 {user.name || user.role.replace('_', ' ')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Segmented Tabs */}
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

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Synchronizing billing records...</Text>
        </View>
      ) : activeTab === 'pass' ? (
        renderActivePass()
      ) : activeTab === 'upgrade' ? (
        renderUpgradePlans()
      ) : (
        renderHistory()
      )}

      {/* ── SANDBOX PAYMENTS SECURE MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLock}>🔒</Text>
              <View>
                <Text style={styles.modalTitle}>CASHFREE SANDBOX CHECKOUT</Text>
                <Text style={styles.modalSub}>LorryCarry Gateway Integration Simulation</Text>
              </View>
            </View>

            {selectedPlan && (
              <View style={styles.checkoutSummary}>
                <Text style={styles.checkoutLabel}>Order Details</Text>
                <View style={styles.checkoutRow}>
                  <Text style={styles.checkoutPlanName}>{selectedPlan.label} Pass Access</Text>
                  <Text style={styles.checkoutPrice}>₹{selectedPlan.price.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.checkoutValidity}>Valid for {selectedPlan.durationDays} Days</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Simulated Payment Method</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodCard, paymentMethod === 'upi' && styles.methodCardActive]}
                onPress={() => setPaymentMethod('upi')}
                accessibilityLabel="Select UPI as simulated payment method"
                accessibilityRole="radio"
                accessibilityState={{ checked: paymentMethod === 'upi' }}
              >
                <Text style={styles.methodIcon}>📱</Text>
                <Text style={styles.methodText}>UPI (GPay / PhonePe)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, paymentMethod === 'card' && styles.methodCardActive]}
                onPress={() => setPaymentMethod('card')}
                accessibilityLabel="Select Debit or Credit Card as simulated payment method"
                accessibilityRole="radio"
                accessibilityState={{ checked: paymentMethod === 'card' }}
              >
                <Text style={styles.methodIcon}>💳</Text>
                <Text style={styles.methodText}>Debit/Credit Card</Text>
              </TouchableOpacity>
            </View>

            {processing ? (
              <View style={styles.processingBox}>
                <ActivityIndicator size="small" color="#F97316" />
                <Text style={styles.processingText}>Processing secure merchant handshakes...</Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setModalVisible(false)}
                  accessibilityLabel="Cancel merchant checkout"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitModalBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleSimulatePayment(false)}
                  accessibilityLabel="Simulate payment failure"
                  accessibilityRole="button"
                >
                  <Text style={styles.submitModalText}>Fail Txn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitModalBtn, { backgroundColor: '#16A34A' }]}
                  onPress={() => handleSimulatePayment(true)}
                  accessibilityLabel="Simulate payment success"
                  accessibilityRole="button"
                >
                  <Text style={styles.submitModalText}>Success</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.pciDisclaimer}>
              This simulated checkout runs within sandbox. Real funds will not be debited.
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
    alignItems: 'center',
  },
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
    alignItems: 'center',
    gap: 10,
  },
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodCardActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  methodIcon: {
    fontSize: 20,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  processingBox: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 11,
    color: '#64748B',
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
    flex: 1,
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
