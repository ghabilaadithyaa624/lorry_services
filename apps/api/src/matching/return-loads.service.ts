import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { prisma, Prisma, type Load, type Truck } from '@lorrycarry/database'
import {
  EARTH_RADIUS_KM,
  evaluateBackhaulOpportunities,
  rankReturnLoadOpportunities,
  type LoadItem,
  type TruckItem,
  type RankedReturnLoad,
  type ReturnLoadRankFactor,
} from '@lorrycarry/shared'
import {
  RETURN_LOAD_DEFAULT_LIMIT,
  RETURN_LOAD_DEFAULT_RADIUS_KM,
  RETURN_LOAD_MAX_LIMIT,
  RETURN_LOAD_MAX_RADIUS_KM,
} from './dto/return-loads-query.dto'

/** Rank at most the nearest 100 eligible loads; filter in SQL BEFORE this limit. */
const CANDIDATE_QUERY_LIMIT = 100

const truckSelect = {
  id: true,
  userId: true,
  registrationNumber: true,
  bodyType: true,
  tonnageCapacity: true,
  lengthFt: true,
  heightFt: true,
  currentLat: true,
  currentLng: true,
  preferredDestinations: true,
  verificationStatus: true,
} satisfies Prisma.TruckSelect

type ReturnLoadTruck = Pick<Truck, keyof typeof truckSelect>
type CandidateLoad = Pick<Load,
  'id' | 'userId' | 'tonnageRequired' | 'loadingAddress' | 'loadingLat' | 'loadingLng' |
  'unloadingAddress' | 'unloadingLat' | 'unloadingLng' | 'truckType' |
  'minLengthFt' | 'minHeightFt' | 'urgent' | 'maxPrice' | 'createdAt'
> & { pickupDistanceKm: number; ownerPhone?: string | null; ownerName?: string | null }

export interface ReturnLoadsOptions {
  radiusKm?: number
  limit?: number
  minScore?: number
  destinationLat?: number
  destinationLng?: number
}

export type ReturnLoadAnchorSource =
  | 'query_override'
  | 'booking_destination'
  | 'truck_current_location'
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

/** Read-only discovery: no match persistence, booking creation or notifications. */
@Injectable()
export class ReturnLoadsService {
  private readonly logger = new Logger(ReturnLoadsService.name)

  async getReturnLoadsForTruck(
    truckId: string,
    requestingUserId: string,
    options: ReturnLoadsOptions = {},
  ): Promise<ReturnLoadsResult> {
    if (!requestingUserId) throw new UnauthorizedException('Authentication required')
    const { radiusKm, limit, minScore } = this.validateOptions(options)
    const truck = await prisma.truck.findUnique({ where: { id: truckId }, select: truckSelect })
    // Do not disclose another operator's GPS position or booking history.
    if (!truck || truck.userId !== requestingUserId) throw new NotFoundException('Truck not found')

    const anchor = await this.resolveAnchor(truck, options)
    const contactUnlocked = await this.hasContactAccess(requestingUserId)
    const candidates = await this.findCandidateLoads(truck, anchor, radiusKm, contactUnlocked)
    const preferredDestinations = this.toStringArray(truck.preferredDestinations)
    const tonnageCapacity = this.optionalNumber(truck.tonnageCapacity) ?? 0
    const currentLocation = this.coordinates(truck.currentLat, truck.currentLng)

    const hubTruck: TruckItem = {
      id: truck.id,
      registrationNumber: truck.registrationNumber,
      bodyType: truck.bodyType,
      lengthFt: truck.lengthFt,
      heightFt: truck.heightFt,
      tonnageCapacity,
      currentLat: anchor.lat ?? undefined,
      currentLng: anchor.lng ?? undefined,
      serviceableRadiusKm: radiusKm,
      preferredDestinations,
      verificationStatus: truck.verificationStatus,
    }

    // Pass the SAME database proximity distance to both shared scoring engines.
    // Recomputing it as a rounded road estimate would admit/rank loads outside
    // the advertised radius, and used to mishandle valid zero coordinates.
    const opportunities = candidates.flatMap((load) => evaluateBackhaulOpportunities(
      hubTruck,
      [this.toLoadItem(load)],
      undefined,
      { distanceKm: Number(load.pickupDistanceKm), maxProximityKm: radiusKm, budget: true },
    ))
    const ranked = rankReturnLoadOpportunities(opportunities, hubTruck, { radiusKm, tonnageCapacity })
      .filter((opportunity) => opportunity.rankScore >= minScore)
    const rawById = new Map(candidates.map((load) => [load.id, load]))

    return {
      truck: {
        id: truck.id,
        registrationNumber: truck.registrationNumber,
        bodyType: truck.bodyType,
        tonnageCapacity,
        verificationStatus: truck.verificationStatus,
        currentLat: currentLocation?.lat ?? null,
        currentLng: currentLocation?.lng ?? null,
        preferredDestinations,
      },
      anchor,
      radiusKm,
      candidatesEvaluated: candidates.length,
      totalRanked: ranked.length,
      contactUnlocked,
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Indicative return-load opportunities, not confirmed bookings. Pickup proximity is spherical distance; freight and potential empty-run reduction are estimates subject to shipper confirmation.',
      opportunities: ranked.slice(0, limit).map((opportunity) =>
        this.toOpportunityDto(opportunity, rawById.get(opportunity.loadId), contactUnlocked, tonnageCapacity),
      ),
    }
  }

