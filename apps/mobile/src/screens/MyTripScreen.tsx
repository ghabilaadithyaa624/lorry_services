import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { isVehicleSideRole, normalizeRole } from '../lib/roles'
import { formatDate, formatInr } from '../lib/plans'
import { bookingsApi, getApiErrorMessage } from '../services/api'
import type { BookingStatus, BookingSummary } from '../services/types'

type Tab = 'active' | 'completed'

const STATUS_LABELS: Record<BookingStatus, string> = {
  Pending: 'Awaiting confirmation',
  Confirmed: 'Confirmed',
  InTransit: 'In transit',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

const ACTIVE_STATUSES: BookingStatus[] = ['Pending', 'Confirmed', 'InTransit']

function shortRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function MyTripScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const vehicleSide = isVehicleSideRole(user?.role)
  const isFactoryOwner = normalizeRole(user?.role) === 'factory_owner'

  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [bookings, setBookings] = useState<BookingSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await bookingsApi.getMyBookings()
      const list = Array.isArray(response.data) ? response.data : []
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      setBookings(list)
      setError(null)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load your trips.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const visible = useMemo(() => {
    if (!bookings) return []
    return bookings.filter((booking) =>
      activeTab === 'active' ? ACTIVE_STATUSES.includes(booking.status) : !ACTIVE_STATUSES.includes(booking.status)
    )
  }, [bookings, activeTab])

  const counts = useMemo(() => {
    const all = bookings ?? []
    const active = all.filter((b) => ACTIVE_STATUSES.includes(b.status)).length
    return { active, completed: all.length - active }
  }, [bookings])

  // Factory owners confirm the 50% milestones from the API's dedicated routes.
  const confirmMilestone = useCallback(
    (booking: BookingSummary, milestone: 'advance' | 'balance') => {
      const half = formatInr(Math.round(Number(booking.agreedPrice) * 0.5))
      Alert.alert(
        milestone === 'advance' ? 'Confirm advance paid?' : 'Confirm balance released?',
        milestone === 'advance'
          ? `Confirm that you have paid the ${half} loading advance for trip #${shortRef(booking.id)}. The driver will be notified and can start the trip.`
          : `Confirm that you have released the ${half} balance for trip #${shortRef(booking.id)} after receiving the goods.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              setConfirmingId(booking.id)
              try {
                if (milestone === 'advance') await bookingsApi.confirmAdvance(booking.id)
                else await bookingsApi.confirmBalance(booking.id)
                await load()
              } catch (err) {
                Alert.alert('Not confirmed', getApiErrorMessage(err, 'Could not update the payment milestone.'))
              } finally {
                setConfirmingId(null)
              }
            },
          },
        ]
      )
    },
    [load]
  )

  const renderItem = ({ item }: { item: BookingSummary }) => {
    const price = Number(item.agreedPrice)
    const half = Math.round(price * 0.5)
    const completed = item.status === 'Completed'
    const cancelled = item.status === 'Cancelled'
    const busy = confirmingId === item.id

    const canConfirmAdvance = isFactoryOwner && !item.advanceConfirmed && !cancelled
    const canConfirmBalance = isFactoryOwner && item.advanceConfirmed && !item.balanceConfirmed && !cancelled

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.flex1}>
            <Text style={styles.ref}>Trip #{shortRef(item.id)}</Text>
            <Text style={styles.date}>Booked {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusChip, completed && styles.statusChipDone, cancelled && styles.statusChipCancelled]}>
            <Text style={[styles.statusText, completed && styles.statusTextDone, cancelled && styles.statusTextCancelled]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.route}>
          <View style={styles.routeRow}>
            <Text style={styles.routeDot}>🟢</Text>
            <Text style={styles.routeText} numberOfLines={2}>
              {item.load?.loadingAddress || 'Pickup address unavailable'}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.routeDot}>🔴</Text>
            <Text style={styles.routeText} numberOfLines={2}>
              {item.load?.unloadingAddress || 'Drop address unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {item.truck ? (
            <Text style={styles.meta}>
              🚛 {item.truck.registrationNumber} · {item.truck.bodyType}
            </Text>
          ) : null}
          {item.load?.tonnageRequired ? <Text style={styles.meta}>⚖️ {item.load.tonnageRequired} T</Text> : null}
        </View>

        <View style={styles.paymentRow}>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Agreed price</Text>
            <Text style={styles.paymentValue}>{formatInr(price)}</Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Advance 50%</Text>
            <Text style={[styles.paymentValue, item.advanceConfirmed ? styles.paid : styles.pending]}>
              {formatInr(half)} {item.advanceConfirmed ? '✓' : '⏳'}
            </Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>Balance 50%</Text>
            <Text style={[styles.paymentValue, item.balanceConfirmed ? styles.paid : styles.pending]}>
              {formatInr(half)} {item.balanceConfirmed ? '✓' : '⏳'}
            </Text>
          </View>
        </View>

        {canConfirmAdvance || canConfirmBalance ? (
          <TouchableOpacity
            style={[styles.confirmBtn, busy && styles.confirmBtnDisabled]}
            onPress={() => confirmMilestone(item, canConfirmAdvance ? 'advance' : 'balance')}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>
                {canConfirmAdvance ? 'I have paid the advance' : 'I have released the balance'}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        {!isFactoryOwner && !item.advanceConfirmed && !cancelled && !completed ? (
          <Text style={styles.hint}>Waiting for the cargo owner to confirm the loading advance.</Text>
        ) : null}

        {vehicleSide && !completed && !cancelled ? (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Driver Mode')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Open in Driver Mode →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    )
  }

  const renderEmptyState = () => {
    if (loading && !bookings) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.emptyText}>Loading your trips…</Text>
        </View>
      )
    }
    if (error && !bookings) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Trips unavailable</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={load} accessibilityRole="button">
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
            ? vehicleSide
              ? 'Bookings for your trucks will appear here once a cargo owner confirms one.'
              : 'Bookings you create from the LorryCarry website will appear here.'
            : 'Completed and cancelled trips will appear here.'}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        {(
          [
            ['active', `Active${bookings ? ` (${counts.active})` : ''}`],
            ['completed', `History${bookings ? ` (${counts.completed})` : ''}`],
          ] as Array<[Tab, string]>
        ).map(([tab, label]) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[styles.content, visible.length === 0 && styles.contentEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#F97316' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#F97316' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  contentEmpty: { flexGrow: 1 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ref: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusChip: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusChipDone: { backgroundColor: '#DCFCE7' },
  statusChipCancelled: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  statusTextDone: { color: '#16A34A' },
  statusTextCancelled: { color: '#DC2626' },

  route: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDot: { fontSize: 12, marginTop: 1 },
  routeText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1E293B', lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  meta: { fontSize: 11, color: '#64748B' },

  paymentRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentCol: { flex: 1, alignItems: 'center' },
  paymentLabel: { fontSize: 9, color: '#64748B', marginBottom: 2 },
  paymentValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  paid: { color: '#16A34A' },
  pending: { color: '#F59E0B' },

  confirmBtn: { backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  secondaryBtnText: { color: '#C2410C', fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 11, color: '#B45309' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyButton: { marginTop: 8, backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})
