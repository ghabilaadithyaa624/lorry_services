import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { useAuth } from '../contexts/AuthContext'
import { bookingsApi, getApiErrorMessage } from '../services/api'
import type { BookingSummary } from '../services/types'
import { WEB_URL } from '../config'
import { getRoleLabel, isTransporterRole, isVehicleSideRole } from '../lib/roles'

interface BookingStats {
  active: number
  completed: number
  cancelled: number
}

const EMPTY_STATS: BookingStats = { active: 0, completed: 0, cancelled: 0 }

function summarise(bookings: BookingSummary[]): BookingStats {
  return bookings.reduce<BookingStats>((acc, booking) => {
    if (booking.status === 'Completed') acc.completed += 1
    else if (booking.status === 'Cancelled') acc.cancelled += 1
    else acc.active += 1
    return acc
  }, { ...EMPTY_STATS })
}

export function HomeScreen() {
  const { user, logout, entitlement, entitlementLoading, entitlementError, refreshEntitlement } = useAuth()
  const navigation = useNavigation<any>()
  const vehicleSide = isVehicleSideRole(user?.role)
  // Transporters see the freight-side handoff by default, but their quick
  // actions cover both posting and listing.
  const transporter = isTransporterRole(user?.role)

  const [stats, setStats] = useState<BookingStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    setStatsError(null)
    try {
      const { data } = await bookingsApi.getMyBookings()
      setStats(summarise(Array.isArray(data) ? data : []))
    } catch (error) {
      setStats(null)
      setStatsError(getApiErrorMessage(error, 'Could not load your booking activity.'))
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshEntitlement(), fetchStats()])
    } finally {
      setRefreshing(false)
    }
  }, [refreshEntitlement, fetchStats])

  const handleLogout = () => {
    Alert.alert('Log out', 'You will need your OTP to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { void logout() } },
    ])
  }

  /**
   * Load posting and truck registration are web-only workflows today. Rather
   * than showing a dead button, hand the user off to the LorryCarry web app.
   */
  const openOnWeb = async (path: string, label: string) => {
    const url = `${WEB_URL}${path}`
    try {
      const supported = await Linking.canOpenURL(url)
      if (!supported) throw new Error('unsupported')
      await Linking.openURL(url)
    } catch {
      Alert.alert(
        `${label} unavailable`,
        'We could not open your browser. Please visit the LorryCarry web app to continue.',
      )
    }
  }

  const trialActive = entitlement?.isTrialActive === true
  const daysLeft = Math.max(0, entitlement?.trialDaysRemaining ?? 0)
  const trialDuration = entitlement?.trialDurationDays || 90
  const trialProgress = Math.max(0, Math.min(100, Math.round((daysLeft / trialDuration) * 100)))

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name || user?.phone || 'Guest'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} accessibilityRole="button" accessibilityLabel="Log out">
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
        </View>

        {entitlementError ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{entitlementError}</Text>
            <TouchableOpacity onPress={onRefresh} accessibilityRole="button">
              <Text style={styles.noticeAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {trialActive && (
          <View style={styles.trialCard} accessibilityLabel={`${daysLeft} days left in your free trial`}>
            <View style={styles.trialHeader}>
              <View style={styles.trialHeaderText}>
                <Text style={styles.trialEyebrow}>FULL MARKETPLACE ACCESS</Text>
                <Text style={styles.trialTitle}>Your free trial is active</Text>
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysNumber}>{daysLeft}</Text>
                <Text style={styles.daysLabel}>DAYS LEFT</Text>
              </View>
            </View>
            <Text style={styles.trialDescription}>Explore every workflow before choosing a plan. No card required today.</Text>
            <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: trialDuration, now: daysLeft }}>
              <View style={[styles.progressFill, { width: `${trialProgress}%` }]} />
            </View>
            <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation.navigate('Payments')} accessibilityRole="button" accessibilityLabel="View plans and upgrade when ready">
              <Text style={styles.upgradeButtonText}>Upgrade when you&apos;re ready  →</Text>
            </TouchableOpacity>
          </View>
        )}

        {!entitlementLoading && entitlement?.upgradeRequired && (
          <View style={styles.expiredCard}>
            <Text style={styles.trialEyebrow}>ACCESS RESTRICTED</Text>
            <Text style={styles.expiredTitle}>Your free trial has ended</Text>
            <Text style={styles.trialDescription}>
              Contact reveals, direct calls and booking triggers need an active pass.
            </Text>
            <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation.navigate('Payments')} accessibilityRole="button">
              <Text style={styles.upgradeButtonText}>See plans  →</Text>
            </TouchableOpacity>
          </View>
        )}

        {entitlement?.hasSubscription && (
          <View style={styles.activePassCard}>
            <Text style={styles.trialEyebrow}>ACTIVE PASS</Text>
            <Text style={styles.expiredTitle}>
              {entitlement.plan ? entitlement.plan.charAt(0).toUpperCase() + entitlement.plan.slice(1) : 'Unlimited'} access
            </Text>
            <Text style={styles.trialDescription}>
              Valid until{' '}
              {entitlement.expiresAt
                ? new Date(entitlement.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </Text>
          </View>
        )}

        {/* Quick Actions. Each card hands off to the matching web flow; a
            transporter runs both sides, so they get one action per side. */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              accessibilityRole="button"
              onPress={() =>
                openOnWeb(
                  transporter ? '/post-load' : vehicleSide ? '/need-load' : '/search',
                  transporter ? 'Post load' : vehicleSide ? 'Find loads' : 'Find transporters',
                )
              }
            >
              <Text style={styles.actionIcon}>{transporter ? '📦' : '🔍'}</Text>
              <Text style={styles.actionText}>{transporter ? 'Post Freight Load' : vehicleSide ? 'Find Loads' : 'Find Transporters'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              accessibilityRole="button"
              onPress={() =>
                openOnWeb(
                  transporter ? '/need-vehicle' : vehicleSide ? '/my-trucks' : '/post-load',
                  transporter ? 'List a truck' : vehicleSide ? 'Register vehicle' : 'Post load',
                )
              }
            >
              <Text style={styles.actionIcon}>{transporter ? '🚛' : '➕'}</Text>
              <Text style={styles.actionText}>{transporter ? 'List a Truck' : vehicleSide ? 'Register Vehicle' : 'Post Load'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          {statsError ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>{statsError}</Text>
              <TouchableOpacity onPress={onRefresh} accessibilityRole="button">
                <Text style={styles.noticeAction}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : stats === null ? (
            <ActivityIndicator color="#F97316" style={styles.statsLoader} />
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.active}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.cancelled}</Text>
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
  roleBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 18 },
  roleText: { color: '#C2410C', fontSize: 13, fontWeight: '700' },
  noticeCard: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  noticeText: { fontSize: 12, color: '#B91C1C', lineHeight: 17 },
  noticeAction: { fontSize: 12, fontWeight: '800', color: '#B91C1C' },
  trialHeaderText: { flex: 1 },
  expiredCard: { borderRadius: 18, padding: 17, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', marginBottom: 24 },
  expiredTitle: { fontSize: 17, color: '#7C2D12', fontWeight: '800', marginTop: 4 },
  activePassCard: { borderRadius: 18, padding: 17, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 24 },
  statsLoader: { marginVertical: 16 },
  trialCard: { borderRadius: 18, padding: 17, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', marginBottom: 24 },
  trialHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  trialEyebrow: { fontSize: 9, color: '#C2410C', letterSpacing: 1, fontWeight: '800' },
  trialTitle: { fontSize: 17, color: '#7C2D12', fontWeight: '800', marginTop: 4 },
  daysBadge: { minWidth: 68, borderRadius: 12, backgroundColor: '#FFFFFF', paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center' },
  daysNumber: { fontSize: 20, color: '#EA580C', fontWeight: '800', lineHeight: 22 },
  daysLabel: { fontSize: 8, color: '#9A3412', fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
  trialDescription: { fontSize: 12, color: '#9A3412', opacity: 0.85, lineHeight: 18, marginTop: 12 },
  progressTrack: { height: 7, borderRadius: 8, backgroundColor: '#FED7AA', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 8 },
  upgradeButton: { alignSelf: 'flex-start', marginTop: 13, paddingVertical: 4 },
  upgradeButtonText: { color: '#C2410C', fontSize: 13, fontWeight: '800' },
  actionsContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: '500', color: '#0F172A', textAlign: 'center' },
  statsContainer: { marginBottom: 24 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#F97316' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
})
