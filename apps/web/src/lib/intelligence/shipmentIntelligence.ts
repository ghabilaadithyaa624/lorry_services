/**
 * LorryCarry Logistics Intelligence — Shipment & Transit Intelligence
 * Real-time operational risk classifier, milestone progress, and compliance analyzer.
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

export function assessShipmentIntelligence(booking: BookingData): ShipmentRiskAssessment {
  const checkpoints = booking.checkpoints || []
  const totalCheckpoints = Math.max(checkpoints.length, 5)
  const crossedCheckpoints = checkpoints.filter(cp => Boolean(cp.crossedAt))
  const crossedCount = crossedCheckpoints.length
  
  const progressPercent = Math.round((crossedCount / totalCheckpoints) * 100)
  
  const agreedPrice = Number(booking.agreedPrice) || 0
  const advanceAmount = Math.round(agreedPrice * 0.5)
  const balanceAmount = agreedPrice - advanceAmount

  const requiredActions: ShipmentRiskAssessment['requiredActions'] = []

  // 1. Check commercial terms
  if (!booking.advanceConfirmed && booking.status !== 'Cancelled') {
    requiredActions.push({
      title: '50% Loading Advance Pending',
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

  // Calculate risk status
  let statusTier: ShipmentRiskAssessment['statusTier'] = 'ON TRACK'
  let badgeVariant: ShipmentRiskAssessment['badgeVariant'] = 'success'
  let riskSummary = 'Vehicle is moving on schedule along the national corridor.'

  if (booking.status === 'Completed') {
    statusTier = 'COMPLETED'
    badgeVariant = 'success'
    riskSummary = 'Consignment successfully delivered at destination.'
  } else if (!booking.advanceConfirmed && booking.status === 'InTransit') {
    statusTier = 'ACTION REQUIRED'
    badgeVariant = 'danger'
    riskSummary = 'Shipment is in transit but 50% advance confirmation is pending.'
  } else if (!booking.ewayBillNumber) {
    statusTier = 'ATTENTION REQUIRED'
    badgeVariant = 'warning'
    riskSummary = 'Consignment is in transit without recorded E-Way Bill documentation.'
  } else if (crossedCount === 0 && booking.status === 'Confirmed') {
    statusTier = 'LOW RISK'
    badgeVariant = 'info'
    riskSummary = 'Booking confirmed. Awaiting vehicle departure from origin.'
  }

  // Estimated Arrival time based on remaining milestones
  const remainingCheckpoints = totalCheckpoints - crossedCount
  const estimatedHours = Math.max(4, remainingCheckpoints * 7)
  const estimatedArrival = `${estimatedHours} hours (${nextMilestoneName} ETA)`

  return {
    statusTier,
    badgeVariant,
    progressPercent,
    crossedCount,
    totalCheckpoints,
    currentLocationName,
    nextMilestoneName,
    estimatedArrival,
    requiredActions,
    commercialState: {
      advancePaid: booking.advanceConfirmed,
      balancePaid: booking.balanceConfirmed,
      advanceAmount,
      balanceAmount,
    },
    riskSummary,
  }
}
