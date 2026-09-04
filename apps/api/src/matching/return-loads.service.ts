import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { prisma, Prisma } from '@lorrycarry/database'
import {
  calculateGeoDistance,
  evaluateBackhaulOpportunities,
  rankReturnLoadOpportunities,
  LoadItem,
  TruckItem,
  RankedReturnLoad,
  ReturnLoadRankFactor,
} from '@lorrycarry/shared'
import {
  RETURN_LOAD_DEFAULT_LIMIT,
  RETURN_LOAD_DEFAULT_RADIUS_KM,
  RETURN_LOAD_MAX_LIMIT,
  RETURN_LOAD_MAX_RADIUS_KM,
} from './dto/return-loads-query.dto'

/** How many raw candidates are pulled from the load board before ranking. */
const CANDIDATE_QUERY_LIMIT = 100

/** Booking states that tell us where the lorry is (or will shortly be) empty. */
const DROP_OFF_BOOKING_STATUSES = ['Completed', 'InTransit', 'Confirmed']

export type ReturnLoadAnchorSource =
  | 'query_override'
  | 'booking_destination'
  | 'truck_current_location'
  | 'preferred_destination'
  | 'unresolved'

/** The hub the lorry runs empty from — the origin of every return-load search. */
export interface ReturnLoadAnchor {
  lat: number | null
  lng: number | null
  label: string
  source: ReturnLoadAnchorSource
  /** Booking the destination was derived from, when `source = booking_destination`. */
  bookingId?: string
  bookingStatus?: string
  droppedAt?: string | null
  detail: string
}

export interface ReturnLoadContact {
  /** `true` when the shipper's phone/name are withheld behind the paywall. */
  locked: boolean
  name: string | null
  phone: string | null
  message?: string
}

export interface ReturnLoadOpportunityDto {
  loadId: string
  rank: number
  rankScore: number
  rankFactors: ReturnLoadRankFactor[]
  matchScore: number
  matchRating: string
  matchResult: RankedReturnLoad['matchResult']
  routeLabel: string
  loadingAddress: string
  unloadingAddress: string
  tonnageRequired: number
  truckType: string
  estimatedFreight: number
  benchmarkFreight: number
  rateVsBenchmark: number
  pickupDistanceFromDestinationKm: number
  potentialEmptyRunReductionKm: number
  payloadUtilizationPct: number
  payloadCompatible: boolean
  bodyTypeCompatible: boolean
  bodyTypeExact: boolean
  budgetFit: boolean
  preferredCorridor: boolean
  urgent: boolean
  postedAt: string | null
  isReturnLoad: true
  contact: ReturnLoadContact
  disclaimer: string
}

export interface ReturnLoadsResult {
  truck: {
    id: string
    registrationNumber: string | null
    bodyType: string
    tonnageCapacity: number
    verificationStatus: string | null
    currentLat: number | null
    currentLng: number | null
    preferredDestinations: string[]
  }
  anchor: ReturnLoadAnchor
  radiusKm: number
  candidatesEvaluated: number
  totalRanked: number
  contactUnlocked: boolean
  generatedAt: string
  disclaimer: string
  opportunities: ReturnLoadOpportunityDto[]
}

/**
 * Return-load (backhaul) discovery for truck drivers.
 *
 * Answers "what can I carry home instead of running empty?" using the real
 * truck record (current GPS position, preferred corridors, most recent booking
 * destination), the live open load board, and the shared intelligence engines
 * (`evaluateBackhaulOpportunities` + `rankReturnLoadOpportunities`) so the API,
 * web and mobile surfaces all agree on the numbers.
 *
 * Contact details stay masked unless the caller holds an active subscription
 * or an in-flight free trial, matching the marketplace paywall.
 */
@Injectable()
export class ReturnLoadsService {
  private readonly logger = new Logger(ReturnLoadsService.name)

