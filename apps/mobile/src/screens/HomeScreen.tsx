import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { getRoleLabel, isVehicleSideRole } from '../lib/roles'

interface TrialStatus {
  hasSubscription: boolean
  isTrial?: boolean
  trialDaysTotal?: number | null
  trialDaysLeft?: number | null
  trialProgressPercent?: number | null
  expiresAt?: string | null
}



export function HomeScreen() {
  const { user, logout } = useAuth()
  const navigation = useNavigation<any>()
  const [trial, setTrial] = useState<TrialStatus | null>(null)
  const vehicleSide = isVehicleSideRole(user?.role)

  useEffect(() => {
    api.get('/subscriptions/status')
      .then((response) => setTrial(response.data))
      .catch(() => setTrial(null))
  }, [])

  const daysLeft = Math.max(0, trial?.trialDaysLeft ?? 90)
  const trialProgress = Math.max(0, Math.min(100, trial?.trialProgressPercent ?? 100))

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name || user?.phone || 'Guest'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityRole="button" accessibilityLabel="Log out">
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
        </View>

        {trial?.hasSubscription && trial.isTrial && (
          <View style={styles.trialCard} accessibilityLabel={`${daysLeft} days left in your 90 day free trial`}>
            <View style={styles.trialHeader}>
              <View>
                <Text style={styles.trialEyebrow}>FULL MARKETPLACE ACCESS</Text>
                <Text style={styles.trialTitle}>Your 3-month trial is active</Text>
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysNumber}>{daysLeft}</Text>
                <Text style={styles.daysLabel}>DAYS LEFT</Text>
              </View>
            </View>
            <Text style={styles.trialDescription}>Explore every workflow before choosing a plan. No card required today.</Text>
            <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 90, now: daysLeft }}>
              <View style={[styles.progressFill, { width: `${trialProgress}%` }]} />
            </View>
            <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation.navigate('Payments')} accessibilityRole="button" accessibilityLabel="View plans and upgrade when ready">
              <Text style={styles.upgradeButtonText}>Upgrade when you're ready  →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} accessibilityRole="button">
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionText}>{vehicleSide ? 'Find Loads' : 'Find Transporters'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} accessibilityRole="button">
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>{vehicleSide ? 'Register Vehicle' : 'Post Load'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>
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
