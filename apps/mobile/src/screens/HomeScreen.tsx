import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { bookingsApi, getApiErrorMessage } from '../services/api'
import type { BookingSummary } from '../services/types'
import { getRoleLabel, isVehicleSideRole } from '../lib/roles'
import { useSubscription } from '../hooks/useSubscription'
import { formatDate, getPlanLabel } from '../lib/plans'

interface ActivityCounts {
  active: number
  completed: number
  cancelled: number
}

const EMPTY_COUNTS: ActivityCounts = { active: 0, completed: 0, cancelled: 0 }

function countBookings(bookings: BookingSummary[]): ActivityCounts {
  return bookings.reduce<ActivityCounts>(
    (acc, booking) => {
      if (booking.status === 'Completed') acc.completed += 1
      else if (booking.status === 'Cancelled') acc.cancelled += 1
      else acc.active += 1
      return acc
    },
    { ...EMPTY_COUNTS }
  )
}

export function HomeScreen() {
  const { user, logout } = useAuth()
  const navigation = useNavigation<any>()
  const vehicleSide = isVehicleSideRole(user?.role)

  const { entitlement, loading: entitlementLoading, error: entitlementError, refresh: refreshEntitlement } =
    useSubscription({ autoLoad: false })

  const [counts, setCounts] = useState<ActivityCounts | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadCounts = useCallback(async () => {
    try {
      const response = await bookingsApi.getMyBookings()
      setCounts(countBookings(Array.isArray(response.data) ? response.data : []))
      setCountsError(null)
    } catch (err) {
      setCountsError(getApiErrorMessage(err, 'Could not load your trips.'))
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshEntitlement({ silent: true })
      loadCounts()
    }, [refreshEntitlement, loadCounts])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshEntitlement({ silent: true }), loadCounts()])
    setRefreshing(false)
  }, [refreshEntitlement, loadCounts])

  // Progress is derived locally from server-provided day counts; the API does
  // not return a percentage.
  const trialProgress = useMemo(() => {
    if (!entitlement) return 0
    const total = entitlement.trialDurationDays || 90
    const remaining = Math.max(0, Math.min(total, entitlement.trialDaysRemaining))
    return Math.round((remaining / total) * 100)
  }, [entitlement])

  const trialDaysRemaining = Math.max(0, entitlement?.trialDaysRemaining ?? 0)
  const trialDurationDays = entitlement?.trialDurationDays ?? 90

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name || user?.phone || 'Guest'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              logout()
            }}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
        </View>

        {/* Entitlement */}
        {entitlementLoading && !entitlement ? (
          <View style={styles.entitlementLoading}>
            <ActivityIndicator color="#F97316" />
            <Text style={styles.entitlementLoadingText}>Checking your access…</Text>
          </View>
        ) : null}

        {!entitlementLoading && !entitlement && entitlementError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Access status unavailable</Text>
            <Text style={styles.errorText}>{entitlementError}</Text>
            <TouchableOpacity
              onPress={() => refreshEntitlement()}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry loading access status"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {entitlement?.status === 'trial' && entitlement.isTrialActive ? (
          <View
            style={styles.trialCard}
            accessibilityLabel={`${trialDaysRemaining} days left in your ${trialDurationDays} day free trial`}
          >
            <View style={styles.trialHeader}>
              <View style={styles.trialHeaderText}>
                <Text style={styles.trialEyebrow}>FULL MARKETPLACE ACCESS</Text>
                <Text style={styles.trialTitle}>Your free trial is active</Text>
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysNumber}>{trialDaysRemaining}</Text>
                <Text style={styles.daysLabel}>{trialDaysRemaining === 1 ? 'DAY LEFT' : 'DAYS LEFT'}</Text>
              </View>
            </View>
            <Text style={styles.trialDescription}>
              Explore every workflow before choosing a plan. Trial ends {formatDate(entitlement.trialEndsAt)}.
            </Text>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: trialDurationDays, now: trialDaysRemaining }}
            >
              <View style={[styles.progressFill, { width: `${trialProgress}%` }]} />
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Payments')}
              accessibilityRole="button"
              accessibilityLabel="View plans and upgrade when ready"
            >
              <Text style={styles.upgradeButtonText}>Upgrade when you're ready  →</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {entitlement?.status === 'active' ? (
          <View style={styles.activeCard} accessibilityLabel="Your subscription is active">
            <View style={styles.trialHeader}>
              <View style={styles.trialHeaderText}>
                <Text style={styles.activeEyebrow}>SUBSCRIPTION ACTIVE</Text>
                <Text style={styles.activeTitle}>{getPlanLabel(entitlement.plan)}</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.activeDescription}>
              Unlimited contact reveals and bookings until {formatDate(entitlement.expiresAt)}.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Payments')}
              accessibilityRole="button"
              accessibilityLabel="Manage subscription"
            >
              <Text style={styles.activeLink}>Manage subscription  →</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {entitlement?.status === 'expired' ? (
          <View style={styles.expiredCard} accessibilityLabel="Your trial has ended">
            <Text style={styles.expiredEyebrow}>ACCESS LIMITED</Text>
            <Text style={styles.expiredTitle}>
              {entitlement.upgradeReason === 'trial_expired' ? 'Your free trial has ended' : 'Your plan has expired'}
            </Text>
            <Text style={styles.expiredDescription}>
              You can still browse, but contact reveals and new bookings need an active plan.
            </Text>
            <TouchableOpacity
              style={styles.expiredButton}
              onPress={() => navigation.navigate('Payments')}
              accessibilityRole="button"
              accessibilityLabel="Choose a plan"
            >
              <Text style={styles.expiredButtonText}>Choose a plan</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              accessibilityRole="button"
              onPress={() => navigation.navigate(vehicleSide ? 'Driver Mode' : 'My Trips')}
            >
              <Text style={styles.actionIcon}>{vehicleSide ? '🚚' : '📦'}</Text>
              <Text style={styles.actionText}>{vehicleSide ? 'Driver Mode' : 'My Trips'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              accessibilityRole="button"
              onPress={() => navigation.navigate('Payments')}
            >
              <Text style={styles.actionIcon}>💳</Text>
              <Text style={styles.actionText}>Plans & Payments</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Trips</Text>
          {countsError && !counts ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{countsError}</Text>
              <TouchableOpacity onPress={loadCounts} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{counts ? counts.active : '–'}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{counts ? counts.completed : '–'}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{counts ? counts.cancelled : '–'}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 14, color: '#64748B' },
  name: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#F97316', fontSize: 14, fontWeight: '600' },
  roleBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  roleText: { color: '#C2410C', fontSize: 13, fontWeight: '700' },

  entitlementLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  entitlementLoadingText: { fontSize: 13, color: '#64748B' },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 6,
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  errorText: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  retryBtn: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' },
  retryText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },

  trialCard: {
    borderRadius: 18,
    padding: 17,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 24,
  },
  trialHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  trialHeaderText: { flex: 1 },
  trialEyebrow: { fontSize: 9, color: '#C2410C', letterSpacing: 1, fontWeight: '800' },
  trialTitle: { fontSize: 17, color: '#7C2D12', fontWeight: '800', marginTop: 4 },
  daysBadge: {
    minWidth: 68,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  daysNumber: { fontSize: 20, color: '#EA580C', fontWeight: '800', lineHeight: 22 },
  daysLabel: { fontSize: 8, color: '#9A3412', fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
  trialDescription: { fontSize: 12, color: '#9A3412', opacity: 0.85, lineHeight: 18, marginTop: 12 },
  progressTrack: { height: 7, borderRadius: 8, backgroundColor: '#FED7AA', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 8 },
  upgradeButton: { alignSelf: 'flex-start', marginTop: 13, paddingVertical: 4 },
  upgradeButtonText: { color: '#C2410C', fontSize: 13, fontWeight: '800' },

  activeCard: {
    borderRadius: 18,
    padding: 17,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  activeEyebrow: { fontSize: 9, color: '#FDBA74', letterSpacing: 1, fontWeight: '800' },
  activeTitle: { fontSize: 17, color: '#FFFFFF', fontWeight: '800', marginTop: 4 },
  activeBadge: { alignSelf: 'flex-start', backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  activeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  activeDescription: { fontSize: 12, color: '#CBD5E1', lineHeight: 18, marginTop: 12 },
  activeLink: { color: '#FDBA74', fontSize: 13, fontWeight: '800' },

  expiredCard: {
    borderRadius: 18,
    padding: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 24,
  },
  expiredEyebrow: { fontSize: 9, color: '#B45309', letterSpacing: 1, fontWeight: '800' },
  expiredTitle: { fontSize: 17, color: '#0F172A', fontWeight: '800', marginTop: 4 },
  expiredDescription: { fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 8 },
  expiredButton: { alignSelf: 'flex-start', marginTop: 14, backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  expiredButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  actionsContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: '500', color: '#0F172A', textAlign: 'center' },
  statsContainer: { marginBottom: 24 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#F97316' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
})
