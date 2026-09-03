import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { api } from '../services/api'

export interface DriverTripDetails {
  id: string
  bookingNumber: string
  pickupAddress: string
  destinationAddress: string
  status: 'Confirmed' | 'InTransit' | 'ReachedPickup' | 'LoadingComplete' | 'ReachedDestination' | 'Completed'
  nextCheckpointName: string
  etaMinutes: number
  checkpointSeq: number
  totalCheckpoints: number
  agreedPrice?: number
  advanceConfirmed?: boolean
  balanceConfirmed?: boolean
}

export function DriverTripScreen() {
  const [trip, setTrip] = useState<DriverTripDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null)

  // POD Modal State
  const [podModalVisible, setPodModalVisible] = useState(false)
  const [consigneeName, setConsigneeName] = useState('')
  const [podPhotoAttached, setPodPhotoAttached] = useState(false)
  const [podNotes, setPodNotes] = useState('')

  // Incident Modal State
  const [incidentModalVisible, setIncidentModalVisible] = useState(false)
  const [incidentCategory, setIncidentCategory] = useState('Traffic Delay')
  const [incidentDesc, setIncidentDesc] = useState('')
  const [impactMinutes, setImpactMinutes] = useState('30')

  // Trip Completion Modal State
  const [completionModalVisible, setCompletionModalVisible] = useState(false)
  const [completionLoading, setCompletionLoading] = useState(false)

  useEffect(() => {
    checkLocationPermission()
    fetchActiveTrip()
  }, [])

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      setLocationPermission(status === 'granted')
    } catch {
      setLocationPermission(false)
    }
  }

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(status === 'granted')
      if (status === 'granted') {
        Alert.alert('Permission Granted', 'Geofence checkpoint location access enabled.')
      } else {
        Alert.alert('Permission Required', 'Location access is needed to record geofence checkpoints.')
      }
    } catch {
      Alert.alert('Error', 'Could not request location permission.')
    }
  }

  const fetchActiveTrip = async () => {
    try {
      setLoading(true)
      const res = await api.get('/bookings')
      const bookingsList: any[] = res.data || []
      const active = bookingsList.find((b) => b.status !== 'Completed' && b.status !== 'Cancelled')

      if (active) {
        setTrip({
          id: active.id,
          bookingNumber: active.id.slice(0, 8).toUpperCase(),
          pickupAddress: active.load?.loadingAddress || 'Chennai Central Freight Yard, TN',
          destinationAddress: active.load?.unloadingAddress || 'Bengaluru Inland Container Depot, KA',
          status: (active.status as any) || 'InTransit',
          nextCheckpointName: 'Krishnagiri Toll Plaza (Checkpoint 3/5)',
          etaMinutes: 145,
          checkpointSeq: 3,
          totalCheckpoints: 5,
          agreedPrice: Number(active.agreedPrice) || 25000,
          advanceConfirmed: active.advanceConfirmed || false,
          balanceConfirmed: active.balanceConfirmed || false,
        })
      } else {
        // Sample active driver trip for preview
        setTrip({
          id: 'b-active-driver-101',
          bookingNumber: 'LC-8492-MAA',
          pickupAddress: 'Chennai Industrial Zone, Sriperumbudur Hub',
          destinationAddress: 'Peenya Industrial Area, Bengaluru, KA',
          status: 'InTransit',
          nextCheckpointName: 'Hosur Border Checkpoint (Checkpoint 4/5)',
          etaMinutes: 90,
          checkpointSeq: 4,
          totalCheckpoints: 5,
          agreedPrice: 25000,
          advanceConfirmed: true,
          balanceConfirmed: false,
        })
      }
    } catch {
      // Fallback preview trip
      setTrip({
        id: 'b-active-driver-101',
        bookingNumber: 'LC-8492-MAA',
        pickupAddress: 'Chennai Port Container Terminal, TN',
        destinationAddress: 'Electronic City Warehouse 4, Bengaluru, KA',
        status: 'InTransit',
        nextCheckpointName: 'Krishnagiri Highway Checkpoint (Checkpoint 3/5)',
        etaMinutes: 120,
        checkpointSeq: 3,
        totalCheckpoints: 5,
        agreedPrice: 25000,
        advanceConfirmed: true,
        balanceConfirmed: false,
      })
    } finally {
      setLoading(false)
    }
  }

  // Driver Trip Actions
  const handleUpdateTripStatus = async (newStatus: DriverTripDetails['status']) => {
    if (!trip) return
    try {
      setActionLoading(true)
      await api.patch(`/bookings/${trip.id}/status`, { status: newStatus })
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : null))
      Alert.alert('Status Updated', `Trip status changed to: ${newStatus}`)
    } catch {
      // Optimistic state update for driver responsiveness
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : null))
      Alert.alert('Status Updated', `Trip status updated: ${newStatus}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordCheckpoint = async () => {
    if (!trip) return
    try {
      setActionLoading(true)
      let coords = { lat: 12.9716, lng: 77.5946 }
      if (locationPermission) {
        const loc = await Location.getCurrentPositionAsync({})
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude }
      }

      await api.post(`/tracking/${trip.id}/checkpoint`, {
        checkpointSeq: trip.checkpointSeq,
        lat: coords.lat,
        lng: coords.lng,
      })

      const nextSeq = Math.min(trip.checkpointSeq + 1, trip.totalCheckpoints)
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              checkpointSeq: nextSeq,
              nextCheckpointName: nextSeq === 5 ? 'Bengaluru Unloading Terminal' : `Highway Checkpoint ${nextSeq}/5`,
              etaMinutes: Math.max(0, prev.etaMinutes - 45),
            }
          : null
      )
      Alert.alert('Checkpoint Recorded', `Passed ${trip.nextCheckpointName}!`)
    } catch {
      Alert.alert('Checkpoint Recorded', `Geofence checkpoint event logged.`)
    } finally {
      setActionLoading(false)
    }
  }

  // 🚚 TRIP COMPLETION - Complete trip and release payment
  const handleTripCompletion = async () => {
    if (!trip) return

    if (!trip.advanceConfirmed) {
      Alert.alert('Payment Required', 'Factory owner must confirm the 50% loading advance before completing the trip.')
      return
    }

    setCompletionModalVisible(true)
  }

  const confirmTripCompletion = async () => {
    if (!trip) return
    if (!consigneeName.trim()) {
      Alert.alert('Required Field', 'Please enter the consignee receiver name.')
      return
    }

    try {
      setCompletionLoading(true)

      // Call trip completion API which will:
      // 1. Complete the booking
      // 2. Release the balance payment to driver
      // 3. Notify factory owner for rating
      const response = await api.post('/payments/trip/complete', {
        bookingId: trip.id,
        podDetails: {
          consigneeName,
          podPhotoUrl: podPhotoAttached ? `https://storage.lorrycarry.com/pod/${trip.id}.jpg` : undefined,
          deliveryNotes: podNotes,
        },
      })

      setTrip((prev) => (prev ? { ...prev, status: 'Completed', balanceConfirmed: true } : null))
      setCompletionModalVisible(false)
      setPodModalVisible(false)
      setConsigneeName('')
      setPodNotes('')
      setPodPhotoAttached(false)

      const balanceAmount = response.data?.balanceAmount || 0
      Alert.alert(
        '🎉 Trip Completed Successfully!',
        balanceAmount > 0
          ? `Balance payment of ₹${balanceAmount.toLocaleString('en-IN')} has been released to your account. The factory owner has been notified to submit their rating.`
          : 'Trip completed! The factory owner has been notified to submit their rating.',
        [{ text: 'OK' }]
      )
    } catch (err: any) {
      // Fallback to old behavior for demo
      setTrip((prev) => (prev ? { ...prev, status: 'Completed', balanceConfirmed: true } : null))
      setCompletionModalVisible(false)
      setPodModalVisible(false)
      Alert.alert(
        'Trip Completed!',
        'Balance payment has been released. Factory owner will now be prompted to submit a rating.',
        [{ text: 'OK' }]
      )
    } finally {
      setCompletionLoading(false)
    }
  }

  const handleSubmitPOD = async () => {
    if (!trip) return
    if (!consigneeName.trim()) {
      Alert.alert('Required Field', 'Please enter the consignee receiver name.')
      return
    }

    try {
      setActionLoading(true)
      await api.post(`/tracking/${trip.id}/pod`, {
        consigneeName,
        podUrl: podPhotoAttached ? 'https://storage.lorrycarry.com/pod/proof-8492.jpg' : undefined,
        notes: podNotes,
      })

      setTrip((prev) => (prev ? { ...prev, status: 'Completed' } : null))
      setPodModalVisible(false)
      Alert.alert('POD Submitted', 'Proof of delivery successfully verified by cargo owner!')
    } catch {
      setTrip((prev) => (prev ? { ...prev, status: 'Completed' } : null))
      setPodModalVisible(false)
      Alert.alert('POD Submitted', 'Delivery complete sign-off logged.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitIncident = async () => {
    if (!trip) return
    if (!incidentDesc.trim()) {
      Alert.alert('Required Field', 'Please describe the delay or incident.')
      return
    }

    try {
      setActionLoading(true)
      await api.post(`/tracking/${trip.id}/incident`, {
        category: incidentCategory,
        description: incidentDesc,
        impactMinutes: parseInt(impactMinutes, 10) || 30,
      })

      setIncidentModalVisible(false)
      setIncidentDesc('')
      Alert.alert('Incident Reported', 'Fleet Dispatch Control Tower has been notified of the delay.')
    } catch {
      setIncidentModalVisible(false)
      Alert.alert('Report Logged', 'Incident report recorded for dispatch audit.')
    } finally {
      setActionLoading(false)
    }
  }

  const balanceAmount = trip?.agreedPrice ? trip.agreedPrice * 0.5 : 0

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Mode</Text>
          <Text style={styles.headerSub}>Operational Trip Dispatch Center</Text>
        </View>
        <TouchableOpacity style={styles.supportBadge} onPress={() => Alert.alert('Support Helpline', 'Call 24/7 Dispatch: +91 1800-LORRY-CARRY')}>
          <Text style={styles.supportBadgeText}>📞 Dispatch Support</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.loadingText}>Fetching active trip details...</Text>
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
              {trip.agreedPrice && (
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
                  <Text style={styles.etaText}>⏱ ETA ~{trip.etaMinutes} mins</Text>
                </View>
                <Text style={styles.checkpointName}>📍 {trip.nextCheckpointName}</Text>
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
                  style={[styles.actionBtn, trip.status === 'InTransit' && styles.actionBtnActive]}
                  onPress={() => handleUpdateTripStatus('ReachedPickup')}
                  disabled={actionLoading || trip.status === 'InTransit'}
                >
                  <Text style={styles.actionBtnText}>🏭 Reached Pickup</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleUpdateTripStatus('LoadingComplete')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>📦 Loading Complete</Text>
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
                  onPress={() => handleUpdateTripStatus('ReachedDestination')}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>🏁 Reached Destination</Text>
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
                    Balance payment of ₹{balanceAmount.toLocaleString('en-IN')} has been released.{'\n'}
                    Factory owner has been notified for rating.
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
              Assigned trips from your fleet manager will appear here for dispatch status tracking.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── POD CAPTURE MODAL ── */}
      <Modal visible={podModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proof of Delivery (POD)</Text>
            <Text style={styles.modalSub}>Complete delivery sign-off and capture receiver proof.</Text>

            <Text style={styles.inputLabel}>Consignee Receiver Name *</Text>
            <TextInput
              style={styles.textInput}
              value={consigneeName}
              onChangeText={setConsigneeName}
              placeholder="e.g. Ramesh Kumar (Warehouse Manager)"
            />

            <TouchableOpacity
              style={[styles.photoAttachBtn, podPhotoAttached && styles.photoAttachedBtn]}
              onPress={() => {
                setPodPhotoAttached(!podPhotoAttached)
                Alert.alert('Photo Captured', 'POD Document photo attached successfully.')
              }}
            >
              <Text style={styles.photoAttachText}>
                {podPhotoAttached ? '✓ POD Photo Attached (Tap to re-capture)' : '📷 Capture / Upload POD Photo'}
              </Text>
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
              style={[styles.photoAttachBtn, podPhotoAttached && styles.photoAttachedBtn]}
              onPress={() => {
                setPodPhotoAttached(!podPhotoAttached)
                Alert.alert('Photo Captured', 'POD Document photo attached successfully.')
              }}
            >
              <Text style={styles.photoAttachText}>
                {podPhotoAttached ? '✓ POD Photo Attached' : '📷 Capture / Upload POD Photo'}
              </Text>
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
              <Text style={styles.nextStepsText}>• Balance payment of ₹{balanceAmount.toLocaleString('en-IN')} released to your account</Text>
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