  private async resolveAnchor(truck: ReturnLoadTruck, options: ReturnLoadsOptions): Promise<ReturnLoadAnchor> {
    const override = this.coordinates(options.destinationLat, options.destinationLng)
    if (override) {
      return {
        ...override,
        label: 'Selected destination',
        source: 'query_override',
        detail: 'Drop-off hub supplied by the caller',
      }
    }

    // Restrict to completed trips. PostgreSQL sorts NULL timestamps first for
    // DESC by default; explicit NULLS LAST prevents an undated row taking over.
    const booking = await prisma.booking.findFirst({
      where: { truckId: truck.id, truckOwnerId: truck.userId, status: 'Completed' },
      orderBy: [{ completedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        status: true,
        completedAt: true,
        load: { select: { unloadingAddress: true, unloadingLat: true, unloadingLng: true } },
      },
    })
    const destination = this.coordinates(booking?.load?.unloadingLat, booking?.load?.unloadingLng)
    if (booking && destination) {
      return {
        ...destination,
        label: booking.load.unloadingAddress || 'Last delivery destination',
        source: 'booking_destination',
        bookingId: booking.id,
        bookingStatus: booking.status,
        droppedAt: booking.completedAt?.toISOString() ?? null,
        detail: 'Derived from the latest completed trip destination',
      }
    }

    const current = this.coordinates(truck.currentLat, truck.currentLng)
    if (current) {
      return {
        ...current,
        label: 'Current vehicle position',
        source: 'truck_current_location',
        detail: 'No usable completed-trip destination — using the last known GPS position',
      }
    }

    // A corridor name cannot prove proximity. Never turn missing coordinates
    // into a nationwide load search or invent a 15 km default pickup distance.
    return {
      lat: null,
      lng: null,
      label: 'Unknown hub',
      source: 'unresolved',
      detail: 'Add a valid vehicle location or complete a trip with destination coordinates to discover nearby return loads. Preferred corridors are used for ranking only.',
    }
  }

  private async findCandidateLoads(
    truck: ReturnLoadTruck,
    anchor: ReturnLoadAnchor,
    radiusKm: number,
    contactUnlocked: boolean,
  ): Promise<CandidateLoad[]> {
    const capacity = Number(truck.tonnageCapacity)
    if (anchor.lat === null || anchor.lng === null || !Number.isFinite(capacity) || capacity <= 0) return []

    let rows: CandidateLoad[]
    try {
      rows = await prisma.$queryRaw<CandidateLoad[]>(this.candidateQuery(truck, anchor, radiusKm, contactUnlocked, true))
    } catch {
      // No PostGIS (or an older schema without the materialised point): the
      // portable numeric-coordinate query still filters AND orders before LIMIT.
      // Do not fetch the latest N loads and only then apply a proximity filter.
      this.logger.warn('PostGIS return-load search unavailable; using bounded spherical-distance SQL')
      try {
        rows = await prisma.$queryRaw<CandidateLoad[]>(this.candidateQuery(truck, anchor, radiusKm, contactUnlocked, false))
      } catch {
        throw new ServiceUnavailableException('Return-load discovery is temporarily unavailable')
      }
    }

    // Defence in depth before shared engines (which also support estimated
    // distances in other contexts). Missing/invalid distances never qualify.
    return rows.filter((load) => {
      const distance = this.optionalNumber(load.pickupDistanceKm)
      const tonnage = Number(load.tonnageRequired)
      return distance !== undefined && distance >= 0 && distance <= radiusKm &&
        tonnage > 0 && tonnage <= capacity && load.userId !== truck.userId &&
        Boolean(this.coordinates(load.loadingLat, load.loadingLng))
    }).sort((a, b) => Number(a.pickupDistanceKm) - Number(b.pickupDistanceKm) || a.id.localeCompare(b.id))
      .slice(0, CANDIDATE_QUERY_LIMIT)
  }

  private candidateQuery(
    truck: ReturnLoadTruck,
    anchor: ReturnLoadAnchor,
    radiusKm: number,
    contactUnlocked: boolean,
    usePostgis: boolean,
  ): Prisma.Sql {
    const hub = Prisma.sql`ST_SetSRID(ST_MakePoint(${anchor.lng}, ${anchor.lat}), 4326)::geography`
    // Lat/lng-only loads are common before point backfills/triggers have run.
    const pickup = Prisma.sql`COALESCE(l.loading_point, ST_SetSRID(ST_MakePoint(l.loading_lng, l.loading_lat), 4326)::geography)`
    const distance = usePostgis
      ? Prisma.sql`ST_Distance(${pickup}, ${hub}, false) / 1000.0`
      : Prisma.sql`${EARTH_RADIUS_KM} * 2 * ASIN(SQRT(LEAST(1.0, GREATEST(0.0,
          POWER(SIN(RADIANS(l.loading_lat - ${anchor.lat}) / 2), 2) +
          COS(RADIANS(${anchor.lat})) * COS(RADIANS(l.loading_lat)) *
          POWER(SIN(RADIANS(l.loading_lng - ${anchor.lng}) / 2), 2)
        ))))`
    const spatialFilter = usePostgis
      ? Prisma.sql`AND ST_DWithin(${pickup}, ${hub}, ${radiusKm * 1000}, false)`
      : Prisma.sql``
    // PII is not even selected for a locked caller, including the fallback.
    const contactFields = contactUnlocked ? Prisma.sql`, u.phone as "ownerPhone", u.name as "ownerName"` : Prisma.sql``
    const contactJoin = contactUnlocked ? Prisma.sql`LEFT JOIN users u ON u.id = l.user_id` : Prisma.sql``
    // Conservative latitude prefilter for the portable query; the exact
    // spherical-distance predicate below handles longitude, poles and dateline.
    const latitudeDelta = radiusKm / EARTH_RADIUS_KM * 180 / Math.PI + 0.001

    return Prisma.sql`
      SELECT * FROM (
        SELECT
          l.id, l.user_id as "userId", l.tonnage_required as "tonnageRequired",
          l.loading_address as "loadingAddress", l.loading_lat as "loadingLat", l.loading_lng as "loadingLng",
          l.unloading_address as "unloadingAddress", l.unloading_lat as "unloadingLat", l.unloading_lng as "unloadingLng",
          l.truck_type as "truckType", l.min_length_ft as "minLengthFt", l.min_height_ft as "minHeightFt",
          l.urgent, l.max_price as "maxPrice", l.created_at as "createdAt",
          ${distance} as "pickupDistanceKm"
          ${contactFields}
        FROM loads l
        ${contactJoin}
        WHERE l.status = 'Open'
          AND l.user_id <> ${truck.userId}
          AND l.tonnage_required > 0 AND l.tonnage_required <= ${Number(truck.tonnageCapacity)}
          AND l.loading_lat BETWEEN -90 AND 90
          AND l.loading_lng BETWEEN -180 AND 180
          AND l.loading_lat BETWEEN ${Math.max(-90, anchor.lat - latitudeDelta)} AND ${Math.min(90, anchor.lat + latitudeDelta)}
          ${spatialFilter}
      ) candidates
      WHERE "pickupDistanceKm" >= 0 AND "pickupDistanceKm" <= ${radiusKm}
      ORDER BY "pickupDistanceKm" ASC, id ASC
      LIMIT ${CANDIDATE_QUERY_LIMIT}
    `
  }

  /** Read-only, paid-subscription gate. Trial-only access is intentionally insufficient. */
  private async hasContactAccess(userId: string): Promise<boolean> {
    const now = new Date()
    try {
      return Boolean(await prisma.subscription.findFirst({
        where: { userId, status: 'active', startedAt: { lte: now }, expiresAt: { gt: now } },
        select: { id: true },
      }))
    } catch {
      this.logger.warn('Return-load subscription lookup unavailable; keeping contacts masked')
      return false
    }
  }

  /** Explicit allowlist: never spread raw load/user records into the response. */
  private toOpportunityDto(
    opportunity: RankedReturnLoad,
    rawLoad: CandidateLoad | undefined,
    contactUnlocked: boolean,
    tonnageCapacity: number,
  ): ReturnLoadOpportunityDto {
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
      pickupDistanceFromDestinationKm: opportunity.pickupDistanceFromDestinationKm,
      potentialEmptyRunReductionKm: opportunity.potentialEmptyRunReductionKm,
      payloadUtilizationPct: opportunity.payloadUtilizationPct,
      payloadCompatible: opportunity.tonnageRequired > 0 && opportunity.tonnageRequired <= tonnageCapacity,
      bodyTypeCompatible: opportunity.bodyTypeCompatible,
      bodyTypeExact: opportunity.bodyTypeExact,
      budgetFit: opportunity.budgetFit,
      preferredCorridor: opportunity.preferredCorridor,
      urgent: Boolean(rawLoad?.urgent),
      postedAt: rawLoad?.createdAt ? new Date(rawLoad.createdAt).toISOString() : null,
      isReturnLoad: true,
      contact: contactUnlocked
        ? { locked: false, name: opportunity.ownerName ?? null, phone: opportunity.ownerPhone ?? null }
        : { locked: true, name: null, phone: null, message: 'An active subscription is required to reveal shipper contact details.' },
      disclaimer: opportunity.disclaimer,
    }
  }

