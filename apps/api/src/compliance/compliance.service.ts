import { Injectable, ForbiddenException, Logger, NotFoundException } from '@nestjs/common'
import { prisma, Prisma, EwayBillStatus, FastagStatus, VerificationStatus } from '@lorrycarry/database'
import { VahanService, VahanRCValidationResult } from '../common/services/vahan.service'

export type ComplianceItemStatus = 'compliant' | 'action_required' | 'pending' | 'expired'

export interface ComplianceItem {
  key: string
  label: string
  status: ComplianceItemStatus
  detail: string
  /** Where the status came from: live Vahan record, attached booking data or operator input. */
  source: 'vahan_api' | 'sandbox' | 'booking' | 'manual' | 'document'
  verifiedAt?: string
  expiresAt?: string
}

export interface ComplianceChecklist {
  scope: 'truck' | 'booking'
  scopeId: string
  registrationNumber?: string
  overall: ComplianceItemStatus
  items: ComplianceItem[]
  checkedAt: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Verification & Compliance engine.
 *
 * Builds the operator-facing compliance checklist for trucks and bookings:
 * RC validation (Vahan), insurance, fitness, PUC, national permit, FASTag
 * readiness and E-Way Bill lifecycle.
 */
@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name)

  constructor(private readonly vahan: VahanService) {}

  // ── Truck checklist ────────────────────────────────────────────────────────

  async getTruckCompliance(truckId: string, requesterId: string, requesterRole: string): Promise<ComplianceChecklist> {
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        documents: {
          select: { type: true, verificationStatus: true, verifiedAt: true },
        },
      },
    })

    if (!truck) throw new NotFoundException('Truck not found')
    this.assertAccess(truck.userId, requesterId, requesterRole, 'truck')

    const items: ComplianceItem[] = [
      this.buildRcItem(truck.vahanValidatedAt, truck.vahanDetails as Record<string, unknown> | null),
      this.buildInsuranceItem(
        truck.documents,
        truck.vahanDetails as Record<string, unknown> | null,
      ),
      ...this.buildVahanExpiryItems(truck.vahanDetails as Record<string, unknown> | null),
      this.buildFastagItem(truck.fastagStatus, truck.fastagUpdatedAt),
    ]

    return {
      scope: 'truck',
      scopeId: truck.id,
      registrationNumber: truck.registrationNumber,
      overall: this.computeOverall(items),
      items,
      checkedAt: new Date().toISOString(),
    }
  }

  /**
   * Run a fresh Vahan RC validation for a truck and persist the snapshot.
   * The platform "Verified" flag itself stays under admin control (KYC queue),
   * but a successful live validation is recorded so marketplace cards can show
   * a "Vahan Verified" badge backed by real data.
   */
  async validateTruckRC(truckId: string, requesterId: string, requesterRole: string) {
    const truck = await prisma.truck.findUnique({ where: { id: truckId } })
    if (!truck) throw new NotFoundException('Truck not found')
    this.assertAccess(truck.userId, requesterId, requesterRole, 'truck')

    const result = await this.vahan.validateRC(truck.registrationNumber)
    const snapshot = this.vahan.toPersistableSnapshot(result)

    await prisma.truck.update({
      where: { id: truckId },
      data: {
        vahanDetails: (snapshot as Prisma.InputJsonValue) ?? undefined,
        vahanValidatedAt: result.found ? new Date() : truck.vahanValidatedAt,
      },
    })

    this.logger.log(
      `Vahan RC validation for ${truck.registrationNumber}: valid=${result.valid} source=${result.source}`,
    )

    const checklist = await this.getTruckCompliance(truckId, requesterId, requesterRole)
    return { validation: result, checklist }
  }

  async updateFastag(
    truckId: string,
    requesterId: string,
    requesterRole: string,
    status: 'Active' | 'LowBalance' | 'Inactive',
  ) {
    const truck = await prisma.truck.findUnique({ where: { id: truckId } })
    if (!truck) throw new NotFoundException('Truck not found')
    this.assertAccess(truck.userId, requesterId, requesterRole, 'truck')

    const updated = await prisma.truck.update({
      where: { id: truckId },
      data: { fastagStatus: status as FastagStatus, fastagUpdatedAt: new Date() },
    })

    const checklist = await this.getTruckCompliance(truckId, requesterId, requesterRole)
    return { truck: { id: updated.id, fastagStatus: updated.fastagStatus }, checklist }
  }

  // ── Booking checklist ──────────────────────────────────────────────────────

  async getBookingCompliance(
    bookingId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<ComplianceChecklist> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        truck: {
          include: {
            documents: { select: { type: true, verificationStatus: true, verifiedAt: true } },
          },
        },
      },
    })

    if (!booking) throw new NotFoundException('Booking not found')
    this.assertAccess(
      [booking.loadOwnerId, booking.truckOwnerId].includes(requesterId) ? requesterId : null,
      requesterId,
      requesterRole,
      'booking',
    )

    const truck = booking.truck
    const items: ComplianceItem[] = [
      this.buildRcItem(truck.vahanValidatedAt, truck.vahanDetails as Record<string, unknown> | null),
      this.buildInsuranceItem(truck.documents, truck.vahanDetails as Record<string, unknown> | null),
      this.buildEwayBillItem(
        booking.ewayBillNumber,
        booking.ewayBillStatus as EwayBillStatus,
        booking.ewayBillValidUpto,
        booking.ewayBillUpdatedAt,
      ),
      this.buildFastagItem(truck.fastagStatus, truck.fastagUpdatedAt),
    ]

    return {
      scope: 'booking',
      scopeId: booking.id,
      registrationNumber: truck.registrationNumber,
      overall: this.computeOverall(items),
      items,
      checkedAt: new Date().toISOString(),
    }
  }

  /**
   * Attach / update the E-Way Bill number on a booking.
   * The consignor (load owner) generates the bill on the GST portal; the
   * platform validates the 12-digit format and tracks validity.
   */
  async updateEwayBill(
    bookingId: string,
    requesterId: string,
    requesterRole: string,
    ewayBillNumber?: string | null,
    validUpto?: string,
  ) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (requesterRole !== 'admin' && booking.loadOwnerId !== requesterId) {
      throw new ForbiddenException('Only the load owner who created this booking can manage its E-Way Bill')
    }

    let nextStatus: EwayBillStatus = EwayBillStatus.Pending
    let nextValidUpto: Date | null = null

    if (ewayBillNumber) {
      nextStatus = EwayBillStatus.Active
      const suggested = this.suggestValidity(booking.createdAt, Number(booking.agreedPrice))
      nextValidUpto = validUpto ? this.parseDateOrThrow(validUpto) : suggested
      // If the operator gave an already-past validity, record it as expired.
      if (nextValidUpto.getTime() < Date.now()) {
        nextStatus = EwayBillStatus.Expired
      }
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ewayBillNumber: ewayBillNumber || null,
        ewayBillStatus: ewayBillNumber ? nextStatus : EwayBillStatus.Pending,
        ewayBillValidUpto: ewayBillNumber ? nextValidUpto : null,
        ewayBillUpdatedAt: new Date(),
      },
    })

    const checklist = await this.getBookingCompliance(bookingId, requesterId, requesterRole)
    return {
      ewayBill: {
        ewayBillNumber: updated.ewayBillNumber,
        ewayBillStatus: updated.ewayBillStatus,
        ewayBillValidUpto: updated.ewayBillValidUpto,
        ewayBillUpdatedAt: updated.ewayBillUpdatedAt,
      },
      checklist,
    }
  }

  /**
   * Refresh E-Way Bill lifecycle states that can lapse on their own
   * (Active → Expired once past the validity window).
   */
  private buildEwayBillItem(
    number?: string | null,
    status?: EwayBillStatus,
    validUpto?: Date | null,
    updatedAt?: Date | null,
  ): ComplianceItem {
    if (!number) {
      return {
        key: 'eway_bill',
        label: 'E-Way Bill',
        status: 'pending',
        detail:
          'No E-Way Bill attached yet. Consignor must generate it on the GST/NIC portal for consignments above ₹50,000 and attach the 12-digit number.',
        source: 'booking',
      }
    }

    const formatValid = /^\d{12}$/.test(number)
    if (!formatValid) {
      return {
        key: 'eway_bill',
        label: 'E-Way Bill',
        status: 'action_required',
        detail: `Attached number "${number}" is not a valid 12-digit E-Way Bill reference. Please re-enter it.`,
        source: 'booking',
      }
    }

    if (validUpto && validUpto.getTime() < Date.now()) {
      return {
        key: 'eway_bill',
        label: 'E-Way Bill',
        status: 'expired',
        detail: `E-Way Bill #${number} expired on ${validUpto.toISOString().slice(0, 10)}. Extend it on the portal and update the validity here.`,
        source: 'booking',
        expiresAt: validUpto.toISOString(),
      }
    }

    const statusLabel =
      status === EwayBillStatus.Expired
        ? `E-Way Bill #${number} is marked expired — extend it on the portal.`
        : `E-Way Bill #${number} is active${validUpto ? ` until ${validUpto.toISOString().slice(0, 10)}` : ''}.`

    return {
      key: 'eway_bill',
      label: 'E-Way Bill',
      status: status === EwayBillStatus.Expired ? 'expired' : 'compliant',
      detail: statusLabel,
      source: 'booking',
      verifiedAt: updatedAt?.toISOString(),
      expiresAt: validUpto?.toISOString(),
    }
  }

  // ── Item builders ──────────────────────────────────────────────────────────

  private buildRcItem(validatedAt?: Date | null, details?: Record<string, unknown> | null): ComplianceItem {
    if (!validatedAt || !details) {
      return {
        key: 'rc_vahan',
        label: 'RC verified via Vahan',
        status: 'pending',
        detail: 'Registration Certificate has not been validated against the Vahan (mParivahan) database yet.',
        source: 'vahan_api',
      }
    }

    const registrationStatus = String(details.registrationStatus || 'ACTIVE').toUpperCase()
    if (registrationStatus === 'INACTIVE' || registrationStatus === 'SUSPENDED' || registrationStatus === 'CANCELLED') {
      return {
        key: 'rc_vahan',
        label: 'RC verified via Vahan',
        status: 'action_required',
        detail: `Vahan reports this RC as ${registrationStatus}. The vehicle cannot be dispatched until the registration is restored.`,
        source: (details.source as ComplianceItem['source']) || 'vahan_api',
        verifiedAt: validatedAt.toISOString(),
      }
    }

    const checked = details.checkedAt ? new Date(String(details.checkedAt)) : validatedAt
    const staleDays = Math.floor((Date.now() - checked.getTime()) / DAY_MS)
    return {
      key: 'rc_vahan',
      label: 'RC verified via Vahan',
      status: 'compliant',
      detail: `Registration is ACTIVE in Vahan records${details.makerModel ? ` · ${details.makerModel}` : ''}${
        details.fuelType ? ` · ${details.fuelType}` : ''
      }${staleDays > 30 ? ` · last checked ${staleDays} days ago` : ''}.`,
      source: (details.source as ComplianceItem['source']) || 'vahan_api',
      verifiedAt: validatedAt.toISOString(),
    }
  }

  private buildInsuranceItem(
    documents: Array<{ type: string; verificationStatus: string; verifiedAt: Date | null }>,
    vahanDetails?: Record<string, unknown> | null,
  ): ComplianceItem {
    const insuranceDoc = documents.find((d) => d.type === 'Insurance')
    const docVerified = insuranceDoc?.verificationStatus === VerificationStatus.Verified
    const insuranceUpto = vahanDetails?.insuranceValidUpto ? String(vahanDetails.insuranceValidUpto) : null
    const expired = insuranceUpto ? new Date(insuranceUpto).getTime() < Date.now() : false

    if (expired) {
      return {
        key: 'insurance',
        label: 'Insurance validity',
        status: 'expired',
        detail: `Vehicle insurance lapsed on ${insuranceUpto}. Renew the policy and re-validate the RC.`,
        source: insuranceUpto ? 'vahan_api' : 'document',
        expiresAt: insuranceUpto ? new Date(insuranceUpto).toISOString() : undefined,
      }
    }

    if (docVerified) {
      return {
        key: 'insurance',
        label: 'Insurance validity',
        status: 'compliant',
        detail: `Insurance document KYC-verified${insuranceUpto ? `, policy valid till ${insuranceUpto}` : ''}.`,
        source: 'document',
        verifiedAt: insuranceDoc?.verifiedAt?.toISOString(),
        expiresAt: insuranceUpto ? new Date(insuranceUpto).toISOString() : undefined,
      }
    }

    return {
      key: 'insurance',
      label: 'Insurance validity',
      status: 'pending',
      detail: 'Insurance document uploaded but awaiting KYC verification, or not yet uploaded.',
      source: 'document',
    }
  }

  private buildVahanExpiryItems(details?: Record<string, unknown> | null): ComplianceItem[] {
    if (!details) return []

    const items: ComplianceItem[] = []

    const fitnessUpto = details.fitnessValidUpto ? String(details.fitnessValidUpto) : null
    if (fitnessUpto) {
      const expired = new Date(fitnessUpto).getTime() < Date.now()
      items.push({
        key: 'fitness',
        label: 'Fitness certificate',
        status: expired ? 'expired' : 'compliant',
        detail: expired
          ? `Fitness certificate expired on ${fitnessUpto}. Book the FC renewal inspection at the RTO.`
          : `Fitness certificate valid till ${fitnessUpto}.`,
        source: 'vahan_api',
        expiresAt: new Date(fitnessUpto).toISOString(),
      })
    }

    const permitUpto = details.permitValidUpto ? String(details.permitValidUpto) : null
    if (permitUpto) {
      const expired = new Date(permitUpto).getTime() < Date.now()
      items.push({
        key: 'permit',
        label: details.permitType ? `${details.permitType}` : 'Permit',
        status: expired ? 'expired' : 'compliant',
        detail: expired
          ? `Permit expired on ${permitUpto} — interstate consignments will be penalised at check posts.`
          : `Permit valid till ${permitUpto}.`,
        source: 'vahan_api',
        expiresAt: new Date(permitUpto).toISOString(),
      })
    }

    const pucUpto = details.pucValidUpto ? String(details.pucValidUpto) : null
    if (pucUpto) {
      const expired = new Date(pucUpto).getTime() < Date.now()
      items.push({
        key: 'puc',
        label: 'PUC certificate',
        status: expired ? 'expired' : 'compliant',
        detail: expired
          ? `PUC expired on ${fitnessUpto ? pucUpto : pucUpto}. Obtain a fresh pollution-under-control certificate.`
          : `PUC valid till ${pucUpto}.`,
        source: 'vahan_api',
        expiresAt: new Date(pucUpto).toISOString(),
      })
    }

    return items
  }

  private buildFastagItem(status?: FastagStatus | null, updatedAt?: Date | null): ComplianceItem {
    switch (status) {
      case FastagStatus.Active:
        return {
          key: 'fastag',
          label: 'FASTag status',
          status: 'compliant',
          detail: 'FASTag is active with sufficient balance — toll plazas will not delay the transit.',
          source: 'manual',
          verifiedAt: updatedAt?.toISOString(),
        }
      case FastagStatus.LowBalance:
        return {
          key: 'fastag',
          label: 'FASTag status',
          status: 'action_required',
          detail: 'FASTag balance is low — recharge now, plaza queues above ₹1,000 will be penalised.',
          source: 'manual',
          verifiedAt: updatedAt?.toISOString(),
        }
      case FastagStatus.Inactive:
        return {
          key: 'fastag',
          label: 'FASTag status',
          status: 'action_required',
          detail: 'FASTag is inactive/blacklisted — the vehicle will be stopped at toll plazas until reactivated.',
          source: 'manual',
          verifiedAt: updatedAt?.toISOString(),
        }
      default:
        return {
          key: 'fastag',
          label: 'FASTag status',
          status: 'pending',
          detail: 'FASTag readiness not yet reported. Confirm the tag is active before dispatch.',
          source: 'manual',
        }
    }
  }

  private computeOverall(items: ComplianceItem[]): ComplianceItemStatus {
    if (items.some((i) => i.status === 'expired')) return 'expired'
    if (items.some((i) => i.status === 'action_required')) return 'action_required'
    if (items.some((i) => i.status === 'pending')) return 'pending'
    return 'compliant'
  }

  /**
   * Suggested E-Way Bill validity: 1 day per 200 km travelled.
   * The platform does not know the exact route length here, so we use the
   * standard 1-day validity floor unless the operator supplies an explicit date.
   */
  private suggestValidity(bookingDate: Date, agreedPrice: number): Date {
    void agreedPrice // price-based consignment value thresholds are handled at the GST portal
    const base = bookingDate.getTime() > Date.now() ? bookingDate.getTime() : Date.now()
    return new Date(base + 1 * DAY_MS)
  }

  private parseDateOrThrow(value: string): Date {
    const date = new Date(value.length === 10 ? `${value}T23:59:59.999Z` : value)
    if (isNaN(date.getTime())) {
      throw new ForbiddenException('validUpto must be a valid ISO date')
    }
    return date
  }

  private assertAccess(
    ownerId: string | null,
    requesterId: string,
    requesterRole: string,
    scope: 'truck' | 'booking',
  ): void {
    if (requesterRole === 'admin') return
    if (ownerId && ownerId === requesterId) return
    throw new ForbiddenException(`You do not have access to this ${scope}'s compliance data`)
  }
}
