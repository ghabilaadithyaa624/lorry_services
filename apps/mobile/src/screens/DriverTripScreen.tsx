import React, { useCallback, useEffect, useState } from 'react'
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
  Linking,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'

import { bookingsApi, getApiErrorMessage, paymentsApi, trackingApi } from '../services/api'
import { SUPPORT_PHONE } from '../config'
import type { BookingStatus, BookingSummary } from '../services/types'

/**
 * Driver-facing view of the single active booking.
 *
 * All state shown here comes from the API (`/bookings/my-bookings`,
 * `/tracking/:bookingId`). Nothing is fabricated: when there is no active trip
 * or a request fails, the screen says so instead of rendering a sample trip.
 */
export interface DriverTripDetails {
  id: string
  bookingNumber: string
  pickupAddress: string
  destinationAddress: string
  status: BookingStatus
  /** Checkpoint progress from the tracking API; null when unavailable. */
  nextCheckpointName: string | null
  etaMinutes: number | null
  checkpointSeq: number
  totalCheckpoints: number
  agreedPrice: number | null
  advanceConfirmed: boolean
  balanceConfirmed: boolean
}

const ACTIVE_STATUSES: BookingStatus[] = ['Pending', 'Confirmed', 'InTransit']

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isFinite(numeric) ? numeric : null
}