  async getReturnLoadsForTruck(
    truckId: string,
    requestingUserId?: string,
    options: {
      radiusKm?: number
      limit?: number
      minScore?: number
      destinationLat?: number
      destinationLng?: number
    } = {},
  ): Promise<ReturnLoadsResult> {
    const truck = await (prisma as any).truck.findUnique({
      where: { id: truckId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    })
    if (!truck) throw new NotFoundException('Truck not found')

    const radiusKm = this.normalizeRadius(options.radiusKm)
    const limit = this.normalizeLimit(options.limit)
    const minScore = this.toOptionalNumber(options.minScore) ?? 0

    const anchor = await this.resolveAnchor(truck, options.destinationLat, options.destinationLng)
    const candidates = await this.findCandidateLoads(truck, anchor, radiusKm)

    const preferredDestinations = this.toStringArray(truck.preferredDestinations)
    const tonnageCapacity = this.toNumber(truck.tonnageCapacity)

    // The scoring "truck" is positioned at the drop-off hub, not at its last
    // known GPS ping: proximity must be measured from where the lorry goes empty.
    const hubTruck: TruckItem = {
      id: String(truck.id),
      registrationNumber: truck.registrationNumber ?? undefined,
      bodyType: truck.bodyType ?? 'Open',
      tonnageCapacity,
      currentLat: anchor.lat ?? this.toOptionalNumber(truck.currentLat),
      currentLng: anchor.lng ?? this.toOptionalNumber(truck.currentLng),
      serviceableRadiusKm: radiusKm,
      preferredDestinations,
      verificationStatus: truck.verificationStatus ?? undefined,
    }

    const loadItems = candidates.map((load) => this.toLoadItem(load))
    const opportunities = evaluateBackhaulOpportunities(
      hubTruck,
      loadItems,
      anchor.lat !== null && anchor.lng !== null
        ? { lat: anchor.lat, lng: anchor.lng, label: anchor.label }
        : undefined,
      { maxProximityKm: radiusKm, budget: true },
    )

    const ranked = rankReturnLoadOpportunities(opportunities, hubTruck, { radiusKm, tonnageCapacity })
    const filtered = ranked.filter((opportunity) => opportunity.rankScore >= minScore)

    const contactUnlocked = await this.hasContactAccess(requestingUserId)
    const rawById = new Map(candidates.map((load) => [String(load.id), load]))

    return {
      truck: {
        id: String(truck.id),
        registrationNumber: truck.registrationNumber ?? null,
        bodyType: truck.bodyType ?? 'Open',
        tonnageCapacity,
        verificationStatus: truck.verificationStatus ?? null,
        currentLat: this.toOptionalNumber(truck.currentLat) ?? null,
        currentLng: this.toOptionalNumber(truck.currentLng) ?? null,
        preferredDestinations,
      },
      anchor,
      radiusKm,
      candidatesEvaluated: candidates.length,
      totalRanked: filtered.length,
      contactUnlocked,
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Indicative return-load opportunities. Freight values are benchmark estimates and every pickup remains subject to shipper confirmation.',
      opportunities: filtered
        .slice(0, limit)
        .map((opportunity) =>
          this.toOpportunityDto(opportunity, rawById.get(String(opportunity.loadId)), contactUnlocked, tonnageCapacity),
        ),
    }
  }

  // ────────────────────────────────────────────────
  // Drop-off hub resolution
  // ────────────────────────────────────────────────

  /**
   * Resolves the hub the lorry runs empty from, in priority order:
   * 1. explicit `destinationLat`/`destinationLng` override from the client,
   * 2. the unloading point of the most recent completed / in-flight booking,
   * 3. the truck's last known GPS position,
   * 4. the first declared preferred corridor (text-only, no coordinates).
   */
  private async resolveAnchor(
    truck: any,
    destinationLat?: number,
    destinationLng?: number,
  ): Promise<ReturnLoadAnchor> {
    const lat = this.toOptionalNumber(destinationLat)
    const lng = this.toOptionalNumber(destinationLng)
    if (lat !== undefined && lng !== undefined) {
      return {
        lat,
        lng,
        label: 'Selected destination',
        source: 'query_override',
        detail: 'Drop-off hub supplied by the caller',
      }
    }

    const booking = await this.findRecentDropOff(truck.id)
    const bookingLat = this.toOptionalNumber(booking?.load?.unloadingLat)
    const bookingLng = this.toOptionalNumber(booking?.load?.unloadingLng)
    if (booking && bookingLat !== undefined && bookingLng !== undefined) {
      return {
        lat: bookingLat,
        lng: bookingLng,
        label: booking.load?.unloadingAddress || 'Last delivery destination',
        source: 'booking_destination',
        bookingId: String(booking.id),
        bookingStatus: booking.status,
        droppedAt: booking.completedAt ? new Date(booking.completedAt).toISOString() : null,
        detail: `Derived from ${booking.status === 'Completed' ? 'the last completed' : 'the current'} trip drop-off point`,
      }
    }

    const currentLat = this.toOptionalNumber(truck.currentLat)
    const currentLng = this.toOptionalNumber(truck.currentLng)
    if (currentLat !== undefined && currentLng !== undefined) {
      return {
        lat: currentLat,
        lng: currentLng,
        label: 'Current vehicle position',
        source: 'truck_current_location',
        detail: 'No recent trip destination on record — using the last known GPS position',
      }
    }

    const preferred = this.toStringArray(truck.preferredDestinations)
    if (preferred.length > 0) {
      return {
        lat: null,
        lng: null,
        label: preferred[0],
        source: 'preferred_destination',
        detail: 'No coordinates available — scanning the declared preferred corridors by name',
      }
    }

    return {
      lat: null,
      lng: null,
      label: 'Unknown hub',
      source: 'unresolved',
      detail: 'Add a current location, a preferred corridor, or complete a trip to sharpen return-load discovery',
    }
  }

  /** Most recent booking whose destination tells us where the lorry unloads. */
  private async findRecentDropOff(truckId: string): Promise<any | null> {
    try {
      return await (prisma as any).booking.findFirst({
        where: { truckId, status: { in: DROP_OFF_BOOKING_STATUSES } },
        orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          status: true,
          completedAt: true,
          load: {
            select: {
              unloadingAddress: true,
              unloadingLat: true,
              unloadingLng: true,
            },
          },
        },
      })
    } catch (e) {
      this.logger.warn(`Recent drop-off lookup failed for truck=${truckId}: ${(e as Error).message}`)
      return null
    }
  }

