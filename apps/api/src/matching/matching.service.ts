import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { prisma, Prisma } from '@lorrycarry/database'
import { randomUUID } from 'crypto'
import { GupshupService } from '../auth/gupshup.service'
import {
  calculateGeoDistance,
  calculateMatchScore as calculateSharedMatchScore,
  MatchResult as SharedMatchResult,
  MatchFactorDetail,
  LoadItem,
  TruckItem,
} from '@lorrycarry/shared'

export type MatchStatus = 'Pending' | 'Booked' | 'Completed' | 'Cancelled'

export type { MatchFactorDetail }

/**
 * Backend match result. Identical to the shared {@link SharedMatchResult}
 * except that the budget factor is always present because the API always
 * enables the budget gate (see {@link MatchingService.calculateMatchScore}).
 */
export interface MatchResult extends SharedMatchResult {
  factors: SharedMatchResult['factors'] & { budget: MatchFactorDetail }
}

const MAX_PROXIMITY_KM = 50
const DEFAULT_RADIUS_KM = 50

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name)

  constructor(private readonly gupshup: GupshupService) {}

  // ────────────────────────────────────────────────
  // Core matching logic — delegated to @lorrycarry/shared
  // ────────────────────────────────────────────────

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0
    if (typeof v === 'number') return v
    const n = Number(v)
    return isNaN(n) ? 0 : n
  }

  private toOptionalNumber(v: any): number | undefined {
    if (v === null || v === undefined || v === '') return undefined
    const n = Number(v)
    return isNaN(n) ? undefined : n
  }

  private calculateGeoDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return calculateGeoDistance(lat1, lon1, lat2, lon2)
  }

  /**
   * Normalises a Prisma model or raw SQL row (camelCase or snake_case, Decimal
   * columns) into the shared {@link LoadItem} shape.
   */
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
      urgent: Boolean(load.urgent),
      maxPrice: this.toOptionalNumber(load.maxPrice ?? load.max_price) ?? null,
      createdAt: load.createdAt ? String(load.createdAt) : load.created_at ? String(load.created_at) : undefined,
      ownerPhone: load.ownerPhone ?? load.user?.phone ?? null,
      ownerName: load.ownerName ?? load.user?.name ?? null,
    }
  }

  /** Normalises a Prisma model or raw SQL row into the shared {@link TruckItem} shape. */
  private toTruckItem(truck: any): TruckItem {
    const pref = truck.preferredDestinations ?? truck.preferred_destinations
    return {
      id: String(truck.id ?? ''),
      registrationNumber: truck.registrationNumber ?? truck.registration_number ?? undefined,
      bodyType: truck.bodyType ?? truck.body_type ?? 'Open',
      tonnageCapacity: this.toNumber(truck.tonnageCapacity ?? truck.tonnage_capacity),
      currentLat: this.toOptionalNumber(truck.currentLat ?? truck.current_lat),
      currentLng: this.toOptionalNumber(truck.currentLng ?? truck.current_lng),
      distanceKm: this.toOptionalNumber(truck.distanceKm ?? truck.distance_km),
      serviceableRadiusKm: this.toOptionalNumber(truck.serviceableRadiusKm ?? truck.serviceable_radius_km),
      preferredDestinations: Array.isArray(pref) ? pref.map((d: any) => String(d)) : undefined,
      verificationStatus: truck.verificationStatus ?? truck.verification_status ?? undefined,
      ownerPhone: truck.ownerPhone ?? truck.user?.phone ?? undefined,
      ownerName: truck.ownerName ?? truck.user?.name ?? undefined,
    }
  }

  /**
   * Deterministic explainable match score — same engine as the web/mobile clients
   * (`@lorrycarry/shared` → `calculateMatchScore`).
   * Capacity 35 + BodyType 25 + Proximity 20 + Verification 15 + Corridor 5 = 100.
   *
   * Server-side gates layered on top of the shared scoring:
   * - `maxProximityKm: 50` — the API only ever evaluates candidates discovered
   *   within the 50 km PostGIS radius, so the proximity factor is aligned with
   *   that query filter.
   * - `budget: true` — the budget gate is enabled server-side because the API
   *   is the system of record for persisted `matches.budget_compatible` and for
   *   the WhatsApp notifications sent to transporters. Clients can opt in to the
   *   same gate via `MatchScoringOptions.budget`, but by default they show the
   *   ungated "smart match" so shippers still see physically compatible trucks
   *   when their budget is below benchmark.
   */
  calculateMatchScore(load: any, truck: any, distanceKm?: number): MatchResult {
    const result = calculateSharedMatchScore(this.toLoadItem(load), this.toTruckItem(truck), {
      distanceKm: typeof distanceKm === 'number' ? distanceKm : undefined,
      maxProximityKm: MAX_PROXIMITY_KM,
      budget: true,
    })
    return result as MatchResult
  }

  private normalizeRadius(radiusKm?: number): number {
    const r = typeof radiusKm === 'number' ? radiusKm : DEFAULT_RADIUS_KM
    const clamped = Math.min(MAX_PROXIMITY_KM, Math.max(1, Math.round(r)))
    return clamped
  }

  private async hasActiveSubscription(userId?: string): Promise<boolean> {
    if (!userId) return false
    try {
      const sub = await (prisma as any).subscription.findFirst({
        where: { userId, status: 'active', expiresAt: { gt: new Date() } },
      })
      return !!sub
    } catch {
      return false
    }
  }

  // ────────────────────────────────────────────────
  // Persistence helpers
  // ────────────────────────────────────────────────

  private async ensurePrismaMatchModel(): Promise<any> {
    // Access prisma.match via any to avoid strict type dependency before generation
    const anyPrisma: any = prisma as any
    return anyPrisma.match ?? null
  }

  async createOrUpdateMatch(loadId: string, truckId: string, computed: { distanceKm: number; score: number; tonnageCompatible: boolean; routeCompatible: boolean; budgetCompatible: boolean }): Promise<any> {
    const load = await (prisma as any).load.findUnique({ where: { id: loadId } })
    const truck = await (prisma as any).truck.findUnique({ where: { id: truckId } })
    if (!load || !truck) throw new NotFoundException('Load or Truck not found for matching')

    const anyPrisma: any = prisma as any
    if (!anyPrisma.match || typeof anyPrisma.match.upsert !== 'function') {
      // Fallback: raw SQL upsert without Prisma model
      try {
        const newId = randomUUID()
        await prisma.$executeRaw`
          INSERT INTO matches (id, load_id, truck_id, load_owner_id, truck_owner_id, status, distance_km, match_score, tonnage_compatible, route_compatible, budget_compatible, created_at, updated_at)
          VALUES (${newId}, ${loadId}, ${truckId}, ${load.userId}, ${truck.userId}, 'Pending', ${computed.distanceKm}, ${computed.score}, ${computed.tonnageCompatible}, ${computed.routeCompatible}, ${computed.budgetCompatible}, NOW(), NOW())
          ON CONFLICT (load_id, truck_id) DO UPDATE SET distance_km = EXCLUDED.distance_km, match_score = EXCLUDED.match_score, tonnage_compatible = EXCLUDED.tonnage_compatible, route_compatible = EXCLUDED.route_compatible, budget_compatible = EXCLUDED.budget_compatible, updated_at = NOW()
        `
        const rows = await (prisma.$queryRaw as any)`SELECT * FROM matches WHERE load_id = ${loadId} AND truck_id = ${truckId} LIMIT 1`
        return rows[0] ?? null
      } catch (e) {
        this.logger.warn(`Fallback match upsert failed: ${(e as Error).message}`)
        return null
      }
    }

    const match = await anyPrisma.match.upsert({
      where: { loadId_truckId: { loadId, truckId } },
      create: {
        loadId,
        truckId,
        loadOwnerId: load.userId,
        truckOwnerId: truck.userId,
        status: 'Pending',
        distanceKm: computed.distanceKm,
        matchScore: computed.score,
        tonnageCompatible: computed.tonnageCompatible,
        routeCompatible: computed.routeCompatible,
        budgetCompatible: computed.budgetCompatible,
      },
      update: {
        distanceKm: computed.distanceKm,
        matchScore: computed.score,
        tonnageCompatible: computed.tonnageCompatible,
        routeCompatible: computed.routeCompatible,
        budgetCompatible: computed.budgetCompatible,
      },
    })
    return match
  }

  async triggerWhatsAppForMatch(match: any, load: any, truck: any): Promise<void> {
    if (!match) return
    // Avoid duplicate triggers within 24h
    if (match.notifiedAt) {
      const notified = new Date(match.notifiedAt)
      if (Date.now() - notified.getTime() < 24 * 60 * 60 * 1000) return
    }
    try {
      const loadOwner = await (prisma as any).user.findUnique({ where: { id: load.userId } })
      const truckOwner = await (prisma as any).user.findUnique({ where: { id: truck.userId } })

      const distanceStr = match.distanceKm ? `${Number(match.distanceKm).toFixed(1)} km` : `${MAX_PROXIMITY_KM} km`
      const scoreStr = match.matchScore ? `${match.matchScore}%` : 'High'

      // Notify load owner about nearby truck
      if (loadOwner?.phone) {
        await this.gupshup.sendNotification(
          loadOwner.phone,
          'match_found_load_owner',
          [
            truck.registrationNumber ?? 'Verified Truck',
            String(truck.tonnageCapacity ?? ''),
            load.loadingAddress ?? 'Loading Point',
            distanceStr,
            scoreStr,
          ],
        )
      }

      // Notify truck owner about nearby load
      if (truckOwner?.phone) {
        await this.gupshup.sendNotification(
          truckOwner.phone,
          'match_found_truck_owner',
          [
            String(load.tonnageRequired ?? ''),
            load.loadingAddress ?? 'Pickup',
            load.unloadingAddress ?? 'Destination',
            distanceStr,
            scoreStr,
          ],
        )
      }

      // Mark notified
      const anyPrisma: any = prisma as any
      if (anyPrisma.match?.update) {
        await anyPrisma.match.update({ where: { id: match.id }, data: { notifiedAt: new Date() } }).catch(() => null)
      } else {
        await prisma.$executeRaw`UPDATE matches SET notified_at = NOW(), updated_at = NOW() WHERE id = ${match.id}`.catch(() => null)
      }
      this.logger.log(`WhatsApp match notifications sent for load=${load.id} truck=${truck.id} score=${scoreStr}`)
    } catch (e) {
      this.logger.warn(`Failed to send WhatsApp for match ${match.id}: ${(e as Error).message}`)
    }
  }

  // ────────────────────────────────────────────────
  // Candidate discovery (proximity ≤50km + tonnage + truckType)
  // ────────────────────────────────────────────────

  async findTrucksForLoad(loadId: string, radiusKm: number = DEFAULT_RADIUS_KM): Promise<any[]> {
    const radius = this.normalizeRadius(radiusKm)
    const radiusMeters = radius * 1000

    const load = await (prisma as any).load.findUnique({ where: { id: loadId } })
    if (!load) throw new NotFoundException('Load not found')

    if (load.loadingLat === null || load.loadingLng === null) {
      // Fallback without PostGIS — include owner phone but respect subscription gating later
      const trucks = await (prisma as any).truck.findMany({
        where: {
          verificationStatus: 'Verified',
          tonnageCapacity: { gte: load.tonnageRequired },
        },
        take: 50,
        include: { user: { select: { phone: true, name: true } } },
      })
      // Filter by JS distance if lat/lng available and map ownerPhone
      return trucks
        .filter((t: any) => {
          if (t.currentLat && t.currentLng && load.loadingLat && load.loadingLng) {
            const d = this.calculateGeoDistance(Number(t.currentLat), Number(t.currentLng), Number(load.loadingLat), Number(load.loadingLng))
            return d <= radius
          }
          return true
        })
        .map((t: any) => ({
          ...t,
          ownerPhone: t.user?.phone,
          ownerName: t.user?.name,
          distanceKm: t.currentLat && t.currentLng && load.loadingLat && load.loadingLng ? this.calculateGeoDistance(Number(t.currentLat), Number(t.currentLng), Number(load.loadingLat), Number(load.loadingLng)) : radius,
        }))
    }

    try {
      const query = Prisma.sql`
        SELECT
          t.id,
          t.user_id as "userId",
          t.registration_number as "registrationNumber",
          t.body_type as "bodyType",
          t.length_ft as "lengthFt",
          t.height_ft as "heightFt",
          t.tonnage_capacity as "tonnageCapacity",
          t.current_lat as "currentLat",
          t.current_lng as "currentLng",
          t.serviceable_radius_km as "serviceableRadiusKm",
          t.preferred_destinations as "preferredDestinations",
          t.verification_status as "verificationStatus",
          u.phone as "ownerPhone",
          u.name as "ownerName",
          ST_Distance(t.current_location::geography, ST_SetSRID(ST_MakePoint(${Number(load.loadingLng)}, ${Number(load.loadingLat)}), 4326)::geography) / 1000 as "distanceKm"
        FROM trucks t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.verification_status = 'Verified'
          AND t.tonnage_capacity >= ${load.tonnageRequired}
          AND t.current_location IS NOT NULL
          AND ST_DWithin(t.current_location::geography, ST_SetSRID(ST_MakePoint(${Number(load.loadingLng)}, ${Number(load.loadingLat)}), 4326)::geography, ${radiusMeters})
        ORDER BY "distanceKm" ASC
        LIMIT 50
      `
      const rows = await (prisma.$queryRaw as any)(query)
      return rows.map((r: any) => ({
        ...r,
        tonnageCapacity: this.toNumber(r.tonnageCapacity),
        distanceKm: this.toNumber(r.distanceKm),
        preferredDestinations: r.preferredDestinations ? (typeof r.preferredDestinations === 'string' ? JSON.parse(r.preferredDestinations) : r.preferredDestinations) : [],
        user: r.ownerPhone ? { phone: r.ownerPhone, name: r.ownerName } : undefined,
        ownerPhone: r.ownerPhone,
        ownerName: r.ownerName,
      }))
    } catch (e) {
      this.logger.warn(`PostGIS truck search failed, fallback to JS: ${(e as Error).message}`)
      const trucks = await (prisma as any).truck.findMany({
        where: {
          verificationStatus: 'Verified',
          tonnageCapacity: { gte: load.tonnageRequired },
        },
        take: 50,
        include: { user: { select: { phone: true, name: true } } },
      })
      return trucks
        .map((t: any) => ({
          ...t,
          ownerPhone: t.user?.phone,
          ownerName: t.user?.name,
          distanceKm: t.currentLat && t.currentLng ? this.calculateGeoDistance(Number(t.currentLat), Number(t.currentLng), Number(load.loadingLat), Number(load.loadingLng)) : radius,
        }))
        .filter((t: any) => t.distanceKm <= radius)
    }
  }

  async findLoadsForTruck(truckId: string, radiusKm: number = DEFAULT_RADIUS_KM): Promise<any[]> {
    const radius = this.normalizeRadius(radiusKm)
    const radiusMeters = radius * 1000
    const truck = await (prisma as any).truck.findUnique({ where: { id: truckId } })
    if (!truck) throw new NotFoundException('Truck not found')

    if (truck.currentLat === null || truck.currentLng === null) {
      const loads = await (prisma as any).load.findMany({
        where: { status: 'Open', tonnageRequired: { lte: truck.tonnageCapacity } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { phone: true, name: true } } },
      })
      return loads.map((l: any) => ({
        ...l,
        ownerPhone: l.user?.phone,
        ownerName: l.user?.name,
      }))
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
          l.advance_payable as "advancePayable",
          l.status,
          l.created_at as "createdAt",
          u.phone as "ownerPhone",
          u.name as "ownerName",
          ST_Distance(l.loading_point::geography, ST_SetSRID(ST_MakePoint(${Number(truck.currentLng)}, ${Number(truck.currentLat)}), 4326)::geography) / 1000 as "distanceKm"
        FROM loads l
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.status = 'Open'
          AND l.tonnage_required <= ${truck.tonnageCapacity}
          AND l.loading_point IS NOT NULL
          AND ST_DWithin(l.loading_point::geography, ST_SetSRID(ST_MakePoint(${Number(truck.currentLng)}, ${Number(truck.currentLat)}), 4326)::geography, ${radiusMeters})
        ORDER BY "distanceKm" ASC
        LIMIT 50
      `
      const rows = await (prisma.$queryRaw as any)(query)
      return rows.map((r: any) => ({
        ...r,
        tonnageRequired: this.toNumber(r.tonnageRequired),
        distanceKm: this.toNumber(r.distanceKm),
        maxPrice: r.maxPrice != null ? this.toNumber(r.maxPrice) : null,
        user: r.ownerPhone ? { phone: r.ownerPhone, name: r.ownerName } : undefined,
        ownerPhone: r.ownerPhone,
        ownerName: r.ownerName,
      }))
    } catch (e) {
      this.logger.warn(`PostGIS load search failed, fallback: ${(e as Error).message}`)
      const loads = await (prisma as any).load.findMany({
        where: { status: 'Open', tonnageRequired: { lte: truck.tonnageCapacity } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { phone: true, name: true } } },
      })
      return loads
        .map((l: any) => ({
          ...l,
          ownerPhone: l.user?.phone,
          ownerName: l.user?.name,
          distanceKm: l.loadingLat && l.loadingLng ? this.calculateGeoDistance(Number(truck.currentLat), Number(truck.currentLng), Number(l.loadingLat), Number(l.loadingLng)) : radius,
        }))
        .filter((l: any) => l.distanceKm <= radius)
    }
  }

  // ────────────────────────────────────────────────
  // Public APIs
  // ────────────────────────────────────────────────

  async getMatchesForLoad(loadId: string, requestingUserId?: string, radiusKm: number = DEFAULT_RADIUS_KM): Promise<any[]> {
    const load = await (prisma as any).load.findUnique({
      where: { id: loadId },
      include: { user: { select: { phone: true, name: true } } },
    })
    if (!load) throw new NotFoundException('Load not found')
    // Authorization: owner or any authenticated user can view matches — PII masked if no active subscription

    const trucks = await this.findTrucksForLoad(loadId, radiusKm)
    const canSeeContact = await this.hasActiveSubscription(requestingUserId)
    const results = trucks
      .map((truck) => {
        const distanceKm = this.toNumber(truck.distanceKm)
        // Proximity filter hard ≤50km
        if (distanceKm > MAX_PROXIMITY_KM) return null
        const match = this.calculateMatchScore(load, truck, distanceKm)
        // Must pass tonnage and route; budget is soft gate but we still include but mark
        if (!match.isCapacityFit) return null
        if (!match.isProximityFit) return null
        // Subscription-gated contact reveal: mask truck owner phone if not subscribed
        const maskedTruck = canSeeContact
          ? truck
          : { ...truck, user: undefined, ownerPhone: undefined, ownerName: undefined }
        return {
          truck: maskedTruck,
          match,
          distanceKm,
          tonnageCompatible: match.isCapacityFit && match.isBodyTypeFit,
          routeCompatible: match.isProximityFit,
          budgetCompatible: match.isBudgetFit,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.match.score - a.match.score)

    return results
  }

  async getMatchesForTruck(truckId: string, requestingUserId?: string, radiusKm: number = DEFAULT_RADIUS_KM): Promise<any[]> {
    const truck = await (prisma as any).truck.findUnique({
      where: { id: truckId },
      include: { user: { select: { phone: true, name: true } } },
    })
    if (!truck) throw new NotFoundException('Truck not found')

    const loads = await this.findLoadsForTruck(truckId, radiusKm)
    const canSeeContact = await this.hasActiveSubscription(requestingUserId)
    const results = loads
      .map((load) => {
        const distanceKm = this.toNumber(load.distanceKm)
        if (distanceKm > MAX_PROXIMITY_KM) return null
        const match = this.calculateMatchScore(load, truck, distanceKm)
        if (!match.isCapacityFit) return null
        if (!match.isProximityFit) return null
        const maskedLoad = canSeeContact
          ? load
          : { ...load, user: undefined, ownerPhone: undefined, ownerName: undefined }
        return {
          load: maskedLoad,
          match,
          distanceKm,
          tonnageCompatible: match.isCapacityFit && match.isBodyTypeFit,
          routeCompatible: match.isProximityFit,
          budgetCompatible: match.isBudgetFit,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.match.score - a.match.score)

    return results
  }

  async evaluateMatchesForLoad(loadId: string, radiusKm: number = DEFAULT_RADIUS_KM): Promise<{ evaluated: number; created: number; matches: any[] }> {
    const load = await (prisma as any).load.findUnique({ where: { id: loadId } })
    if (!load) throw new NotFoundException('Load not found')
    const candidates = await this.getMatchesForLoad(loadId, undefined, radiusKm)
    let created = 0
    const persisted: any[] = []
    for (const cand of candidates) {
      const distanceKm = cand.distanceKm
      const score = cand.match.score
      const match = await this.createOrUpdateMatch(loadId, cand.truck.id, {
        distanceKm,
        score,
        tonnageCompatible: cand.tonnageCompatible,
        routeCompatible: cand.routeCompatible,
        budgetCompatible: cand.budgetCompatible,
      })
      if (match) {
        created++
        persisted.push({ ...match, truck: cand.truck, matchScore: score, distanceKm, factors: cand.match.factors })
        // WhatsApp trigger if score >=70 and within 50km and budget fit
        if (score >= 50 && cand.routeCompatible) {
          await this.triggerWhatsAppForMatch(match, load, cand.truck)
        }
      }
    }
    return { evaluated: candidates.length, created, matches: persisted }
  }

  async evaluateMatchesForTruck(truckId: string, radiusKm: number = DEFAULT_RADIUS_KM): Promise<{ evaluated: number; created: number; matches: any[] }> {
    const truck = await (prisma as any).truck.findUnique({ where: { id: truckId } })
    if (!truck) throw new NotFoundException('Truck not found')
    const candidates = await this.getMatchesForTruck(truckId, undefined, radiusKm)
    let created = 0
    const persisted: any[] = []
    for (const cand of candidates) {
      const distanceKm = cand.distanceKm
      const score = cand.match.score
      const match = await this.createOrUpdateMatch(cand.load.id, truckId, {
        distanceKm,
        score,
        tonnageCompatible: cand.tonnageCompatible,
        routeCompatible: cand.routeCompatible,
        budgetCompatible: cand.budgetCompatible,
      })
      if (match) {
        created++
        persisted.push({ ...match, load: cand.load, matchScore: score, distanceKm, factors: cand.match.factors })
        if (score >= 50 && cand.routeCompatible) {
          await this.triggerWhatsAppForMatch(match, cand.load, truck)
        }
      }
    }
    return { evaluated: candidates.length, created, matches: persisted }
  }

  async evaluateAll(radiusKm: number = DEFAULT_RADIUS_KM): Promise<{ loadsEvaluated: number; matchesCreated: number }> {
    const loads = await (prisma as any).load.findMany({ where: { status: 'Open' }, take: 100, orderBy: { createdAt: 'desc' } })
    let totalCreated = 0
    for (const load of loads) {
      const res = await this.evaluateMatchesForLoad(load.id, radiusKm).catch(() => ({ created: 0 } as any))
      totalCreated += res.created ?? 0
    }
    return { loadsEvaluated: loads.length, matchesCreated: totalCreated }
  }

  async getMyMatches(userId: string, opts: { status?: MatchStatus; radiusKm?: number; page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const radius = opts.radiusKm ? this.normalizeRadius(opts.radiusKm) : undefined
    const page = Math.max(1, Number(opts.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20))
    const skip = (page - 1) * limit

    const anyPrisma: any = prisma as any

    // Use prisma.match if available, else fallback to raw
    const where: any = {
      OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }],
    }
    if (opts.status) where.status = opts.status

    try {
      if (anyPrisma.match?.findMany) {
        const [data, total] = await Promise.all([
          anyPrisma.match.findMany({
            where,
            include: {
              load: {
                select: {
                  id: true,
                  tonnageRequired: true,
                  loadingAddress: true,
                  unloadingAddress: true,
                  truckType: true,
                  maxPrice: true,
                  status: true,
                  loadingLat: true,
                  loadingLng: true,
                  unloadingLat: true,
                  unloadingLng: true,
                  createdAt: true,
                  user: { select: { phone: true, name: true } },
                },
              },
              truck: {
                select: {
                  id: true,
                  registrationNumber: true,
                  bodyType: true,
                  tonnageCapacity: true,
                  currentLat: true,
                  currentLng: true,
                  verificationStatus: true,
                  serviceableRadiusKm: true,
                  preferredDestinations: true,
                  user: { select: { phone: true, name: true } },
                },
              },
              booking: {
                select: { id: true, status: true, agreedPrice: true },
              },
            },
            orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
            skip,
            take: limit,
          }),
          anyPrisma.match.count({ where }),
        ])

        // Enrich with computed distance if missing and apply radius filter
        let filtered = data
        if (radius) {
          filtered = data.filter((m: any) => {
            const d = m.distanceKm != null ? Number(m.distanceKm) : 999
            return d <= radius
          })
        }

        // Recompute match score if needed to ensure tonnage/route/budget correctness
        const canSeeContact = await this.hasActiveSubscription(userId)
        const enriched = filtered.map((m: any) => {
          const distanceKm = m.distanceKm != null ? Number(m.distanceKm) : (m.load.loadingLat && m.truck.currentLat ? this.calculateGeoDistance(Number(m.truck.currentLat), Number(m.truck.currentLng), Number(m.load.loadingLat), Number(m.load.loadingLng)) : 15)
          const computed = this.calculateMatchScore(m.load, m.truck, distanceKm)
          // Subscription-gated contact reveal: mask PII if not subscribed
          const maskedLoad = canSeeContact ? m.load : { ...m.load, user: undefined }
          const maskedTruck = canSeeContact ? m.truck : { ...m.truck, user: undefined }
          return {
            ...m,
            load: maskedLoad,
            truck: maskedTruck,
            computedMatch: computed,
            distanceKm,
            tonnageCompatible: computed.isCapacityFit && computed.isBodyTypeFit,
            routeCompatible: computed.isProximityFit,
            budgetCompatible: computed.isBudgetFit,
          }
        })

        return { data: enriched, total, page, limit }
      }
    } catch (e) {
      this.logger.warn(`prisma.match findMany failed, falling back to raw: ${(e as Error).message}`)
    }

    // Fallback raw SQL for environments without generated client
    const statusFilter = opts.status ? Prisma.sql`AND m.status = ${opts.status}` : Prisma.sql``
    const radiusFilter = radius ? Prisma.sql`AND m.distance_km <= ${radius}` : Prisma.sql``
    try {
      const countRows = await (prisma.$queryRaw as any)`SELECT COUNT(*)::int as total FROM matches m WHERE (m.load_owner_id = ${userId} OR m.truck_owner_id = ${userId}) ${statusFilter} ${radiusFilter}`
      const total = countRows[0]?.total ?? 0
      const rows = await (prisma.$queryRaw as any)`
        SELECT m.id, m.load_id as "loadId", m.truck_id as "truckId", m.status, m.distance_km as "distanceKm", m.match_score as "matchScore", m.tonnage_compatible as "tonnageCompatible", m.route_compatible as "routeCompatible", m.budget_compatible as "budgetCompatible", m.booking_id as "bookingId", m.created_at as "createdAt", m.updated_at as "updatedAt",
               l.tonnage_required as "loadTonnage", l.loading_address as "loadingAddress", l.unloading_address as "unloadingAddress", l.truck_type as "loadTruckType", l.max_price as "loadMaxPrice", l.status as "loadStatus",
               t.registration_number as "registrationNumber", t.body_type as "truckBodyType", t.tonnage_capacity as "truckTonnage"
        FROM matches m
        JOIN loads l ON l.id = m.load_id
        JOIN trucks t ON t.id = m.truck_id
        WHERE (m.load_owner_id = ${userId} OR m.truck_owner_id = ${userId}) ${statusFilter} ${radiusFilter}
        ORDER BY m.match_score DESC, m.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      return { data: rows, total, page, limit }
    } catch (e) {
      this.logger.warn(`Fallback raw my-matches failed: ${(e as Error).message}`)
      return { data: [], total: 0, page, limit }
    }
  }

  async getMatchById(matchId: string, userId: string): Promise<any> {
    const anyPrisma: any = prisma as any
    if (anyPrisma.match?.findFirst) {
      const match = await anyPrisma.match.findFirst({
        where: { id: matchId, OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }] },
        include: {
          load: true,
          truck: { include: { user: { select: { phone: true, name: true } } } },
          booking: true,
        },
      })
      if (!match) throw new NotFoundException('Match not found')
      const distanceKm = match.distanceKm != null ? Number(match.distanceKm) : 15
      const computed = this.calculateMatchScore(match.load, match.truck, distanceKm)
      return { ...match, computedMatch: computed }
    }
    const rows = await (prisma.$queryRaw as any)`SELECT * FROM matches WHERE id = ${matchId} AND (load_owner_id = ${userId} OR truck_owner_id = ${userId}) LIMIT 1`
    if (!rows[0]) throw new NotFoundException('Match not found')
    return rows[0]
  }

  async updateMatchStatus(matchId: string, userId: string, status: MatchStatus, bookingId?: string): Promise<any> {
    const anyPrisma: any = prisma as any
    let match: any = null
    if (anyPrisma.match?.findFirst) {
      match = await anyPrisma.match.findFirst({ where: { id: matchId, OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }] } })
    } else {
      const rows = await (prisma.$queryRaw as any)`SELECT * FROM matches WHERE id = ${matchId} AND (load_owner_id = ${userId} OR truck_owner_id = ${userId}) LIMIT 1`
      match = rows[0]
    }
    if (!match) throw new NotFoundException('Match not found or not authorized')

    // Validate transition
    const allowed: Record<string, string[]> = {
      Pending: ['Booked', 'Cancelled'],
      Booked: ['Completed', 'Cancelled'],
      Completed: [],
      Cancelled: [],
    }
    const current = match.status
    if (status !== current && !allowed[current]?.includes(status)) {
      throw new BadRequestException(`Invalid status transition from ${current} to ${status}`)
    }

    const data: any = { status }
    if (bookingId) data.bookingId = bookingId

    if (anyPrisma.match?.update) {
      return anyPrisma.match.update({ where: { id: matchId }, data })
    }
    await prisma.$executeRaw`UPDATE matches SET status = ${status}::"MatchStatus", booking_id = ${bookingId ?? null}, updated_at = NOW() WHERE id = ${matchId}`
    const rows = await (prisma.$queryRaw as any)`SELECT * FROM matches WHERE id = ${matchId} LIMIT 1`
    return rows[0]
  }

  async handleBookingCreated(booking: any): Promise<void> {
    // When a booking is created, mark corresponding match as Booked
    const anyPrisma: any = prisma as any
    const loadId = booking.loadId ?? booking.load_id
    const truckId = booking.truckId ?? booking.truck_id
    const bookingId = booking.id
    if (!loadId || !truckId) return

    try {
      if (anyPrisma.match?.updateMany) {
        await anyPrisma.match.updateMany({
          where: { loadId, truckId },
          data: { status: 'Booked', bookingId },
        })
      } else {
        await prisma.$executeRaw`UPDATE matches SET status = 'Booked'::"MatchStatus", booking_id = ${bookingId}, updated_at = NOW() WHERE load_id = ${loadId} AND truck_id = ${truckId}`
      }
      // Also mark other matches for same load as still Pending but not cancel — we keep them pending for alternative options
    } catch (e) {
      this.logger.warn(`handleBookingCreated match update failed: ${(e as Error).message}`)
    }
  }

  async handleBookingCompleted(booking: any): Promise<void> {
    const anyPrisma: any = prisma as any
    const loadId = booking.loadId ?? booking.load_id
    const truckId = booking.truckId ?? booking.truck_id
    try {
      if (anyPrisma.match?.updateMany) {
        await anyPrisma.match.updateMany({
          where: { loadId, truckId, status: 'Booked' },
          data: { status: 'Completed' },
        })
        // Also mark load status completed
      } else {
        await prisma.$executeRaw`UPDATE matches SET status = 'Completed'::"MatchStatus", updated_at = NOW() WHERE load_id = ${loadId} AND truck_id = ${truckId} AND status = 'Booked'`
      }
    } catch (e) {
      this.logger.warn(`handleBookingCompleted failed: ${(e as Error).message}`)
    }
  }

  async deleteMatch(matchId: string, userId: string): Promise<{ success: boolean }> {
    const anyPrisma: any = prisma as any
    if (anyPrisma.match?.findFirst) {
      const match = await anyPrisma.match.findFirst({ where: { id: matchId, OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }] } })
      if (!match) throw new NotFoundException('Match not found')
      await anyPrisma.match.delete({ where: { id: matchId } })
      return { success: true }
    }
    const rows = await (prisma.$queryRaw as any)`SELECT * FROM matches WHERE id = ${matchId} AND (load_owner_id = ${userId} OR truck_owner_id = ${userId}) LIMIT 1`
    if (!rows[0]) throw new NotFoundException('Match not found')
    await prisma.$executeRaw`DELETE FROM matches WHERE id = ${matchId}`
    return { success: true }
  }
}