export function DriverTripScreen() {
  const [trip, setTrip] = useState<DriverTripDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null)

  // POD Modal State
  const [podModalVisible, setPodModalVisible] = useState(false)
  const [consigneeName, setConsigneeName] = useState('')
  const [podNotes, setPodNotes] = useState('')

  // Incident Modal State
  const [incidentModalVisible, setIncidentModalVisible] = useState(false)
  const [incidentCategory, setIncidentCategory] = useState('Traffic Delay')
  const [incidentDesc, setIncidentDesc] = useState('')
  const [impactMinutes, setImpactMinutes] = useState('30')

  // Trip Completion Modal State
  const [completionModalVisible, setCompletionModalVisible] = useState(false)
  const [completionLoading, setCompletionLoading] = useState(false)

  const checkLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      setLocationPermission(status === 'granted')
    } catch {
      setLocationPermission(false)
    }
  }, [])

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(status === 'granted')
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Location access is needed to record geofence checkpoints. You can enable it later in your device settings.',
        )
      }
    } catch {
      Alert.alert('Permission error', 'Could not request location permission on this device.')
    }
  }

  const mapBooking = useCallback(async (booking: BookingSummary): Promise<DriverTripDetails> => {
    let nextCheckpointName: string | null = null
    let etaMinutes: number | null = null
    let checkpointSeq = 1
    let totalCheckpoints = 0

    // Checkpoint progress is optional context — never block the trip card on it.
    try {
      const { data } = await trackingApi.get(booking.id)
      const checkpoints = data?.checkpoints ?? []
      totalCheckpoints = checkpoints.length
      const nextCheckpoint = checkpoints.find((c) => !c.reachedAt)
      if (nextCheckpoint) {
        nextCheckpointName = nextCheckpoint.name ?? `Checkpoint ${nextCheckpoint.checkpointSeq}`
        checkpointSeq = nextCheckpoint.checkpointSeq
      } else if (totalCheckpoints > 0) {
        checkpointSeq = totalCheckpoints
      }
      etaMinutes = data?.etaMinutes ?? null
    } catch {
      // Tracking unavailable — the card renders without checkpoint details.
    }

    return {
      id: booking.id,
      bookingNumber: booking.id.slice(0, 8).toUpperCase(),
      pickupAddress: booking.load?.loadingAddress || 'Pickup address not available',
      destinationAddress: booking.load?.unloadingAddress || 'Destination address not available',
      status: booking.status,
      nextCheckpointName,
      etaMinutes,
      checkpointSeq,
      totalCheckpoints,
      agreedPrice: toNumber(booking.agreedPrice),
      advanceConfirmed: booking.advanceConfirmed === true,
      balanceConfirmed: booking.balanceConfirmed === true,
    }
  }, [])

  const fetchActiveTrip = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setLoadError(null)

      try {
        const { data } = await bookingsApi.getMyBookings()
        const bookings = Array.isArray(data) ? data : []
        const active = bookings.find((b) => ACTIVE_STATUSES.includes(b.status))

        setTrip(active ? await mapBooking(active) : null)
      } catch (error) {
        setTrip(null)
        setLoadError(getApiErrorMessage(error, 'Could not load your active trip.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [mapBooking],
  )

  useEffect(() => {
    void checkLocationPermission()
    void fetchActiveTrip()
  }, [checkLocationPermission, fetchActiveTrip])

  // ── Driver actions — every one reflects the server response only ─────────

  const handleUpdateTripStatus = async (newStatus: BookingStatus) => {
    if (!trip) return
    try {
      setActionLoading(true)
      await bookingsApi.updateStatus(trip.id, newStatus)
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : null))
      Alert.alert('Status updated', `Trip status is now: ${newStatus}`)
    } catch (error) {
      Alert.alert('Could not update status', getApiErrorMessage(error, 'The trip status was not changed. Please try again.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordCheckpoint = async () => {
    if (!trip) return

    if (!locationPermission) {
      Alert.alert(
        'Location required',
        'Grant location access so the checkpoint can be recorded with verified GPS coordinates.',
      )
      return
    }

    try {
      setActionLoading(true)
      const loc = await Location.getCurrentPositionAsync({})

      await trackingApi.recordCheckpoint(trip.id, {
        checkpointSeq: trip.checkpointSeq,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      })

      Alert.alert('Checkpoint recorded', 'Your position has been logged against this trip.')
      await fetchActiveTrip(true)
    } catch (error) {
      Alert.alert('Checkpoint not recorded', getApiErrorMessage(error, 'The checkpoint could not be saved. Please try again.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleTripCompletion = () => {
    if (!trip) return

    if (!trip.advanceConfirmed) {
      Alert.alert('Payment required', 'The factory owner must confirm the 50% loading advance before the trip can be completed.')
      return
    }

    setCompletionModalVisible(true)
  }

  const confirmTripCompletion = async () => {
    if (!trip) return
    if (!consigneeName.trim()) {
      Alert.alert('Required field', 'Please enter the consignee receiver name.')
      return
    }

    try {
      setCompletionLoading(true)

      // Completes the booking, releases the balance payment and notifies the
      // factory owner for rating — all server-side.
      const { data } = await paymentsApi.completeTrip({
        bookingId: trip.id,
        podDetails: {
          consigneeName: consigneeName.trim(),
          deliveryNotes: podNotes.trim() || undefined,
        },
      })

      setCompletionModalVisible(false)
      setPodModalVisible(false)
      setConsigneeName('')
      setPodNotes('')

      const releasedAmount = typeof data?.balanceAmount === 'number' ? data.balanceAmount : null
      Alert.alert(
        'Trip completed',
        releasedAmount
          ? `Balance payment of ₹${releasedAmount.toLocaleString('en-IN')} has been released. The factory owner has been notified to submit their rating.`
          : 'Trip completed. The factory owner has been notified to submit their rating.',
      )

      await fetchActiveTrip(true)
    } catch (error) {
      Alert.alert(
        'Trip not completed',
        getApiErrorMessage(error, 'We could not complete the trip. Your booking is unchanged — please try again.'),
      )
    } finally {
      setCompletionLoading(false)
    }
  }

  const handleSubmitPOD = async () => {
    if (!trip) return
    if (!consigneeName.trim()) {
      Alert.alert('Required field', 'Please enter the consignee receiver name.')
      return
    }

    try {
      setActionLoading(true)
      await trackingApi.submitPod(trip.id, {
        consigneeName: consigneeName.trim(),
        notes: podNotes.trim() || undefined,
      })

      setPodModalVisible(false)
      Alert.alert('POD submitted', 'Proof of delivery has been recorded against this trip.')
      await fetchActiveTrip(true)
    } catch (error) {
      Alert.alert('POD not submitted', getApiErrorMessage(error, 'The proof of delivery was not saved. Please try again.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitIncident = async () => {
    if (!trip) return
    if (!incidentDesc.trim()) {
      Alert.alert('Required field', 'Please describe the delay or incident.')
      return
    }

    try {
      setActionLoading(true)
      await trackingApi.reportIncident(trip.id, {
        category: incidentCategory,
        description: incidentDesc.trim(),
        impactMinutes: Number.parseInt(impactMinutes, 10) || 0,
      })

      setIncidentModalVisible(false)
      setIncidentDesc('')
      Alert.alert('Incident reported', 'Dispatch has been notified of the delay.')
    } catch (error) {
      Alert.alert('Report not sent', getApiErrorMessage(error, 'The incident report was not saved. Please try again.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleContactSupport = async () => {
    if (!SUPPORT_PHONE) {
      Alert.alert('Support', 'Reach the LorryCarry dispatch desk from the Help tab.')
      return
    }
    const url = `tel:${SUPPORT_PHONE}`
    try {
      const supported = await Linking.canOpenURL(url)
      if (!supported) throw new Error('unsupported')
      await Linking.openURL(url)
    } catch {
      Alert.alert('Dispatch support', `Call ${SUPPORT_PHONE} for 24/7 dispatch assistance.`)
    }
  }

  const balanceAmount = trip?.agreedPrice ? Math.round(trip.agreedPrice * 0.5) : 0

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Mode</Text>
          <Text style={styles.headerSub}>Operational Trip Dispatch Center</Text>
        </View>
        <TouchableOpacity style={styles.supportBadge} onPress={handleContactSupport} accessibilityRole="button">
          <Text style={styles.supportBadgeText}>📞 Dispatch Support</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchActiveTrip(true)} />}
      >
        {/* Location Permission Status Card */}
        <View style={[styles.card, locationPermission ? styles.locationGranted : styles.locationWarning]}>
          <View style={styles.rowBetween}>
            <Text style={styles.locationTitle}>
              {locationPermission ? '📍 Geofence Checkpoints Active' : '⚠️ Location Permission Needed'}
            </Text>
            {!locationPermission && (
              <TouchableOpacity style={styles.grantBtn} onPress={requestLocationPermission}>
                <Text style={styles.grantBtnText}>Grant Access</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.locationDesc}>
            {locationPermission
              ? 'Device GPS is used exclusively for geofence checkpoint crossing events.'
              : 'Allow location access to record checkpoint crossings along national corridors.'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Fetching active trip details…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>Could not load your trip</Text>
            <Text style={styles.emptySub}>{loadError}</Text>
            <TouchableOpacity style={styles.grantBtn} onPress={() => fetchActiveTrip(true)} accessibilityRole="button">
              <Text style={styles.grantBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : trip ? (
          <>
            {/* TRIP CARD */}
            <View style={styles.tripCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.bookingNumber}>Trip #{trip.bookingNumber}</Text>
                <View style={[styles.statusChip, trip.status === 'Completed' && styles.statusChipCompleted]}>
                  <Text style={[styles.statusChipText, trip.status === 'Completed' && styles.statusChipTextCompleted]}>
                    {trip.status}
                  </Text>
                </View>
              </View>

              {/* Payment Status */}
              {trip.agreedPrice !== null && (
                <View style={styles.paymentStatusBox}>
                  <Text style={styles.paymentStatusTitle}>💰 Payment Status</Text>
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentItem}>
                      <Text style={styles.paymentLabel}>Total Freight</Text>
                      <Text style={styles.paymentValue}>₹{(trip.agreedPrice || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.paymentItem}>
                      <Text style={styles.paymentLabel}>Advance (50%)</Text>
                      <Text style={[styles.paymentValue, trip.advanceConfirmed ? styles.paidText : styles.pendingText]}>
                        ₹{Math.round((trip.agreedPrice || 0) * 0.5).toLocaleString('en-IN')} {trip.advanceConfirmed ? '✓' : '⏳'}
                      </Text>
                    </View>
                    <View style={styles.paymentItem}>
                      <Text style={styles.paymentLabel}>Balance (50%)</Text>
                      <Text style={[styles.paymentValue, trip.balanceConfirmed ? styles.paidText : styles.pendingText]}>
                        ₹{Math.round((trip.agreedPrice || 0) * 0.5).toLocaleString('en-IN')} {trip.balanceConfirmed ? '✓' : '⏳'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Route */}
              <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                  <Text style={styles.routeIcon}>🟢</Text>
                  <View style={styles.routeTextCol}>
                    <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                    <Text style={styles.routeVal}>{trip.pickupAddress}</Text>
                  </View>
                </View>

                <View style={styles.routeDivider} />

                <View style={styles.routeRow}>
                  <Text style={styles.routeIcon}>🔴</Text>
                  <View style={styles.routeTextCol}>
                    <Text style={styles.routeLabel}>DESTINATION</Text>
                    <Text style={styles.routeVal}>{trip.destinationAddress}</Text>
                  </View>
                </View>
              </View>

              {/* Checkpoint & ETA info */}
              <View style={styles.checkpointBox}>
                <View style={styles.rowBetween}>
                  <Text style={styles.checkpointHeader}>Next Geofence Checkpoint</Text>
                  {trip.etaMinutes !== null && <Text style={styles.etaText}>⏱ ETA ~{trip.etaMinutes} mins</Text>}
                </View>
                <Text style={styles.checkpointName}>
                  {trip.nextCheckpointName
                    ? `📍 ${trip.nextCheckpointName}${trip.totalCheckpoints ? ` (${trip.checkpointSeq}/${trip.totalCheckpoints})` : ''}`
                    : 'No checkpoint data available for this trip yet.'}
                </Text>
                <Text style={styles.checkpointDisclaimer}>
                  Checkpoints update automatically upon entering highway geofences.
                </Text>
              </View>

              {/* ACTION PROGRESSION BUTTONS */}
              <Text style={styles.sectionHeading}>DRIVER TRIP ACTIONS</Text>
              
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.actionBtn, trip.status === 'Confirmed' && styles.actionBtnActive]}
                  onPress={() => handleUpdateTripStatus('InTransit')}
                  disabled={actionLoading || trip.status !== 'Confirmed'}
                >
                  <Text style={styles.actionBtnText}>🚀 Start Trip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.checkpointBtn]}
                  onPress={handleRecordCheckpoint}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>📍 Checkpoint Reached</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setPodModalVisible(true)}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>📄 Capture POD</Text>
                </TouchableOpacity>
              </View>

              {/* 🚚 TRIP COMPLETION BUTTON - NEW FEATURE */}
              {trip.status !== 'Completed' && (
                <View style={styles.completionSection}>
                  <Text style={styles.sectionHeading}>TRIP COMPLETION</Text>
                  <TouchableOpacity
                    style={[styles.completionBtn, !trip.advanceConfirmed && styles.completionBtnDisabled]}
                    onPress={handleTripCompletion}
                    disabled={!trip.advanceConfirmed || actionLoading}
                  >
                    <Text style={styles.completionBtnText}>🚚 Complete Trip & Release Payment</Text>
                    {trip.advanceConfirmed && (
                      <Text style={styles.completionBtnSubtext}>
                        Balance ₹{balanceAmount.toLocaleString('en-IN')} will be released
                      </Text>
                    )}
                    {!trip.advanceConfirmed && (
                      <Text style={styles.completionBtnSubtext}>
                        Waiting for advance payment confirmation
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Completed State */}
              {trip.status === 'Completed' && (
                <View style={styles.completedBanner}>
                  <Text style={styles.completedTitle}>✅ Trip Completed</Text>
                  <Text style={styles.completedSubtext}>
                    {trip.balanceConfirmed
                      ? `Balance payment of ₹${balanceAmount.toLocaleString('en-IN')} has been released.`
                      : 'Balance release is being processed by our payments team.'}
                    {'\n'}Factory owner has been notified for rating.
                  </Text>
                </View>
              )}

              {/* INCIDENT REPORT BUTTON */}
              <TouchableOpacity
                style={styles.incidentBtn}
                onPress={() => setIncidentModalVisible(true)}
              >
                <Text style={styles.incidentBtnText}>🚨 Report Incident / Delay</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyTitle}>No Active Driver Trip</Text>
            <Text style={styles.emptySub}>
              You have no confirmed or in-transit bookings right now. Accepted trips appear here
              automatically — pull down to refresh.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── POD CAPTURE MODAL ── */}
      <Modal visible={podModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proof of Delivery (POD)</Text>
            <Text style={styles.modalSub}>Record the delivery sign-off against this booking.</Text>

            <Text style={styles.inputLabel}>Consignee Receiver Name *</Text>
            <TextInput
              style={styles.textInput}
              value={consigneeName}
              onChangeText={setConsigneeName}
              placeholder="e.g. Ramesh Kumar (Warehouse Manager)"
            />

            <TouchableOpacity
              style={styles.photoAttachBtn}
              onPress={() =>
                Alert.alert(
                  'Photo upload unavailable',
                  'POD photo capture is not available in this app version. Submit the receiver name and notes now — the photo can be attached from the LorryCarry web app.',
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.photoAttachText}>📷 POD photo (web app only)</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Delivery Notes / Remarks</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              value={podNotes}
              onChangeText={setPodNotes}
              placeholder="Seal intact, zero damage observed..."
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setPodModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitModalBtn} onPress={handleSubmitPOD}>
                <Text style={styles.submitModalText}>Submit POD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── TRIP COMPLETION MODAL ── */}
      <Modal visible={completionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚚 Complete Trip & Release Payment</Text>
            <Text style={styles.modalSub}>
              Submit POD details to complete the trip. Balance payment will be released to your account and the factory owner will be notified to submit their rating.
            </Text>

            {/* Payment Summary */}
            <View style={styles.paymentSummaryBox}>
              <Text style={styles.paymentSummaryTitle}>💰 Payment Summary</Text>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Total Freight:</Text>
                <Text style={styles.paymentSummaryValue}>₹{(trip?.agreedPrice || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Advance (50%):</Text>
                <Text style={[styles.paymentSummaryValue, styles.paidText]}>
                  ✓ ₹{Math.round((trip?.agreedPrice || 0) * 0.5).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Balance to Release (50%):</Text>
                <Text style={[styles.paymentSummaryValue, styles.releaseText]}>
                  ₹{balanceAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Consignee Receiver Name *</Text>
            <TextInput
              style={styles.textInput}
              value={consigneeName}
              onChangeText={setConsigneeName}
              placeholder="e.g. Ramesh Kumar (Warehouse Manager)"
            />

            <TouchableOpacity
              style={styles.photoAttachBtn}
              onPress={() =>
                Alert.alert(
                  'Photo upload unavailable',
                  'POD photo capture is not available in this app version. Submit the receiver name and notes now — the photo can be attached from the LorryCarry web app.',
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.photoAttachText}>📷 POD photo (web app only)</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              value={podNotes}
              onChangeText={setPodNotes}
              placeholder="Seal intact, zero damage observed..."
              multiline
            />

            {/* What happens next */}
            <View style={styles.nextStepsBox}>
              <Text style={styles.nextStepsTitle}>📋 What Happens Next:</Text>
              <Text style={styles.nextStepsText}>• Balance payment of ₹{balanceAmount.toLocaleString('en-IN')} is released once the server confirms completion</Text>
              <Text style={styles.nextStepsText}>• Factory owner receives notification for rating</Text>
              <Text style={styles.nextStepsText}>• Trip marked as completed</Text>
            </View>

            {completionLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#16A34A" />
                <Text style={styles.loadingText}>Completing trip...</Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setCompletionModalVisible(false)}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.submitModalBtn, styles.completeTripBtn]} onPress={confirmTripCompletion}>
                  <Text style={styles.submitModalText}>Complete & Release</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── INCIDENT REPORT MODAL ── */}
      <Modal visible={incidentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Delay / Incident</Text>
            <Text style={styles.modalSub}>Notify fleet dispatch tower of highway delays.</Text>

            <Text style={styles.inputLabel}>Incident Category</Text>
            <View style={styles.categoryRow}>
              {['Traffic Delay', 'Breakdown', 'Weather', 'RTO Check'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, incidentCategory === cat && styles.catChipActive]}
                  onPress={() => setIncidentCategory(cat)}
                >
                  <Text style={[styles.catChipText, incidentCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Impacted Delay (Minutes)</Text>
            <TextInput
              style={styles.textInput}
              value={impactMinutes}
              onChangeText={setImpactMinutes}
              keyboardType="numeric"
              placeholder="30"
            />

            <Text style={styles.inputLabel}>Incident Details *</Text>
            <TextInput
              style={[styles.textInput, { height: 70 }]}
              value={incidentDesc}
              onChangeText={setIncidentDesc}
              placeholder="Describe highway situation or maintenance delay..."
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIncidentModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitModalBtn, { backgroundColor: '#EF4444' }]} onPress={handleSubmitIncident}>
                <Text style={styles.submitModalText}>Submit Incident</Text>
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
  supportBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFEDD5' },
  supportBadgeText: { fontSize: 11, fontWeight: '700', color: '#C2410C' },
  scrollContent: { padding: 16, gap: 14 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  locationGranted: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  locationWarning: { backgroundColor: '#FEFCE8', borderColor: '#FEF08A' },
  locationTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  locationDesc: { fontSize: 11, color: '#475569' },
  grantBtn: { backgroundColor: '#EAB308', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  grantBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  tripCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderColor: '#E2E8F0', borderWidth: 1, gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingNumber: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  statusChip: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusChipCompleted: { backgroundColor: '#DCFCE7' },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  statusChipTextCompleted: { color: '#16A34A' },
  paymentStatusBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  paymentStatusTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentItem: { alignItems: 'center' },
  paymentLabel: { fontSize: 9, color: '#64748B', marginBottom: 2 },
  paymentValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  paidText: { color: '#16A34A' },
  pendingText: { color: '#F59E0B' },
  routeContainer: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeIcon: { fontSize: 14, marginTop: 2 },
  routeTextCol: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  routeVal: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  routeDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  checkpointBox: { backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FFEDD5', gap: 4 },
  checkpointHeader: { fontSize: 11, fontWeight: '800', color: '#C2410C' },
  etaText: { fontSize: 11, fontWeight: '700', color: '#9A3412' },
  checkpointName: { fontSize: 13, fontWeight: '800', color: '#431407' },
  checkpointDisclaimer: { fontSize: 10, color: '#9A3412' },
  sectionHeading: { fontSize: 11, fontWeight: '800', color: '#64748B', marginTop: 4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { width: '48%', backgroundColor: '#F1F5F9', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnActive: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#3B82F6' },
  checkpointBtn: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' },
  podBtn: { width: '100%', backgroundColor: '#16A34A', paddingVertical: 12 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  podBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  incidentBtn: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  incidentBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  loadingBox: { padding: 20, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#64748B' },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 16, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 11, color: '#64748B' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginTop: 4 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: '#0F172A' },
  photoAttachBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  photoAttachedBtn: { backgroundColor: '#DCFCE7', borderColor: '#22C55E', borderStyle: 'solid' },
  photoAttachText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F1F5F9' },
  catChipActive: { backgroundColor: '#F97316' },
  catChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  catChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelModalText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  submitModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center' },
  submitModalText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  completeTripBtn: { backgroundColor: '#16A34A' },
  
  // Trip Completion Styles
  completionSection: { gap: 8 },
  completionBtn: { 
    backgroundColor: '#059669', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  completionBtnDisabled: { backgroundColor: '#9CA3AF' },
  completionBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  completionBtnSubtext: { fontSize: 11, fontWeight: '600', color: '#D1FAE5', marginTop: 2 },
  completedBanner: { 
    backgroundColor: '#DCFCE7', 
    padding: 14, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#86EFAC' 
  },
  completedTitle: { fontSize: 14, fontWeight: '800', color: '#15803D', marginBottom: 4 },
  completedSubtext: { fontSize: 11, color: '#166534', lineHeight: 16 },
  
  // Payment Summary Box
  paymentSummaryBox: { 
    backgroundColor: '#F0FDF4', 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#BBF7D0' 
  },
  paymentSummaryTitle: { fontSize: 12, fontWeight: '800', color: '#166534', marginBottom: 8 },
  paymentSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  paymentSummaryLabel: { fontSize: 11, color: '#475569' },
  paymentSummaryValue: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  releaseText: { color: '#16A34A' },
  
  // Next Steps Box
  nextStepsBox: { 
    backgroundColor: '#EFF6FF', 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#BFDBFE' 
  },
  nextStepsTitle: { fontSize: 12, fontWeight: '800', color: '#1E40AF', marginBottom: 6 },
  nextStepsText: { fontSize: 11, color: '#1E3A8A', marginBottom: 2 },
})