  // ────────────────────────────────────────────────
  // Candidate discovery
  // ────────────────────────────────────────────────

  /**
   * Open loads whose pickup sits within `radiusKm` of the drop-off hub and
   * whose tonnage fits the lorry. The operator's own freight is excluded — a
   * transporter must not be offered their own postings as a return haul.
   */
  private async findCandidateLoads(truck: any, anchor: ReturnLoadAnchor, radiusKm: number): Promise<any[]> {
    const tonnageCapacity = this.toNumber(truck.tonnageCapacity)

    if (anchor.lat === null || anchor.lng === null) {
      return this.findCandidateLoadsByCorridor(truck, anchor, tonnageCapacity)
    }

    try {
      const query = Prisma.sql`
        SELECT
          l.id,
          l.user_id as "userId",
          l.tonnage_required as "tonnageRequired",
          l.loading_address as "loadingAddress",
          l.loading_pin as "loadingPin",
          l.loading_lat as "loadingLat",
          l.loading_lng as "loadingLng",
          l.unloading_address as "unloadingAddress",
          l.unloading_pin as "unloadingPin",
          l.unloading_lat as "unloadingLat",
          l.unloading_lng as "unloadingLng",
          l.truck_type as "truckType",
          l.min_length_ft as "minLengthFt",
          l.min_height_ft as "minHeightFt",
          l.urgent,
          l.max_price as "maxPrice",
          l.expected_delivery_at as "expectedDeliveryAt",
          l.created_at as "createdAt",
          u.phone as "ownerPhone",
          u.name as "ownerName",
          ST_Distance(l.loading_point::geography, ST_SetSRID(ST_MakePoint(${anchor.lng}, ${anchor.lat}), 4326)::geography) / 1000 as "pickupDistanceKm"
        FROM loads l
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.status = 'Open'
          AND l.tonnage_required <= ${tonnageCapacity}
          AND l.user_id <> ${truck.userId}
          AND l.loading_point IS NOT NULL
          AND ST_DWithin(l.loading_point::geography, ST_SetSRID(ST_MakePoint(${anchor.lng}, ${anchor.lat}), 4326)::geography, ${radiusKm * 1000})
        ORDER BY "pickupDistanceKm" ASC
        LIMIT ${CANDIDATE_QUERY_LIMIT}
      `
      const rows = await (prisma.$queryRaw as any)(query)
      return (rows ?? []).map((row: any) => ({
        ...row,
        pickupDistanceKm: this.toNumber(row.pickupDistanceKm),
      }))
    } catch (e) {
      this.logger.warn(`PostGIS return-load search failed, falling back to JS distance filter: ${(e as Error).message}`)
      return this.findCandidateLoadsInMemory(truck, anchor, radiusKm, tonnageCapacity)
    }
  }

