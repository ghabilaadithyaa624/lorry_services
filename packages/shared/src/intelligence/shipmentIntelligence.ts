/**
 * LorryCarry Logistics Intelligence — Shipment & Transit Intelligence
 * Real-time operational risk classifier, milestone progress, and compliance analyzer.
 * Pure and platform-agnostic: shared by API, web, admin and mobile.
 */

export interface CheckpointData {
  id: string
  seq: number
  name: string
  lat: number
  lng: number
  crossedAt?: string | null
  crossedBy?: string | null
  etaMinutes?: number | null
  crossed?: boolean
}

export interface BookingData {
  id: string
  loadId: string
  truckId: string
  agreedPrice: number | string
  advanceConfirmed: boolean
  advanceConfirmedAt?: string | null
  balanceConfirmed: boolean
  balanceConfirmedAt?: string | null
  ewayBillNumber?: string | null
  ewayBillStatus?: string | null
  ewayBillValidUpto?: string | null
  liabilityAccepted: boolean
  liabilityAcceptedAt?: string | null
  status: 'Pending' | 'Confirmed' | 'InTransit' | 'Completed' | 'Cancelled' | string
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  whatsappTriggerStatus?: 'NotTriggered' | 'Queued' | 'Sent' | 'Delivered' | 'Failed' | string | null
  whatsappTriggeredAt?: string | null
  whatsappStatus?: string | null
  expectedDeliveryAt?: string | null
  expectedDeliveryTime?: string | null
  checkpoints?: CheckpointData[]
  load?: {
    tonnageRequired?: number
    loadingAddress?: string
    unloadingAddress?: string
    expectedDeliveryAt?: string | null
    expectedDelivery?: string | null
    user?: { name?: string | null; phone: string }
  }
  truck?: {
    registrationNumber?: string
    bodyType?: string
    user?: { name?: string | null; phone: string }
  }
}

export interface AssessShipmentOptions {
  now?: Date | string | number
}

export interface ShipmentRiskAssessment {
  statusTier: 'ON TRACK' | 'LOW RISK' | 'ATTENTION REQUIRED' | 'ACTION REQUIRED' | 'DELAYED' | 'COMPLETED'
  badgeVariant: 'success' | 'info' | 'warning' | 'danger'
  progressPercent: number
  crossedCount: number
  totalCheckpoints: number
  currentLocationName: string
  nextMilestoneName: string
  estimatedArrival: string
  isEtaEstimated: boolean
  isLocationEstimated: boolean
  whyReason: string
  requiredActions: Array<{
    title: string
    description: string
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
    actionType: 'CONFIRM_ADVANCE' | 'CONFIRM_BALANCE' | 'EWAY_BILL' | 'LIABILITY' | 'WHATSAPP_RETRY' | 'DELAY_INVESTIGATION' | 'OVERDUE_DELIVERY' | string
  }>
  commercialState: {
    advancePaid: boolean
    balancePaid: boolean
    advanceAmount: number
    balanceAmount: number
  }
  riskSummary: string
  /** Hours since the latest checkpoint crossing (or trip start when none crossed) while InTransit; null otherwise. */
  lastCheckpointAgeHours: number | null
  /** Hours past the expected delivery window while the booking is incomplete; null otherwise. */
  deliveryOverdueHours: number | null
  /** True when an attached E-Way Bill has expired (status Expired/Invalid or lapsed validity) on an active booking. */
  isEwayBillExpired: boolean
}

const assessmentCache = new WeakMap<BookingData, ShipmentRiskAssessment>()

const MS_PER_HOUR = 60 * 60 * 1000
const SIX_HOURS_MS = 6 * MS_PER_HOUR

