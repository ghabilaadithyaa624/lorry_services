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
}

export interface BookingData {
  id: string
  loadId: string
  truckId: string
  agreedPrice: number
  advanceConfirmed: boolean
  advanceConfirmedAt?: string | null
  balanceConfirmed: boolean
  balanceConfirmedAt?: string | null
  ewayBillNumber?: string | null
  liabilityAccepted: boolean
  status: 'Pending' | 'Confirmed' | 'InTransit' | 'Completed' | 'Cancelled'
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  checkpoints?: CheckpointData[]
  load?: {
    tonnageRequired?: number
    loadingAddress?: string
    unloadingAddress?: string
    user?: { name?: string | null; phone: string }
  }
  truck?: {
    registrationNumber?: string
    bodyType?: string
    user?: { name?: string | null; phone: string }
  }
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
    actionType: 'CONFIRM_ADVANCE' | 'CONFIRM_BALANCE' | 'EWAY_BILL' | 'LIABILITY'
  }>
  commercialState: {
    advancePaid: boolean
    balancePaid: boolean
    advanceAmount: number
    balanceAmount: number
  }
  riskSummary: string
}

const assessmentCache = new WeakMap<BookingData, ShipmentRiskAssessment>()

export function assessShipmentIntelligence(booking: BookingData): ShipmentRiskAssessment {
  if (assessmentCache.has(booking)) {
    return assessmentCache.get(booking)!
  }

  const checkpoints = booking.checkpoints || []
  const totalCheckpoints = Math.max(checkpoints.length, 5)
  const crossedCheckpoints = checkpoints.filter(cp => Boolean(cp.crossedAt))
  const crossedCount = crossedCheckpoints.length
  
  const progressPercent = booking.status === 'Completed' ? 100 : Math.round((crossedCount / totalCheckpoints) * 100)
  
  const agreedPrice = Number(booking.agreedPrice) || 0
  const advanceAmount = Math.round(agreedPrice * 0.5)
  const balanceAmount = agreedPrice - advanceAmount

  const requiredActions: ShipmentRiskAssessment['requiredActions'] = []

  // 1. Check commercial terms
  if (!booking.advanceConfirmed && booking.status !== 'Cancelled') {
    requiredActions.push({
      title: '50% Loading Advance Confirmation Pending',
      description: `Release ₹${advanceAmount.toLocaleString('en-IN')} loading advance to transporter upon dispatch confirmation.`,
      urgency: 'HIGH',
      actionType: 'CONFIRM_ADVANCE',
    })
  }

  // 2. Check E-Way Bill compliance
  if (!booking.ewayBillNumber && booking.status !== 'Cancelled' && booking.status !== 'Completed') {
    requiredActions.push({
      title: 'E-Way Bill Number Missing',
      description: 'Indian GST regulations require an active E-Way Bill for consignments above ₹50,000.',
      urgency: 'MEDIUM',
      actionType: 'EWAY_BILL',
    })
  }

  // 3. Check delivery balance
  if (booking.status === 'Completed' && !booking.balanceConfirmed) {
    requiredActions.push({
      title: 'Delivery Balance Confirmation Required',
      description: `Confirm release of remaining ₹${balanceAmount.toLocaleString('en-IN')} balance after verifying unloading & POD.`,
      urgency: 'HIGH',
      actionType: 'CONFIRM_BALANCE',
    })
  }

  // Determine current & next milestone
  let currentLocationName = 'Origin Loading Point'
  let nextMilestoneName = checkpoints[0]?.name || 'Checkpoint 1'

  if (crossedCount > 0) {
    const lastCrossed = crossedCheckpoints[crossedCheckpoints.length - 1]
    currentLocationName = lastCrossed.name
    const nextCp = checkpoints.find(cp => !cp.crossedAt)
    nextMilestoneName = nextCp ? nextCp.name : 'Destination Terminal'
  }

  // Calculate risk status & explicit why explanations
  let statusTier: ShipmentRiskAssessment['statusTier'] = 'ON TRACK'
  let badgeVariant: ShipmentRiskAssessment['badgeVariant'] = 'success'
  let riskSummary = 'Vehicle is moving on schedule along the national corridor.'
  let whyReason = 'Vehicle progressing through checkpoints'

  if (booking.status === 'Completed') {
    statusTier = 'COMPLETED'
    badgeVariant = 'success'
    riskSummary = 'Consignment successfully delivered at destination.'
    whyReason = 'All highway checkpoints crossed & POD verified'
  } else if (!booking.advanceConfirmed && (booking.status === 'InTransit' || booking.status === 'Confirmed')) {
    statusTier = 'ACTION REQUIRED'
    badgeVariant = 'danger'
    riskSummary = 'Shipment action required: 50% loading advance confirmation pending.'
    whyReason = '50% advance confirmation pending'
  } else if (!booking.ewayBillNumber) {
    statusTier = 'ATTENTION REQUIRED'
    badgeVariant = 'warning'
    riskSummary = 'Shipment attention required: E-Way Bill documentation missing.'
    whyReason = 'E-Way Bill missing'
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
      advancePaid: booking.advanceConfirmed,
      balancePaid: booking.balanceConfirmed,
      advanceAmount,
      balanceAmount,
    },
    riskSummary,
  }

  assessmentCache.set(booking, result)
  return result;
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

export function summarizeActiveShipmentsControlTower(bookings: BookingData[]): ControlTowerSummary {
  let actionRequiredCount = 0
  let attentionRequiredCount = 0
  let onTrackCount = 0
  let completedCount = 0
  let delayedCount = 0
  let lowRiskCount = 0
  const highPriorityActions: ControlTowerSummary['highPriorityActions'] = []

  for (const bk of bookings) {
    const intel = assessShipmentIntelligence(bk)
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
      case 'ATTENTION REQUIRED':
        attentionRequiredCount++
        highPriorityActions.push({
          bookingId: bk.id,
          loadRoute: `${bk.load?.loadingAddress || 'Origin'} ➔ ${bk.load?.unloadingAddress || 'Destination'}`,
          statusTier: intel.statusTier,
          whyReason: intel.whyReason,
        })
        break
      case 'DELAYED':
        delayedCount++
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