  private toLoadItem(load: CandidateLoad): LoadItem {
    const destination = this.coordinates(load.unloadingLat, load.unloadingLng)
    return {
      id: load.id,
      tonnageRequired: Number(load.tonnageRequired),
      loadingAddress: load.loadingAddress,
      loadingLat: Number(load.loadingLat),
      loadingLng: Number(load.loadingLng),
      unloadingAddress: load.unloadingAddress,
      unloadingLat: destination?.lat,
      unloadingLng: destination?.lng,
      // Prisma maps this enum, but raw SQL returns the database label.
      truckType: String(load.truckType) === 'Open body' ? 'OpenBody' : load.truckType,
      minLengthFt: load.minLengthFt ?? undefined,
      minHeightFt: load.minHeightFt ?? undefined,
      urgent: load.urgent,
      maxPrice: this.optionalNumber(load.maxPrice) ?? null,
      createdAt: load.createdAt ? new Date(load.createdAt).toISOString() : undefined,
      ownerPhone: load.ownerPhone ?? null,
      ownerName: load.ownerName ?? null,
    }
  }

  private validateOptions(options: ReturnLoadsOptions) {
    const radiusKm = options.radiusKm ?? RETURN_LOAD_DEFAULT_RADIUS_KM
    const limit = options.limit ?? RETURN_LOAD_DEFAULT_LIMIT
    const minScore = options.minScore ?? 0
    const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max
    if (!inRange(radiusKm, 1, RETURN_LOAD_MAX_RADIUS_KM)) {
      throw new BadRequestException(`radius must be between 1 and ${RETURN_LOAD_MAX_RADIUS_KM} km`)
    }
    if (!Number.isInteger(limit) || !inRange(limit, 1, RETURN_LOAD_MAX_LIMIT)) {
      throw new BadRequestException(`limit must be an integer between 1 and ${RETURN_LOAD_MAX_LIMIT}`)
    }
    if (!inRange(minScore, 0, 100)) throw new BadRequestException('minScore must be between 0 and 100')
    if ((options.destinationLat !== undefined || options.destinationLng !== undefined) &&
        (!inRange(options.destinationLat, -90, 90) || !inRange(options.destinationLng, -180, 180))) {
      throw new BadRequestException('destinationLat and destinationLng must be a valid coordinate pair')
    }
    return { radiusKm, limit, minScore }
  }

  private coordinates(latValue: unknown, lngValue: unknown): { lat: number; lng: number } | null {
    const lat = this.optionalNumber(latValue)
    const lng = this.optionalNumber(lngValue)
    return lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
  }

  private optionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') return undefined
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }

  private toStringArray(value: unknown): string[] {
    if (typeof value === 'string') {
      try { return this.toStringArray(JSON.parse(value)) } catch { return value.trim() ? [value.trim()] : [] }
    }
    return Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
      : []
  }
}