export function assessShipmentIntelligence(
  booking: BookingData,
  options?: AssessShipmentOptions
): ShipmentRiskAssessment {
  if (!options && assessmentCache.has(booking)) {
    return assessmentCache.get(booking)!
  }

  const checkpoints = (booking.checkpoints || [])
    .slice()
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
  const totalCheckpoints = Math.max(checkpoints.length, 5)
  const crossedCheckpoints = checkpoints.filter(cp => Boolean(cp.crossedAt || cp.crossed))
  const crossedCount = crossedCheckpoints.length
  
  const progressPercent = booking.status === 'Completed' ? 100 : Math.round((crossedCount / totalCheckpoints) * 100)
  
  const agreedPrice = Number(booking.agreedPrice) || 0
  const advanceAmount = Math.round(agreedPrice * 0.5)
  const balanceAmount = agreedPrice - advanceAmount

  const referenceTime = options?.now ? new Date(options.now).getTime() : Date.now()

  // 1. Checkpoint delay check for InTransit:
  // Find the latest crossedAt timestamp across all crossed checkpoints
  let latestCrossedTime: number | null = null
  for (const cp of crossedCheckpoints) {
    if (cp.crossedAt) {
      const t = new Date(cp.crossedAt).getTime()
      if (!isNaN(t) && (latestCrossedTime === null || t > latestCrossedTime)) {
        latestCrossedTime = t
      }
    }
  }

  // The staleness baseline is the latest crossed checkpoint timestamp; when no
  // checkpoint has recorded a crossing yet, the trip start (`startedAt`) stands
  // in so a vehicle that never checks in is still caught after 6 hours.
  const startedTimeRaw = booking.startedAt ? new Date(booking.startedAt).getTime() : NaN
  const stalenessBaseline =
    latestCrossedTime !== null ? latestCrossedTime : !isNaN(startedTimeRaw) ? startedTimeRaw : null

  let isCheckpointStale = false
  if (
    booking.status === 'InTransit' &&
    stalenessBaseline !== null &&
    referenceTime - stalenessBaseline > SIX_HOURS_MS
  ) {
    isCheckpointStale = true
  }

  const lastCheckpointAgeHours =
    booking.status === 'InTransit' && stalenessBaseline !== null
      ? Math.round((Math.max(0, referenceTime - stalenessBaseline) / MS_PER_HOUR) * 10) / 10
      : null

  // 2. Expected delivery time passed check:
  const rawExpectedDelivery =
    booking.load?.expectedDeliveryAt ||
    booking.load?.expectedDelivery ||
    booking.expectedDeliveryAt ||
    booking.expectedDeliveryTime ||
    (booking as any).expectedDelivery
  let isExpectedDeliveryPassed = false
  let deliveryOverdueHours: number | null = null
  if (rawExpectedDelivery && booking.status !== 'Completed' && booking.status !== 'Cancelled') {
    const deliveryTime = new Date(rawExpectedDelivery).getTime()
    if (!isNaN(deliveryTime) && referenceTime > deliveryTime) {
      isExpectedDeliveryPassed = true
      deliveryOverdueHours = Math.round(((referenceTime - deliveryTime) / MS_PER_HOUR) * 10) / 10
    }
  }

  // 3. WhatsApp trigger failed check:
  const isWhatsAppFailed =
    (booking.whatsappTriggerStatus === 'Failed' ||
      booking.whatsappStatus === 'Failed' ||
      (booking as any).whatsapp_trigger_status === 'Failed') &&
    booking.status !== 'Cancelled'

  // 4. E-Way Bill lifecycle check: a booked consignment above the GST threshold
  // must carry an *active* E-Way Bill — an attached number whose validity has
  // lapsed is as blocking at a state-border check as a missing one.
  const isEwayBillMissing =
    !booking.ewayBillNumber && booking.status !== 'Cancelled' && booking.status !== 'Completed'
  const ewayStatus = (booking.ewayBillStatus || '').trim().toLowerCase()
  let ewayBillValidUptoTime: number | null = null
  if (booking.ewayBillValidUpto) {
    const validUpto = new Date(booking.ewayBillValidUpto).getTime()
    if (!isNaN(validUpto)) ewayBillValidUptoTime = validUpto
  }
  const isEwayBillExpired =
    Boolean(booking.ewayBillNumber) &&
    booking.status !== 'Cancelled' &&
    booking.status !== 'Completed' &&
    (ewayStatus === 'expired' ||
      ewayStatus === 'invalid' ||
      (ewayBillValidUptoTime !== null && referenceTime > ewayBillValidUptoTime))

  const requiredActions: ShipmentRiskAssessment['requiredActions'] = []

  // 1. Check commercial terms: advance
  if (!booking.advanceConfirmed && booking.status !== 'Cancelled' && booking.status !== 'Completed') {
    requiredActions.push({
      title: '50% Loading Advance Confirmation Pending',
      description: `Release ₹${advanceAmount.toLocaleString('en-IN')} loading advance to transporter upon dispatch confirmation.`,
      urgency: 'HIGH',
      actionType: 'CONFIRM_ADVANCE',
    })
  }

  // 2. Check commercial terms: delivery balance
  if (booking.status === 'Completed' && !booking.balanceConfirmed) {
    requiredActions.push({
      title: 'Delivery Balance Confirmation Required',
      description: `Confirm release of remaining ₹${balanceAmount.toLocaleString('en-IN')} balance after verifying unloading & POD.`,
      urgency: 'HIGH',
      actionType: 'CONFIRM_BALANCE',
    })
  }

  // 3. Check delivery schedule overdue
  if (isExpectedDeliveryPassed) {
    requiredActions.push({
      title: 'Expected Delivery Time Overdue',
      description: 'Trip has passed its scheduled delivery timeline. Contact transporter and verify current location.',
      urgency: 'HIGH',
      actionType: 'OVERDUE_DELIVERY',
    })
  }

  // 4. Check highway checkpoint stale
  if (isCheckpointStale) {
    requiredActions.push({
      title: 'Highway Checkpoint Update Stale (>6 hrs)',
      description: 'No highway checkpoint update recorded in the last 6 hours. Check driver telematics and geofence status.',
      urgency: 'HIGH',
      actionType: 'DELAY_INVESTIGATION',
    })
  }

  // 5. Check WhatsApp trigger status
  if (isWhatsAppFailed) {
    requiredActions.push({
      title: 'WhatsApp Trigger Failed',
      description: 'Automated WhatsApp dispatch notification failed to deliver. Resend or contact transporter via direct call.',
      urgency: 'MEDIUM',
      actionType: 'WHATSAPP_RETRY',
    })
  }

  // 6. Check E-Way Bill compliance: missing number or lapsed validity
  if (isEwayBillMissing) {
    requiredActions.push({
      title: 'E-Way Bill Number Missing',
      description: 'Indian GST regulations require an active E-Way Bill for consignments above ₹50,000.',
      urgency: 'MEDIUM',
      actionType: 'EWAY_BILL',
    })
  } else if (isEwayBillExpired) {
    requiredActions.push({
      title: 'E-Way Bill Expired',
      description:
        'The attached E-Way Bill has expired or its validity window has lapsed. Generate a fresh E-Way Bill before the next state-border check post.',
      urgency: 'MEDIUM',
      actionType: 'EWAY_BILL',
    })
  }

  // Determine current & next milestone
  let currentLocationName = 'Origin Loading Point'
  let nextMilestoneName = checkpoints[0]?.name || 'Checkpoint 1'

  if (crossedCount > 0) {
    const lastCrossed = crossedCheckpoints[crossedCheckpoints.length - 1]
    currentLocationName = lastCrossed.name
    const nextCp = checkpoints.find(cp => !cp.crossedAt && !cp.crossed)
    nextMilestoneName = nextCp ? nextCp.name : 'Destination Terminal'
  }

  // Calculate risk status & explicit why explanations
  let statusTier: ShipmentRiskAssessment['statusTier'] = 'ON TRACK'
  let badgeVariant: ShipmentRiskAssessment['badgeVariant'] = 'success'
  let riskSummary = 'Vehicle is moving on schedule along the national corridor.'
  let whyReason = 'Vehicle progressing through checkpoints'

  if (booking.status === 'Completed') {
    if (!booking.balanceConfirmed) {
      statusTier = 'ACTION REQUIRED'
      badgeVariant = 'danger'
      riskSummary = 'Shipment action required: Consignment completed but POD delivery balance not confirmed.'
      whyReason = 'Completed but balance not confirmed'
    } else {
      statusTier = 'COMPLETED'
      badgeVariant = 'success'
      riskSummary = 'Consignment successfully delivered at destination.'
      whyReason = 'All highway checkpoints crossed & POD verified'
    }
  } else if (booking.status === 'Cancelled') {
    statusTier = 'LOW RISK'
    badgeVariant = 'info'
    riskSummary = 'This shipment booking has been cancelled.'
    whyReason = 'Booking cancelled'
  } else if (!booking.advanceConfirmed && (booking.status === 'InTransit' || booking.status === 'Confirmed')) {
    statusTier = 'ACTION REQUIRED'
    badgeVariant = 'danger'
    riskSummary = 'Shipment action required: 50% loading advance confirmation pending.'
    whyReason = '50% advance confirmation pending'
  } else if (isExpectedDeliveryPassed) {
    statusTier = 'DELAYED'
    badgeVariant = 'danger'
    riskSummary = 'Shipment delayed: Expected delivery schedule has passed but booking not completed.'
    whyReason = 'Expected delivery time passed and booking not completed'
  } else if (booking.status === 'InTransit' && isCheckpointStale) {
    statusTier = 'DELAYED'
    badgeVariant = 'danger'
    riskSummary = 'Shipment delayed: In-transit vehicle has not recorded a checkpoint update for over 6 hours.'
    whyReason = 'InTransit and latest checkpoint crossedAt older than 6 hours'
  } else if (isWhatsAppFailed) {
    statusTier = 'ATTENTION REQUIRED'
    badgeVariant = 'warning'
    riskSummary = 'Shipment attention required: Automated WhatsApp trigger failed.'
    whyReason = 'WhatsApp trigger failed'
  } else if (!booking.ewayBillNumber || isEwayBillExpired) {
    statusTier = 'ATTENTION REQUIRED'
    badgeVariant = 'warning'
    if (!booking.ewayBillNumber) {
      riskSummary = 'Shipment attention required: E-Way Bill documentation missing.'
      whyReason = 'E-Way Bill missing'
    } else {
      riskSummary = 'Shipment attention required: E-Way Bill validity has expired.'
      whyReason = 'E-Way Bill expired'
    }
  } else if (booking.status === 'Pending') {
    statusTier = 'LOW RISK'
    badgeVariant = 'info'
    riskSummary = 'Booking created. Awaiting counterparty confirmation before dispatch.'
    whyReason = 'Booking pending confirmation'
  } else if (crossedCount === 0 && booking.status === 'Confirmed') {
    statusTier = 'LOW RISK'
    badgeVariant = 'info'
    riskSummary = 'Booking confirmed. Awaiting vehicle departure from origin.'
    whyReason = 'Booking confirmed, awaiting initial checkpoint check-in'
  }

  // Estimated Arrival time based on remaining milestones
  const remainingCheckpoints = Math.max(1, totalCheckpoints - crossedCount)
  const estimatedHours = Math.max(2, remainingCheckpoints * 6)
  const estimatedArrival = `~${estimatedHours} hours to ${nextMilestoneName}`

  const result: ShipmentRiskAssessment = {
    statusTier,
    badgeVariant,
    progressPercent,
    crossedCount,
    totalCheckpoints,
    currentLocationName,
    nextMilestoneName,
    estimatedArrival,
    isEtaEstimated: true,
    isLocationEstimated: true,
    whyReason,
    requiredActions,
    commercialState: {
      advancePaid: Boolean(booking.advanceConfirmed),
      balancePaid: Boolean(booking.balanceConfirmed),
      advanceAmount,
      balanceAmount,
    },
    riskSummary,
    lastCheckpointAgeHours,
    deliveryOverdueHours,
    isEwayBillExpired,
  }

  if (!options) {
    assessmentCache.set(booking, result)
  }
  return result
}

