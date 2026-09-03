import React, { useEffect, useMemo, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { notificationsApi, type NotificationItem } from '../services/api'

const CATEGORY_LABELS: Record<NotificationItem['category'], string> = {
  BOOKING: 'Booking',
  LOAD: 'Load',
  TRUCK: 'Fleet',
  PAYMENT: 'Payment',
  KYC: 'Verification',
  TRACKING: 'Tracking',
  SYSTEM: 'System',
}

function timeAgo(input: string): string {
  const diff = Date.now() - new Date(input).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      const res = await notificationsApi.getNotifications()
      setItems(res.data?.notifications || [])
    } catch {
      setError('Could not load notifications. Pull down to retry.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const markRead = async (item: NotificationItem) => {
    if (item.read) return
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
    try {
      await notificationsApi.markRead(item.id)
    } catch {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: false } : n)))
    }
  }

  const markAllRead = async () => {
    if (unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await notificationsApi.markAllRead()
    } catch {
      await load(false)
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.markAllBtn, unreadCount === 0 && styles.markAllDisabled]}
          onPress={markAllRead}
          disabled={unreadCount === 0 || markingAll}
        >
          <Text style={styles.markAllText}>Mark all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
        >
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : items.length === 0 ? (
            <Text style={styles.empty}>
              Booking, dispatch, delivery and checkpoint alerts will appear here.
            </Text>
          ) : (
            items.map((item) => {
              const isWhatsapp = item.channel === 'whatsapp'
              const sent =
                item.providerStatus === 'sent' || item.providerStatus === 'Delivered'
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, !item.read && styles.unreadCard]}
                  activeOpacity={0.8}
                  onPress={() => markRead(item)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.category}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Text>
                    {isWhatsapp && (
                      <Text style={[styles.whatsapp, sent && styles.whatsappSent]}>
                        WhatsApp {sent ? '✓' : item.providerStatus === 'failed' ? 'failed' : 'off'}
                      </Text>
                    )}
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.message}</Text>
                  <Text style={styles.time}>{timeAgo(item.timestamp)}</Text>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  markAllBtn: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  markAllDisabled: { opacity: 0.5 },
  markAllText: { color: '#F97316', fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#B91C1C', fontSize: 14, marginBottom: 12 },
  empty: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  category: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  whatsapp: { fontSize: 11, color: '#64748B' },
  whatsappSent: { color: '#16A34A' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  cardMessage: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 19 },
  time: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
})
