import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { bookingsApi, getApiErrorMessage } from '../services/api'
import type { BookingStatus, BookingSummary } from '../services/types'

type Tab = 'active' | 'completed'

const ACTIVE_STATUSES: BookingStatus[] = ['Pending', 'Confirmed', 'InTransit']

const STATUS_COPY: Record<BookingStatus, { label: string; tone: 'info' | 'progress' | 'done' | 'muted' }> = {
  Pending: { label: 'Awaiting confirmation', tone: 'info' },
  Confirmed: { label: 'Confirmed', tone: 'info' },
  InTransit: { label: 'In transit', tone: 'progress' },
  Completed: { label: 'Completed', tone: 'done' },
  Cancelled: { label: 'Cancelled', tone: 'muted' },
}

function formatPrice(value: string | number | undefined): string {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  if (!Number.isFinite(numeric as number)) return '—'
  return `₹${(numeric as number).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function MyTripScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setError(null)
    try {
      const { data } = await bookingsApi.getMyBookings()
      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      setBookings([])
      setError(getApiErrorMessage(err, 'Could not load your trips.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(
    () =>
      bookings.filter((booking) =>
        activeTab === 'active'
          ? ACTIVE_STATUSES.includes(booking.status)
          : booking.status === 'Completed' || booking.status === 'Cancelled',
      ),
    [bookings, activeTab],
  )

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Could not load trips</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => load(true)} accessibilityRole="button">
            <Text style={styles.emptyButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>No {activeTab} trips</Text>
        <Text style={styles.emptyText}>
          {activeTab === 'active'
            ? 'Bookings you create or accept will show up here with live status.'
            : 'Your completed and cancelled trips will appear here.'}
        </Text>
      </View>
    )
  }

  const renderBooking = ({ item }: { item: BookingSummary }) => {
    const status = STATUS_COPY[item.status] ?? { label: item.status, tone: 'muted' as const }
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.bookingRef}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          <View
            style={[
              styles.statusPill,
              status.tone === 'progress' && styles.statusProgress,
              status.tone === 'done' && styles.statusDone,
              status.tone === 'muted' && styles.statusMuted,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                status.tone === 'progress' && styles.statusProgressText,
                status.tone === 'done' && styles.statusDoneText,
                status.tone === 'muted' && styles.statusMutedText,
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.route} numberOfLines={2}>
          {item.load?.loadingAddress || 'Pickup pending'} → {item.load?.unloadingAddress || 'Drop pending'}
        </Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>AGREED PRICE</Text>
            <Text style={styles.metaValue}>{formatPrice(item.agreedPrice)}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>ADVANCE</Text>
            <Text style={styles.metaValue}>{item.advanceConfirmed ? 'Released' : 'Pending'}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>BALANCE</Text>
            <Text style={styles.metaValue}>{item.balanceConfirmed ? 'Released' : 'Pending'}</Text>
          </View>
        </View>

        {item.truck?.registrationNumber ? (
          <Text style={styles.truckLine}>
            🚛 {item.truck.registrationNumber}
            {item.truck.bodyType ? ` · ${item.truck.bodyType}` : ''}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'active' }}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'completed' }}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={visible.length === 0 ? styles.content : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  tabContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#E2E8F0' },
  activeTab: { backgroundColor: '#F97316' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  activeTabText: { color: '#FFFFFF' },
  content: { flexGrow: 1 },
  listContent: { padding: 16, paddingTop: 0, gap: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyButton: { backgroundColor: '#F97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingRef: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  statusPill: { backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusProgress: { backgroundColor: '#FFEDD5' },
  statusDone: { backgroundColor: '#DCFCE7' },
  statusMuted: { backgroundColor: '#E2E8F0' },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  statusProgressText: { color: '#C2410C' },
  statusDoneText: { color: '#15803D' },
  statusMutedText: { color: '#64748B' },
  route: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  truckLine: { fontSize: 12, color: '#64748B' },
})
