/**
 * LorryCarry Logistics Intelligence — Trust & Risk Engine
 * Deterministic, rule-based risk evaluation using empirical database signals.
 * Does NOT label users as "fraudulent".
 * Uses transparent risk tiers: LOW RISK, REVIEW, HIGH ATTENTION with explicit reasons.
 * No automated bans — Admin review remains 100% authoritative.
 */

export type RiskTier = 'LOW RISK' | 'REVIEW' | 'HIGH ATTENTION'

export interface RiskEvaluationEvidence {
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  cancellationRatePercent: number
  failedPaymentsCount: number
  totalTrucks: number
  verifiedTrucks: number
  pendingDocumentsCount: number
  accountAgeDays: number
}

export interface RiskEvaluationResult {
  userId: string
  userName?: string
  userPhone?: string
  role?: string
  riskTier: RiskTier
  riskScore: number // 0 to 100
  reasons: string[]
  evidence: RiskEvaluationEvidence
  evaluatedAt: string
}

interface UserRiskInput {
  id: string
  name?: string | null
  phone?: string | null
  role?: string
  createdAt?: string | Date
}

interface BookingRiskInput {
  id: string
  status: string
  createdAt?: string | Date
}

interface PaymentRiskInput {
  id: string
  status: string
  failureReason?: string | null
}

interface TruckRiskInput {
  id: string
  verificationStatus: string
}

interface DocumentRiskInput {
  id: string
  verificationStatus: string
}

/**
 * Deterministically evaluates user trust & risk profile based on actual platform activity
 */
export function evaluateUserTrustAndRisk(
  user: UserRiskInput,
  bookings: BookingRiskInput[] = [],
  payments: PaymentRiskInput[] = [],
  trucks: TruckRiskInput[] = [],
  documents: DocumentRiskInput[] = []
): RiskEvaluationResult {
  let riskScore = 0
  const reasons: string[] = []

  const totalBookings = bookings.length
  const completedBookings = bookings.filter((b) => b.status === 'Completed').length
  const cancelledBookings = bookings.filter((b) => b.status === 'Cancelled').length
  const cancellationRatePercent =
    totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0

  const failedPaymentsCount = payments.filter((p) => p.status === 'Failed').length
  const totalTrucks = trucks.length
  const verifiedTrucks = trucks.filter((t) => t.verificationStatus === 'Verified').length
  const pendingDocumentsCount = documents.filter((d) => d.verificationStatus === 'Pending' || d.verificationStatus === 'Rejected').length

  const userCreated = user.createdAt ? new Date(user.createdAt) : new Date()
  const accountAgeDays = Math.max(0, Math.floor((Date.now() - userCreated.getTime()) / (1000 * 60 * 60 * 24)))

  // ── RULE 1: Repeated Cancellations Signal ──
  if (totalBookings >= 3 && cancellationRatePercent >= 35) {
    riskScore += 30
    reasons.push(`High booking cancellation rate (${cancellationRatePercent}% cancelled out of ${totalBookings} trips)`)
  }

  // ── RULE 2: Failed Payment Signal ──
  if (failedPaymentsCount >= 2) {
    riskScore += 30
    reasons.push(`Multiple failed payment attempts detected (${failedPaymentsCount} payment failures)`)
  } else if (failedPaymentsCount === 1) {
    riskScore += 10
    reasons.push(`Single failed payment attempt recorded`)
  }

  // ── RULE 3: Vehicle & Document Compliance Signal ──
  if (totalTrucks > 0 && verifiedTrucks === 0) {
    riskScore += 25
    reasons.push(`Registered vehicles awaiting KYC document verification (${totalTrucks} unverified lorries)`)
  }
  if (pendingDocumentsCount >= 2) {
    riskScore += 15
    reasons.push(`Unresolved or rejected compliance documents (${pendingDocumentsCount} documents pending)`)
  }

  // ── RULE 4: Account Age & Velocity Signal ──
  if (accountAgeDays <= 7 && totalBookings >= 5) {
    riskScore += 20
    reasons.push(`Unusually high booking velocity on new account (${totalBookings} trips in first ${accountAgeDays} days)`)
  } else if (accountAgeDays <= 3) {
    riskScore += 5
    reasons.push(`New account registered within last 3 days`)
  }

  // Cap risk score between 0 and 100
  riskScore = Math.min(100, Math.max(0, riskScore))

  // Determine Risk Tier
  let riskTier: RiskTier = 'LOW RISK'
  if (riskScore >= 50) {
    riskTier = 'HIGH ATTENTION'
  } else if (riskScore >= 20) {
    riskTier = 'REVIEW'
  }

  if (reasons.length === 0) {
    reasons.push('Clean platform operating history; zero risk anomalies detected')
  }

  return {
    userId: user.id,
    userName: user.name || 'Account User',
    userPhone: user.phone || 'N/A',
    role: user.role || 'User',
    riskTier,
    riskScore,
    reasons,
    evidence: {
      totalBookings,
      completedBookings,
      cancelledBookings,
      cancellationRatePercent,
      failedPaymentsCount,
      totalTrucks,
      verifiedTrucks,
      pendingDocumentsCount,
      accountAgeDays,
    },
    evaluatedAt: new Date().toISOString(),
  }
}