  /** PostGIS-free fallback: fetch open loads and filter by Haversine distance. */
  private async findCandidateLoadsInMemory(
    truck: any,
    anchor: ReturnLoadAnchor,
    radiusKm: number,
    tonnageCapacity: number,
  ): Promise<any[]> {
    const loads = await (prisma as any).load.findMany({
      where: {
        status: 'Open',
        tonnageRequired: { lte: tonnageCapacity },
        userId: { not: truck.userId },
      },
      orderBy: { createdAt: 'desc' },
      take: CANDIDATE_QUERY_LIMIT,
      include: { user: { select: { phone: true, name: true } } },
    })

    return (loads ?? [])
      .map((load: any) => {
        const loadingLat = this.toOptionalNumber(load.loadingLat)
        const loadingLng = this.toOptionalNumber(load.loadingLng)
        const pickupDistanceKm =
          loadingLat !== undefined && loadingLng !== undefined && anchor.lat !== null && anchor.lng !== null
            ? calculateGeoDistance(anchor.lat, anchor.lng, loadingLat, loadingLng)
            : undefined
        return {
          ...load,
          ownerPhone: load.user?.phone ?? null,
          ownerName: load.user?.name ?? null,
          pickupDistanceKm,
        }
      })
      .filter((load: any) => load.pickupDistanceKm === undefined || load.pickupDistanceKm <= radiusKm)
  }