export interface ControlTowerSummary {
  totalActive: number
  actionRequiredCount: number
  attentionRequiredCount: number
  onTrackCount: number
  completedCount: number
  delayedCount: number
  lowRiskCount: number
  highPriorityActions: Array<{
    bookingId: string
    loadRoute: string
    statusTier: ShipmentRiskAssessment['statusTier']
    whyReason: string
  }>
}

export function summarizeActiveShipmentsControlTower(
  bookings: BookingData[],
  options?: AssessShipmentOptions
): ControlTowerSummary {
  let actionRequiredCount = 0
  let attentionRequiredCount = 0
  let onTrackCount = 0
  let completedCount = 0
  let delayedCount = 0
  let lowRiskCount = 0
  const highPriorityActions: ControlTowerSummary['highPriorityActions'] = []

  for (const bk of bookings) {
    const intel = assessShipmentIntelligence(bk, options)
    switch (intel.statusTier) {
      case 'ACTION REQUIRED':
        actionRequiredCount++
        highPriorityActions.push({
          bookingId: bk.id,
          loadRoute: `${bk.load?.loadingAddress || 'Origin'} ➔ ${bk.load?.unloadingAddress || 'Destination'}`,
          statusTier: intel.statusTier,
          whyReason: intel.whyReason,
        })
        break
      case 'DELAYED':
        delayedCount++
        highPriorityActions.push({
          bookingId: bk.id,
          loadRoute: `${bk.load?.loadingAddress || 'Origin'} ➔ ${bk.load?.unloadingAddress || 'Destination'}`,
          statusTier: intel.statusTier,
          whyReason: intel.whyReason,
        })
        break
      case 'ATTENTION REQUIRED':
        attentionRequiredCount++
        highPriorityActions.push({
          bookingId: bk.id,
          loadRoute: `${bk.load?.loadingAddress || 'Origin'} ➔ ${bk.load?.unloadingAddress || 'Destination'}`,
          statusTier: intel.statusTier,
          whyReason: intel.whyReason,
        })
        break
      case 'ON TRACK':
        onTrackCount++
        break
      case 'LOW RISK':
        lowRiskCount++
        break
      case 'COMPLETED':
        completedCount++
        break
    }
  }

  return {
    totalActive: bookings.length,
    actionRequiredCount,
    attentionRequiredCount,
    onTrackCount,
    completedCount,
    delayedCount,
    lowRiskCount,
    highPriorityActions,
  }
}
