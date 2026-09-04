import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import * as Location from 'expo-location'
import { useAuth } from '../contexts/AuthContext'
import { isVehicleSideRole } from '../lib/roles'
import { SUPPORT_PHONE } from '../lib/env'
import { formatDateTime, formatInr } from '../lib/plans'
import { bookingsApi, getApiErrorMessage, paymentsApi, trackingApi } from '../services/api'
import type { BookingStatus, BookingSummary, TrackingStatus } from '../services/types'

const INCIDENT_CATEGORIES = ['Traffic Delay', 'Breakdown', 'Weather', 'RTO Check', 'Other'] as const

const STATUS_LABELS: Record<BookingStatus, string> = {
  Pending: 'Awaiting confirmation',
  Confirmed: 'Confirmed',
  InTransit: 'In transit',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

function isActiveStatus(status: BookingStatus): boolean {
  return status === 'Confirmed' || status === 'InTransit' || status === 'Pending'
}

function shortRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function DriverTripScreen() {
  const { user } = useAuth()
  const vehicleSide = isVehicleSideRole(user?.role)

  const [bookings, setBookings] = useState<BookingSummary[] | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [tracking, setTracking] = useState<TrackingStatus | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null)

  // POD / completion modal
  const [completionModalVisible, setCompletionModalVisible] = useState(false)
  const [consigneeName, setConsigneeName] = useState('')
  const [podNotes, setPodNotes] = useState('')
  const [completionLoading, setCompletionLoading] = useState(false)

  // Incident modal
  const [incidentModalVisible, setIncidentModalVisible] = useState(false)
  const [incidentCategory, setIncidentCategory] = useState<string>(INCIDENT_CATEGORIES[0])
  const [incidentDesc, setIncidentDesc] = useState('')
  const [impactMinutes, setImpactMinutes] = useState('30')
  const [incidentLoading, setIncidentLoading] = useState(false)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // ── Location permission ───────────────────────────────────────────────────

  const checkLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (mounted.current) setLocationPermission(status === 'granted')
    } catch {
      if (mounted.current) setLocationPermission(false)
    }
  }, [])

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(status === 'granted')
      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Checkpoint crossings are verified against your GPS position. Enable location access for LorryCarry in your device settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
          ]
        )
      }
    } catch {
      Alert.alert('Location unavailable', 'Could not request location permission on this device.')
    }
  }, [])

  // ── Data loading ──────────────────────────────────────────────────────────

  const activeBookings = useMemo(
    () => (bookings ?? []).filter((booking) => isActiveStatus(booking.status)),
    [bookings]
  )

  const trip = useMemo(() => {
    if (!bookings) return null
    if (selectedId) {
      const found = bookings.find((booking) => booking.id === selectedId)
      if (found) return found
    }
    return activeBookings[0] ?? null
  }, [bookings, activeBookings, selectedId])

  const loadBookings = useCallback(async () => {
    try {
      const response = await bookingsApi.getMyBookings()
      const list = Array.isArray(response.data) ? response.data : []
      if (!mounted.current) return
      // Most recent first; InTransit trips before Confirmed ones.
      const rank: Record<BookingStatus, number> = { InTransit: 0, Confirmed: 1, Pending: 2, Completed: 3, Cancelled: 4 }
      list.sort((a, b) => rank[a.status] - rank[b.status] || (a.createdAt < b.createdAt ? 1 : -1))
      setBookings(list)
      setBookingsError(null)
    } catch (err) {
      if (!mounted.current) return
      setBookingsError(getApiErrorMessage(err, 'Could not load your trips.'))
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  const loadTracking = useCallback(async (bookingId: string) => {
    setTrackingLoading(true)
    try {
      const response = await trackingApi.getStatus(bookingId)
      if (!mounted.current) return
      setTracking(response.data)
      setTrackingError(null)
    } catch (err) {
      if (!mounted.current) return
      setTracking(null)
      setTrackingError(getApiErrorMessage(err, 'Could not load checkpoint progress.'))
    } finally {
      if (mounted.current) setTrackingLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      checkLocationPermission()
      loadBookings()
    }, [checkLocationPermission, loadBookings])
  )

  useEffect(() => {
    if (trip?.id) {
      loadTracking(trip.id)
    } else {
      setTracking(null)
      setTrackingError(null)
    }
  }, [trip?.id, loadTracking])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await loadBookings()
    if (trip?.id) await loadTracking(trip.id)
    setRefreshing(false)
  }, [loadBookings, loadTracking, trip?.id])

  // ── Derived trip state ────────────────────────────────────────────────────

  const nextCheckpoint = useMemo(() => tracking?.checkpoints.find((cp) => !cp.crossed) ?? null, [tracking])
  const agreedPrice = trip ? Number(trip.agreedPrice) : 0
  const halfAmount = Math.round(agreedPrice * 0.5)
  const isDriverForTrip = Boolean(trip && user && trip.truckOwnerId === user.id)

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleRecordCheckpoint = useCallback(async () => {
    if (!trip || !nextCheckpoint) return
    if (!locationPermission) {
      Alert.alert(
        'Location required',
        'Checkpoints can only be recorded from your current GPS position. Grant location access to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant access', onPress: requestLocationPermission },
        ]
      )
      return
    }

    setActionLoading(true)
    try {
      let position: Location.LocationObject
      try {
        position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      } catch {
        Alert.alert('GPS unavailable', 'Could not read your current location. Move to open sky and try again.')
        return
      }

      const response = await trackingApi.recordCheckpoint(trip.id, {
        checkpointSeq: nextCheckpoint.seq,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })

      // The API answers 200 with success=false when the driver is outside the
      // geofence or the checkpoint was already crossed — do not treat as done.
      if (!response.data?.success) {
        Alert.alert(
          'Checkpoint not recorded',
          response.data?.message || `You are not within the geofence for ${nextCheckpoint.name} yet.`
        )
        return
      }

      Alert.alert('Checkpoint recorded', response.data.message || `${nextCheckpoint.name} marked as crossed.`)
      await Promise.all([loadTracking(trip.id), loadBookings()])
    } catch (err) {
      Alert.alert('Checkpoint not recorded', getApiErrorMessage(err, 'Could not record the checkpoint. Please try again.'))
    } finally {
      if (mounted.current) setActionLoading(false)
    }
  }, [trip, nextCheckpoint, locationPermission, requestLocationPermission, loadTracking, loadBookings])

  const handleStartTrip = useCallback(async () => {
    if (!trip) return
    setActionLoading(true)
    try {
      await bookingsApi.updateStatus(trip.id, 'InTransit')
      Alert.alert('Trip started', 'The cargo owner has been notified that the truck is on its way.')
      await loadBookings()
    } catch (err) {
      Alert.alert('Could not start trip', getApiErrorMessage(err))
    } finally {
      if (mounted.current) setActionLoading(false)
    }
  }, [trip, loadBookings])

  const openCompletionModal = useCallback(() => {
    if (!trip) return
    if (!trip.advanceConfirmed) {
      Alert.alert(
        'Advance not confirmed',
        'The cargo owner must confirm the 50% loading advance before the trip can be completed and the balance released.'
      )
      return
    }
    setCompletionModalVisible(true)
  }, [trip])

  const confirmTripCompletion = useCallback(async () => {
    if (!trip) return
    const name = consigneeName.trim()
    if (!name) {
      Alert.alert('Consignee name required', 'Enter the name of the person who received the goods.')
      return
    }

    setCompletionLoading(true)
    try {
      const response = await paymentsApi.completeTrip({
        bookingId: trip.id,
        podDetails: {
          consigneeName: name,
          deliveryNotes: podNotes.trim() || undefined,
        },
      })

      if (!response.data?.success) {
        Alert.alert('Trip not completed', 'The server did not confirm the completion. Please try again.')
        return
      }

      setCompletionModalVisible(false)
      setConsigneeName('')
      setPodNotes('')

      const { balanceReleased, balanceAmount } = response.data
      Alert.alert(
        'Trip completed',
        balanceReleased
          ? `Balance of ${formatInr(balanceAmount)} has been released. The cargo owner has been asked to rate this trip.`
          : 'Delivery recorded. The balance will be released once the cargo owner confirms receipt.'
      )
      await Promise.all([loadBookings(), loadTracking(trip.id)])
    } catch (err) {
      Alert.alert('Trip not completed', getApiErrorMessage(err, 'Could not complete the trip. Please try again.'))
    } finally {
      if (mounted.current) setCompletionLoading(false)
    }
  }, [trip, consigneeName, podNotes, loadBookings, loadTracking])

  const handleSubmitIncident = useCallback(async () => {
    if (!trip) return
    const description = incidentDesc.trim()
    if (description.length < 5) {
      Alert.alert('Details required', 'Describe the delay or incident in a few words.')
      return
    }
    const minutes = parseInt(impactMinutes, 10)

    setIncidentLoading(true)
    try {
      const response = await trackingApi.reportIncident(trip.id, {
        category: incidentCategory,
        description,
        impactMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
      })
      if (!response.data?.success) {
        Alert.alert('Report not sent', response.data?.message || 'The server did not accept the report.')
        return
      }
      setIncidentModalVisible(false)
      setIncidentDesc('')
      setImpactMinutes('30')
      Alert.alert('Incident reported', response.data.message || 'The cargo owner has been notified of the delay.')
    } catch (err) {
      Alert.alert('Report not sent', getApiErrorMessage(err, 'Could not send the incident report.'))
    } finally {
      if (mounted.current) setIncidentLoading(false)
    }
  }, [trip, incidentCategory, incidentDesc, impactMinutes])

  const callSupport = useCallback(() => {
    if (!SUPPORT_PHONE) {
      Alert.alert('Support line not configured', 'Use the Help tab to reach LorryCarry support.')
      return
    }
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      Alert.alert('Cannot place call', `Dial ${SUPPORT_PHONE} from your phone app.`)
    )
  }, [])

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderTripPicker = () => {
    if (activeBookings.length <= 1) return null
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
        {activeBookings.map((booking) => {
          const selected = booking.id === trip?.id
          return (
            <TouchableOpacity
              key={booking.id}
              style={[styles.pickerChip, selected && styles.pickerChipActive]}
              onPress={() => setSelectedId(booking.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.pickerChipText, selected && styles.pickerChipTextActive]}>
                #{shortRef(booking.id)} · {STATUS_LABELS[booking.status]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  const renderCheckpoints = () => {
    if (trackingLoading && !tracking) {
      return (
        <View style={styles.checkpointBox}>
          <ActivityIndicator size="small" color="#C2410C" />
        </View>
      )
    }
    if (trackingError && !tracking) {
      return (
        <View style={styles.checkpointBox}>
          <Text style={styles.checkpointHeader}>Checkpoint progress unavailable</Text>
          <Text style={styles.checkpointDisclaimer}>{trackingError}</Text>
          <TouchableOpacity onPress={() => trip && loadTracking(trip.id)} accessibilityRole="button">
            <Text style={styles.linkText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }
    if (!tracking) return null

    return (
      <View style={styles.checkpointBox}>
        <View style={styles.rowBetween}>
          <Text style={styles.checkpointHeader}>
            Checkpoints {tracking.crossedCount}/{tracking.totalCheckpoints}
          </Text>
          {tracking.nextCheckpoint?.etaMinutes != null ? (
            <Text style={styles.etaText}>⏱ ETA ~{tracking.nextCheckpoint.etaMinutes} min</Text>
          ) : null}
        </View>
        {nextCheckpoint ? (
          <Text style={styles.checkpointName}>Next: {nextCheckpoint.name}</Text>
        ) : (
          <Text style={styles.checkpointName}>All checkpoints crossed</Text>
        )}
        <View style={styles.checkpointList}>
          {tracking.checkpoints.map((cp) => (
            <View key={cp.seq} style={styles.checkpointItem}>
              <Text style={[styles.checkpointDot, cp.crossed ? styles.checkpointDotDone : styles.checkpointDotPending]}>
                {cp.crossed ? '✓' : String(cp.seq)}
              </Text>
              <View style={styles.flex1}>
                <Text style={[styles.checkpointItemName, cp.crossed && styles.checkpointItemDone]}>{cp.name}</Text>
                {cp.crossedAt ? <Text style={styles.checkpointItemMeta}>{formatDateTime(cp.crossedAt)}</Text> : null}
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.checkpointDisclaimer}>
          Crossings are verified against your GPS position inside each geofence.
        </Text>
      </View>
    )
  }

  const renderTrip = () => {
    if (!trip) return null
    const completed = trip.status === 'Completed'
    const cancelled = trip.status === 'Cancelled'

    return (
      <View style={styles.tripCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.bookingNumber}>Trip #{shortRef(trip.id)}</Text>
          <View style={[styles.statusChip, completed && styles.statusChipCompleted, cancelled && styles.statusChipCancelled]}>
            <Text
              style={[
                styles.statusChipText,
                completed && styles.statusChipTextCompleted,
                cancelled && styles.statusChipTextCancelled,
              ]}
            >
              {STATUS_LABELS[trip.status]}
            </Text>
          </View>
        </View>

        {/* Payment status — mirrors server flags, never assumed */}
        <View style={styles.paymentStatusBox}>
          <Text style={styles.paymentStatusTitle}>Payment status</Text>
          <View style={styles.paymentRow}>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Total freight</Text>
              <Text style={styles.paymentValue}>{formatInr(agreedPrice)}</Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Advance (50%)</Text>
              <Text style={[styles.paymentValue, trip.advanceConfirmed ? styles.paidText : styles.pendingText]}>
                {formatInr(halfAmount)} {trip.advanceConfirmed ? '✓' : '⏳'}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Balance (50%)</Text>
              <Text style={[styles.paymentValue, trip.balanceConfirmed ? styles.paidText : styles.pendingText]}>
                {formatInr(halfAmount)} {trip.balanceConfirmed ? '✓' : '⏳'}
              </Text>
            </View>
          </View>
          {!trip.advanceConfirmed && !completed && !cancelled ? (
            <Text style={styles.paymentHint}>Waiting for the cargo owner to confirm the loading advance.</Text>
          ) : null}
        </View>

        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <Text style={styles.routeIcon}>🟢</Text>
            <View style={styles.routeTextCol}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeVal}>{trip.load?.loadingAddress || 'Address not available'}</Text>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Text style={styles.routeIcon}>🔴</Text>
            <View style={styles.routeTextCol}>
              <Text style={styles.routeLabel}>DESTINATION</Text>
              <Text style={styles.routeVal}>{trip.load?.unloadingAddress || 'Address not available'}</Text>
            </View>
          </View>
          {trip.truck ? (
            <Text style={styles.routeMeta}>
              {trip.truck.registrationNumber} · {trip.truck.bodyType}
              {trip.load?.tonnageRequired ? ` · ${trip.load.tonnageRequired} T` : ''}
            </Text>
          ) : null}
        </View>

        {renderCheckpoints()}

        {!isDriverForTrip ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              You are viewing this trip as the cargo owner. Driver actions are available to the truck owner only.
            </Text>
          </View>
        ) : null}

        {isDriverForTrip && !completed && !cancelled ? (
          <>
            <Text style={styles.sectionHeading}>DRIVER ACTIONS</Text>
            <View style={styles.actionGrid}>
              {trip.status === 'Confirmed' ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnActive]}
                  onPress={handleStartTrip}
                  disabled={actionLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.actionBtnText}>🚀 Start trip</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.actionBtn, styles.checkpointBtn, (!nextCheckpoint || actionLoading) && styles.actionBtnDisabled]}
                onPress={handleRecordCheckpoint}
                disabled={actionLoading || !nextCheckpoint}
                accessibilityRole="button"
                accessibilityLabel={nextCheckpoint ? `Record checkpoint ${nextCheckpoint.name}` : 'All checkpoints crossed'}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#92400E" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    📍 {nextCheckpoint ? `I'm at ${nextCheckpoint.name}` : 'All checkpoints done'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.incidentActionBtn]}
                onPress={() => setIncidentModalVisible(true)}
                disabled={actionLoading}
                accessibilityRole="button"
              >
                <Text style={styles.incidentBtnText}>🚨 Report delay</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.completionSection}>
              <Text style={styles.sectionHeading}>DELIVERY</Text>
              <TouchableOpacity
                style={[styles.completionBtn, !trip.advanceConfirmed && styles.completionBtnDisabled]}
                onPress={openCompletionModal}
                disabled={actionLoading}
                accessibilityRole="button"
              >
                <Text style={styles.completionBtnText}>Submit POD & complete trip</Text>
                <Text style={styles.completionBtnSubtext}>
                  {trip.advanceConfirmed
                    ? `Requests release of the ${formatInr(halfAmount)} balance`
                    : 'Available once the advance is confirmed'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {completed ? (
          <View style={styles.completedBanner}>
            <Text style={styles.completedTitle}>✅ Trip completed</Text>
            <Text style={styles.completedSubtext}>
              {trip.completedAt ? `Delivered ${formatDateTime(trip.completedAt)}. ` : ''}
              {trip.balanceConfirmed
                ? `Balance of ${formatInr(halfAmount)} confirmed.`
                : 'Balance release is pending confirmation from the cargo owner.'}
            </Text>
          </View>
        ) : null}
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>🚛</Text>
      <Text style={styles.emptyTitle}>No active trip</Text>
      <Text style={styles.emptySub}>
        {vehicleSide
          ? 'Confirmed bookings for your trucks will appear here with checkpoint tracking and delivery actions.'
          : 'Driver Mode is for truck owners. Your bookings are listed under My Trips.'}
      </Text>
      {bookings && bookings.length > 0 ? (
        <Text style={styles.emptyHint}>
          {bookings.length} past {bookings.length === 1 ? 'trip is' : 'trips are'} listed under My Trips.
        </Text>
      ) : null}
    </View>
  )

  // ── Screen ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Mode</Text>
          <Text style={styles.headerSub}>Live trip, checkpoints and delivery</Text>
        </View>
        <TouchableOpacity style={styles.supportBadge} onPress={callSupport} accessibilityRole="button">
          <Text style={styles.supportBadgeText}>📞 Support</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#F97316" />}
      >
        <View style={[styles.card, locationPermission ? styles.locationGranted : styles.locationWarning]}>
          <View style={styles.rowBetween}>
            <Text style={styles.locationTitle}>
              {locationPermission ? '📍 Location access enabled' : '⚠️ Location permission needed'}
            </Text>
            {!locationPermission ? (
              <TouchableOpacity style={styles.grantBtn} onPress={requestLocationPermission} accessibilityRole="button">
                <Text style={styles.grantBtnText}>Grant access</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.locationDesc}>
            {locationPermission
              ? 'Your GPS position is used only when you record a checkpoint.'
              : 'Checkpoint crossings are verified against your GPS position and cannot be recorded without it.'}
          </Text>
        </View>

        {loading && !bookings ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading your trips…</Text>
          </View>
        ) : null}

        {bookingsError && !bookings ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Trips unavailable</Text>
            <Text style={styles.errorText}>{bookingsError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadBookings} accessibilityRole="button">
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {bookings ? (
          <>
            {renderTripPicker()}
            {trip ? renderTrip() : renderEmpty()}
          </>
        ) : null}
      </ScrollView>

      {/* Completion / POD modal */}
      <Modal
        visible={completionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !completionLoading && setCompletionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proof of delivery</Text>
            <Text style={styles.modalSub}>
              Recording the delivery completes the trip and asks the cargo owner to release the balance.
            </Text>

            <View style={styles.paymentSummaryBox}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Total freight</Text>
                <Text style={styles.paymentSummaryValue}>{formatInr(agreedPrice)}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Advance (50%)</Text>
                <Text style={[styles.paymentSummaryValue, styles.paidText]}>✓ {formatInr(halfAmount)}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Balance to release</Text>
                <Text style={[styles.paymentSummaryValue, styles.releaseText]}>{formatInr(halfAmount)}</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Consignee (receiver) name *</Text>
            <TextInput
              style={styles.textInput}
              value={consigneeName}
              onChangeText={setConsigneeName}
              placeholder="e.g. Ramesh Kumar, warehouse manager"
              placeholderTextColor="#94A3B8"
              editable={!completionLoading}
            />

            <Text style={styles.inputLabel}>Delivery notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={podNotes}
              onChangeText={setPodNotes}
              placeholder="Seal intact, no damage observed…"
              placeholderTextColor="#94A3B8"
              multiline
              editable={!completionLoading}
            />

            <Text style={styles.helperText}>
              Photo upload for POD is not available in this version. Keep a photo of the signed challan on your phone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setCompletionModalVisible(false)}
                disabled={completionLoading}
                accessibilityRole="button"
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitModalBtn, completionLoading && styles.submitModalBtnDisabled]}
                onPress={confirmTripCompletion}
                disabled={completionLoading}
                accessibilityRole="button"
              >
                {completionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalText}>Complete trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incident modal */}
      <Modal
        visible={incidentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !incidentLoading && setIncidentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report a delay or incident</Text>
            <Text style={styles.modalSub}>The cargo owner is notified immediately.</Text>

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {INCIDENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, incidentCategory === cat && styles.catChipActive]}
                  onPress={() => setIncidentCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: incidentCategory === cat }}
                >
                  <Text style={[styles.catChipText, incidentCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Expected delay (minutes)</Text>
            <TextInput
              style={styles.textInput}
              value={impactMinutes}
              onChangeText={setImpactMinutes}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor="#94A3B8"
              editable={!incidentLoading}
            />

            <Text style={styles.inputLabel}>What happened? *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={incidentDesc}
              onChangeText={setIncidentDesc}
              placeholder="Describe the situation…"
              placeholderTextColor="#94A3B8"
              multiline
              editable={!incidentLoading}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIncidentModalVisible(false)}
                disabled={incidentLoading}
                accessibilityRole="button"
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitModalBtn, styles.incidentSubmitBtn, incidentLoading && styles.submitModalBtnDisabled]}
                onPress={handleSubmitIncident}
                disabled={incidentLoading}
                accessibilityRole="button"
              >
                {incidentLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalText}>Send report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B' },
  supportBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  supportBadgeText: { fontSize: 11, fontWeight: '700', color: '#C2410C' },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  locationGranted: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  locationWarning: { backgroundColor: '#FEFCE8', borderColor: '#FEF08A' },
  locationTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 },
  locationDesc: { fontSize: 11, color: '#475569', lineHeight: 15 },
  grantBtn: { backgroundColor: '#EAB308', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  grantBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  errorCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
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

  pickerRow: { gap: 8, paddingVertical: 2 },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0' },
  pickerChipActive: { backgroundColor: '#F97316' },
  pickerChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  pickerChipTextActive: { color: '#FFFFFF' },

  tripCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderColor: '#E2E8F0', borderWidth: 1, gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bookingNumber: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  statusChip: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusChipCompleted: { backgroundColor: '#DCFCE7' },
  statusChipCancelled: { backgroundColor: '#FEE2E2' },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  statusChipTextCompleted: { color: '#16A34A' },
  statusChipTextCancelled: { color: '#DC2626' },

  paymentStatusBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  paymentStatusTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentItem: { alignItems: 'center', flex: 1 },
  paymentLabel: { fontSize: 9, color: '#64748B', marginBottom: 2 },
  paymentValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  paymentHint: { fontSize: 11, color: '#B45309' },
  paidText: { color: '#16A34A' },
  pendingText: { color: '#F59E0B' },

  routeContainer: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeIcon: { fontSize: 14, marginTop: 2 },
  routeTextCol: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  routeVal: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  routeDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  routeMeta: { fontSize: 11, color: '#64748B' },

  checkpointBox: { backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FFEDD5', gap: 6 },
  checkpointHeader: { fontSize: 11, fontWeight: '800', color: '#C2410C' },
  etaText: { fontSize: 11, fontWeight: '700', color: '#9A3412' },
  checkpointName: { fontSize: 13, fontWeight: '800', color: '#431407' },
  checkpointList: { gap: 6, marginTop: 4 },
  checkpointItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkpointDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  checkpointDotDone: { backgroundColor: '#16A34A', color: '#FFFFFF' },
  checkpointDotPending: { backgroundColor: '#FFFFFF', color: '#9A3412', borderWidth: 1, borderColor: '#FDBA74' },
  checkpointItemName: { fontSize: 12, fontWeight: '700', color: '#431407' },
  checkpointItemDone: { color: '#166534' },
  checkpointItemMeta: { fontSize: 10, color: '#9A3412' },
  checkpointDisclaimer: { fontSize: 10, color: '#9A3412', lineHeight: 14 },
  linkText: { fontSize: 12, fontWeight: '800', color: '#C2410C', marginTop: 4 },

  noticeBox: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12 },
  noticeText: { fontSize: 12, color: '#475569', lineHeight: 17 },

  sectionHeading: { fontSize: 11, fontWeight: '800', color: '#64748B', marginTop: 4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionBtnActive: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#3B82F6' },
  actionBtnDisabled: { opacity: 0.5 },
  checkpointBtn: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' },
  incidentActionBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  incidentBtnText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },

  completionSection: { gap: 8 },
  completionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completionBtnDisabled: { backgroundColor: '#9CA3AF' },
  completionBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  completionBtnSubtext: { fontSize: 11, fontWeight: '600', color: '#D1FAE5', marginTop: 2, textAlign: 'center' },
  completedBanner: { backgroundColor: '#DCFCE7', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#86EFAC' },
  completedTitle: { fontSize: 14, fontWeight: '800', color: '#15803D', marginBottom: 4 },
  completedSubtext: { fontSize: 11, color: '#166534', lineHeight: 16 },

  loadingBox: { padding: 20, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#64748B' },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 16, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 17 },
  emptyHint: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 11, color: '#64748B', lineHeight: 15 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginTop: 4 },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: { height: 72, textAlignVertical: 'top' },
  helperText: { fontSize: 10, color: '#94A3B8', lineHeight: 14 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F1F5F9' },
  catChipActive: { backgroundColor: '#F97316' },
  catChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  catChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelModalText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  submitModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  submitModalBtnDisabled: { opacity: 0.7 },
  submitModalText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  incidentSubmitBtn: { backgroundColor: '#EF4444' },

  paymentSummaryBox: { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0', gap: 4 },
  paymentSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentSummaryLabel: { fontSize: 11, color: '#475569' },
  paymentSummaryValue: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  releaseText: { color: '#16A34A' },
})