  /**
   * Corridor fallback used when neither the truck nor its trips expose
   * coordinates: match open freight whose pickup city text matches one of the
   * operator's declared preferred destinations.
   */
  private async findCandidateLoadsByCorridor(
    truck: any,
    anchor: ReturnLoadAnchor,
    tonnageCapacity: number,
  ): Promise<any[]> {
    const preferred = this.toStringArray(truck.preferredDestinations)
    const where: any = {
      status: 'Open',
      tonnageRequired: { lte: tonnageCapacity },
      userId: { not: truck.userId },
    }
    if (preferred.length > 0) {
      where.OR = preferred.map((destination) => ({
        loadingAddress: { contains: destination, mode: 'insensitive' },
      }))
    }

    try {
      const loads = await (prisma as any).load.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: CANDIDATE_QUERY_LIMIT,
        include: { user: { select: { phone: true, name: true } } },
      })
      return (loads ?? []).map((load: any) => ({
        ...load,
        ownerPhone: load.user?.phone ?? null,
        ownerName: load.user?.name ?? null,
      }))
    } catch (e) {
      this.logger.warn(`Corridor return-load search failed for hub=${anchor.label}: ${(e as Error).message}`)
      return []
    }
  }

  // ────────────────────────────────────────────────
  // Paywall
  // ────────────────────────────────────────────────

  /**
   * Contact reveal requires an active paid subscription OR an in-flight
   * 3-month free trial — the same gate the marketplace search applies.
   */
  private async hasContactAccess(userId?: string): Promise<boolean> {
    if (!userId) return false
    const now = new Date()
    try {
      const subscription = await (prisma as any).subscription.findFirst({
        where: { userId, status: 'active', expiresAt: { gt: now } },
        select: { id: true },
      })
      if (subscription) return true
    } catch (e) {
      this.logger.warn(`Subscription lookup failed for user=${userId}: ${(e as Error).message}`)
    }

    try {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { trialStartedAt: true, trialEndsAt: true },
      })
      return Boolean(
        user?.trialStartedAt && user?.trialEndsAt && new Date(user.trialEndsAt).getTime() > now.getTime(),
      )
    } catch (e) {
      this.logger.warn(`Trial lookup failed for user=${userId}: ${(e as Error).message}`)
      return false
    }
  }

  // ────────────────────────────────────────────────
  // Mapping helpers
  // ────────────────────────────────────────────────

  private toOpportunityDto(
    opportunity: RankedReturnLoad,
    rawLoad: any,
    contactUnlocked: boolean,
    tonnageCapacity: number,
  ): ReturnLoadOpportunityDto {
    const contact: ReturnLoadContact = contactUnlocked
      ? {
          locked: false,
          name: opportunity.ownerName ?? null,
          phone: opportunity.ownerPhone ?? null,
        }
      : {
          locked: true,
          name: null,
          phone: null,
          message: 'Subscribe or start your free trial to reveal shipper contact details.',
        }

    return {
      loadId: opportunity.loadId,
      rank: opportunity.rank,
      rankScore: opportunity.rankScore,
      rankFactors: opportunity.rankFactors,
      matchScore: opportunity.matchScore,
      matchRating: opportunity.matchResult.rating,
      matchResult: opportunity.matchResult,
      routeLabel: opportunity.routeLabel,
      loadingAddress: opportunity.loadingAddress,
      unloadingAddress: opportunity.unloadingAddress,
      tonnageRequired: opportunity.tonnageRequired,
      truckType: opportunity.truckType,
      estimatedFreight: opportunity.estimatedFreight,
      benchmarkFreight: opportunity.benchmarkFreight,
      rateVsBenchmark: opportunity.rateVsBenchmark,
      pickupDistanceFromDestinationKm: Math.round(opportunity.pickupDistanceFromDestinationKm * 10) / 10,
      potentialEmptyRunReductionKm: opportunity.potentialEmptyRunReductionKm,
      payloadUtilizationPct: opportunity.payloadUtilizationPct,
      payloadCompatible: tonnageCapacity > 0 && opportunity.tonnageRequired <= tonnageCapacity,
      bodyTypeCompatible: opportunity.bodyTypeCompatible,
      bodyTypeExact: opportunity.bodyTypeExact,
      budgetFit: opportunity.budgetFit,
      preferredCorridor: opportunity.preferredCorridor,
      urgent: Boolean(rawLoad?.urgent),
      postedAt: rawLoad?.createdAt ? new Date(rawLoad.createdAt).toISOString() : null,
      isReturnLoad: true,
      contact,
      disclaimer: opportunity.disclaimer,
    }
  }

  /** Normalises a Prisma model or raw SQL row into the shared {@link LoadItem} shape. */
  private toLoadItem(load: any): LoadItem {
    return {
      id: String(load.id ?? ''),
      tonnageRequired: this.toNumber(load.tonnageRequired ?? load.tonnage_required),
      loadingAddress: load.loadingAddress ?? load.loading_address ?? undefined,
      loadingPin: load.loadingPin ?? load.loading_pin ?? undefined,
      loadingLat: this.toOptionalNumber(load.loadingLat ?? load.loading_lat),
      loadingLng: this.toOptionalNumber(load.loadingLng ?? load.loading_lng),
      unloadingAddress: load.unloadingAddress ?? load.unloading_address ?? undefined,
      unloadingPin: load.unloadingPin ?? load.unloading_pin ?? undefined,
      unloadingLat: this.toOptionalNumber(load.unloadingLat ?? load.unloading_lat),
      unloadingLng: this.toOptionalNumber(load.unloadingLng ?? load.unloading_lng),
      truckType: load.truckType ?? load.truck_type ?? 'Open',
      minLengthFt: this.toOptionalNumber(load.minLengthFt ?? load.min_length_ft),
      minHeightFt: this.toOptionalNumber(load.minHeightFt ?? load.min_height_ft),
      urgent: Boolean(load.urgent),
      maxPrice: this.toOptionalNumber(load.maxPrice ?? load.max_price) ?? null,
      createdAt: load.createdAt
        ? String(load.createdAt)
        : load.created_at
          ? String(load.created_at)
          : undefined,
      ownerPhone: load.ownerPhone ?? load.user?.phone ?? null,
      ownerName: load.ownerName ?? load.user?.name ?? null,
    }
  }

  private normalizeRadius(radiusKm?: number): number {
    const value = this.toOptionalNumber(radiusKm)
    if (value === undefined) return RETURN_LOAD_DEFAULT_RADIUS_KM
    return Math.min(RETURN_LOAD_MAX_RADIUS_KM, Math.max(1, Math.round(value)))
  }

  private normalizeLimit(limit?: number): number {
    const value = this.toOptionalNumber(limit)
    if (value === undefined) return RETURN_LOAD_DEFAULT_LIMIT
    return Math.min(RETURN_LOAD_MAX_LIMIT, Math.max(1, Math.round(value)))
  }

  private toStringArray(value: any): string[] {
    if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed.map((entry) => String(entry)).filter(Boolean) : []
      } catch {
        return value.trim() ? [value.trim()] : []
      }
    }
    return []
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0
    const n = Number(value)
    return isNaN(n) ? 0 : n
  }

  private toOptionalNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const n = Number(value)
    return isNaN(n) ? undefined : n
  }
}
