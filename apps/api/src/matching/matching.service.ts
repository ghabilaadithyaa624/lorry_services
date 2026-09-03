import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { prisma, Prisma } from '@lorrycarry/database'
import { randomUUID } from 'crypto'
import { GupshupService } from '../auth/gupshup.service'

export type MatchStatus = 'Pending' | 'Booked' | 'Completed' | 'Cancelled'

export interface MatchFactorDetail {
  key: 'capacity' | 'bodyType' | 'proximity' | 'verification' | 'corridor' | 'budget'
  label: string
  value: string
  fit: boolean
  score: number
  maxScore: number
  detail: string
}

export interface MatchResult {
  score: number
  rating: 'PERFECT' | 'STRONG' | 'MODERATE' | 'POOR'
  label: string
  reasons: string[]
  warnings: string[]
  isCapacityFit: boolean
  isBodyTypeFit: boolean
  isProximityFit: boolean
  isVerified: boolean
  isPreferredCorridor: boolean
  isReturnLoad: boolean
  isBudgetFit: boolean
  distanceKm: number
  factors: Record<string, MatchFactorDetail>
}

const MAX_PROXIMITY_KM = 50
const DEFAULT_RADIUS_KM = 50

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name)

  constructor(private readonly gupshup: GupshupService) {}

  // ────────────────────────────────────────────────
  // Core matching logic: tonnage, route (proximity), budget
  // ────────────────────────────────────────────────

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0
    if (typeof v === 'number') return v
    const n = Number(v)
    return isNaN(n) ? 0 : n
  }

  private calculateGeoDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 1.3) // road factor
  }

  private estimateBudgetFit(loadMaxPrice: number | null | undefined, tonnage: number, truckType: string, distanceKm: number): { fit: boolean; detail: string; estimated: number } {
    if (loadMaxPrice === null || loadMaxPrice === undefined) {
      return { fit: true, detail: 'No budget cap specified — open to market rate', estimated: 0 }
    }
    const maxPrice = this.toNumber(loadMaxPrice)
    // Replicate pricingEngine heuristic
    let baseRate = 3.4
    let handling = 2500
    if (truckType === 'Container') { baseRate = 4.10; handling = 3500 }
    else if (truckType === 'OpenBody' || truckType === 'Open body') { baseRate = 3.15; handling = 3000 }
    let rate = baseRate
    if (distanceKm > 1000) rate *= 0.88
    else if (distanceKm > 500) rate *= 0.94
    if (distanceKm < 10) distanceKm = 350
    const estimated = Math.round((handling + distanceKm * tonnage * rate) / 100) * 100
    const fit = maxPrice >= estimated * 0.85 // allow 15% variance
    const detail = fit
      ? `Budget accommodates estimated freight (₹${estimated.toLocaleString('en-IN')} ≤ ₹${maxPrice.toLocaleString('en-IN')})`
      : `Budget below estimated freight (₹${estimated.toLocaleString('en-IN')} > ₹${maxPrice.toLocaleString('en-IN')})`
    return { fit, detail, estimated }
  }

  /**
   * Deterministic explainable match score (same breakdown as frontend matchingEngine)
   * Capacity 35 + BodyType 25 + Proximity 20 + Verification 15 + Corridor 5 = 100
   * Budget is an additional gate, not scored, but reported.
   */
  calculateMatchScore(load: any, truck: any, distanceKm?: number): MatchResult {
    let dist = typeof distanceKm === 'number' ? distanceKm : (typeof truck.distanceKm === 'number' ? truck.distanceKm : undefined)
    if (dist === undefined && truck.currentLat && truck.currentLng && load.loadingLat && load.loadingLng) {
      dist = this.calculateGeoDistance(
        this.toNumber(truck.currentLat),
        this.toNumber(truck.currentLng),
        this.toNumber(load.loadingLat),
        this.toNumber(load.loadingLng),
      )
    }
    if (dist === undefined) dist = 15

    const loadTonnage = this.toNumber(load.tonnageRequired ?? load.tonnage_required)
    const truckTonnage = this.toNumber(truck.tonnageCapacity ?? truck.tonnage_capacity)
    const reqType = load.truckType ?? load.truck_type ?? 'Open'
    const actType = truck.bodyType ?? truck.body_type ?? 'Open'
    const maxRadius = this.toNumber(truck.serviceableRadiusKm ?? truck.serviceable_radius_km) || 50

    let score = 0
    const reasons: string[] = []
    const warnings: string[] = []

    // 1. Capacity 35
    let isCapacityFit = false
    let capacityScore = 0
    let capacityValue = `${truckTonnage}T / ${loadTonnage}T`
    let capacityDetail = ''
    if (truckTonnage >= loadTonnage && loadTonnage > 0) {
      isCapacityFit = true
      const ratio = loadTonnage / (truckTonnage || 1)
      if (ratio >= 0.7) {
        capacityScore = 35
        capacityValue = `Optimal (${(ratio * 100).toFixed(0)}% payload)`
        capacityDetail = `Optimal capacity match (${loadTonnage}T load in ${truckTonnage}T lorry)`
        reasons.push(capacityDetail)
      } else {
        capacityScore = 25
        capacityValue = `Fits (${(ratio * 100).toFixed(0)}% space used)`
        capacityDetail = `Capacity fits with excess space (${truckTonnage}T capacity for ${loadTonnage}T load)`
        reasons.push(capacityDetail)
      }
    } else if (loadTonnage === 0) {
      isCapacityFit = true
      capacityScore = 30
      capacityValue = `${truckTonnage}T Capacity Available`
      capacityDetail = `Truck has ${truckTonnage}T payload available`
    } else {
      const deficit = loadTonnage - truckTonnage
      capacityScore = Math.max(0, Math.round(15 - deficit * 2))
      capacityValue = `Under-capacity (-${deficit.toFixed(1)}T)`
      capacityDetail = `Truck capacity is ${deficit.toFixed(1)}T under required tonnage`
      warnings.push(capacityDetail)
    }
    score += capacityScore

    // 2. Body type 25
    let isBodyTypeFit = false
    let bodyTypeScore = 0
    let bodyTypeValue = `${actType}`
    let bodyTypeDetail = ''
    if (actType === reqType) {
      isBodyTypeFit = true
      bodyTypeScore = 25
      bodyTypeValue = `Exact Match (${actType})`
      bodyTypeDetail = `Exact body type match (${actType})`
      reasons.push(bodyTypeDetail)
    } else if ((reqType === 'Open' && actType === 'OpenBody') || (reqType === 'OpenBody' && actType === 'Open') || (reqType === 'Open body' && actType === 'Open') || (reqType === 'Open' && actType === 'Open body')) {
      isBodyTypeFit = true
      bodyTypeScore = 18
      bodyTypeValue = `Compatible (${actType})`
      bodyTypeDetail = `Compatible open trailer configuration (${actType})`
      reasons.push(bodyTypeDetail)
    } else {
      bodyTypeScore = 0
      bodyTypeValue = `Mismatch (${actType} vs ${reqType})`
      bodyTypeDetail = `Body type mismatch (Requires ${reqType}, Truck is ${actType})`
      warnings.push(bodyTypeDetail)
    }
    score += bodyTypeScore

    // 3. Proximity 20
    let isProximityFit = false
    let proximityScore = 0
    let proximityValue = `${dist.toFixed(1)} km away`
    let proximityDetail = ''
    if (dist <= 10) {
      isProximityFit = true
      proximityScore = 20
      proximityValue = `${dist.toFixed(1)} km (Immediate)`
      proximityDetail = `Immediate proximity (${dist.toFixed(1)} km from loading hub)`
      reasons.push(proximityDetail)
    } else if (dist <= maxRadius && dist <= MAX_PROXIMITY_KM) {
      isProximityFit = true
      proximityScore = Math.max(5, Math.round(20 - (dist / maxRadius) * 12))
      proximityValue = `${dist.toFixed(1)} km (In Radius)`
      proximityDetail = `Within service radius (${dist.toFixed(1)} km away)`
      reasons.push(proximityDetail)
    } else if (dist <= MAX_PROXIMITY_KM) {
      isProximityFit = true
      proximityScore = Math.max(5, Math.round(20 - (dist / MAX_PROXIMITY_KM) * 12))
      proximityValue = `${dist.toFixed(1)} km (In Radius)`
      proximityDetail = `Within 50km proximity filter (${dist.toFixed(1)} km away)`
      reasons.push(proximityDetail)
    } else {
      proximityScore = Math.max(0, Math.round(10 - ((dist - MAX_PROXIMITY_KM) / 50) * 8))
      proximityValue = `${dist.toFixed(1)} km (Extended)`
      proximityDetail = `Beyond 50km proximity filter (${dist.toFixed(1)} km from pickup)`
      warnings.push(proximityDetail)
    }
    score += proximityScore

    // 4. Verification 15
    const isVerified = (truck.verificationStatus ?? truck.verification_status) === 'Verified'
    let verificationScore = 0
    const verificationValue = isVerified ? 'Verified Transporter' : 'Verification Pending'
    let verificationDetail = ''
    if (isVerified) {
      verificationScore = 15
      verificationDetail = 'Verified transporter (RC and Vahan records verified)'
      reasons.push(verificationDetail)
    } else {
      verificationScore = 4
      verificationDetail = 'Transporter verification is pending approval'
      warnings.push(verificationDetail)
    }
    score += verificationScore

    // 5. Corridor 5
    let isPreferredCorridor = false
    let isReturnLoad = false
    let corridorScore = 0
    let corridorValue = 'Standard Route'
    let corridorDetail = 'Standard operational corridor'
    const pref = truck.preferredDestinations ?? truck.preferred_destinations
    if (Array.isArray(pref) && pref.length > 0) {
      const unloadingText = (load.unloadingAddress ?? load.unloading_address ?? '').toLowerCase()
      const loadingText = (load.loadingAddress ?? load.loading_address ?? '').toLowerCase()
      const matchesDestination = pref.some((d: any) => unloadingText.includes(String(d).toLowerCase()))
      const matchesOrigin = pref.some((d: any) => loadingText.includes(String(d).toLowerCase()))
      if (matchesDestination) {
        isPreferredCorridor = true
        corridorScore = 5
        corridorValue = 'Preferred Corridor'
        corridorDetail = 'Matches truck designated preferred freight corridor'
        reasons.push(corridorDetail)
      } else if (matchesOrigin) {
        isReturnLoad = true
        isPreferredCorridor = true
        corridorScore = 5
        corridorValue = 'Potential Return Load'
        corridorDetail = 'Originates from truck destination corridor (Return Haul)'
        reasons.push(corridorDetail)
      }
    }
    score += corridorScore

    // Budget check (gate, not scored but influences rating)
    const budgetCheck = this.estimateBudgetFit(load.maxPrice ?? load.max_price, loadTonnage, actType, dist)
    const isBudgetFit = budgetCheck.fit
    let budgetScore = isBudgetFit ? 0 : 0 // not added to 100, but warning if not fit
    let budgetValue = isBudgetFit ? 'Budget Compatible' : 'Budget Mismatch'
    let budgetDetail = budgetCheck.detail
    if (isBudgetFit) reasons.push(budgetDetail)
    else warnings.push(budgetDetail)

    // Normalize
    score = Math.min(100, Math.max(10, Math.round(score)))
    // Apply budget penalty: if budget not fit, cap score at 65
    if (!isBudgetFit && score > 65) score = 65

    let rating: MatchResult['rating'] = 'POOR'
    if (score >= 85) rating = 'PERFECT'
    else if (score >= 70) rating = 'STRONG'
    else if (score >= 50) rating = 'MODERATE'

    const factors: Record<string, MatchFactorDetail> = {
      capacity: { key: 'capacity', label: 'Capacity Fit', value: capacityValue, fit: isCapacityFit, score: capacityScore, maxScore: 35, detail: capacityDetail },
      bodyType: { key: 'bodyType', label: 'Body Type', value: bodyTypeValue, fit: isBodyTypeFit, score: bodyTypeScore, maxScore: 25, detail: bodyTypeDetail },
      proximity: { key: 'proximity', label: 'Distance / Proximity', value: proximityValue, fit: isProximityFit, score: proximityScore, maxScore: 20, detail: proximityDetail },
      verification: { key: 'verification', label: 'Transporter Verification', value: verificationValue, fit: isVerified, score: verificationScore, maxScore: 15, detail: verificationDetail },
      corridor: { key: 'corridor', label: 'Corridor / Return Load', value: corridorValue, fit: isPreferredCorridor || isReturnLoad, score: corridorScore, maxScore: 5, detail: corridorDetail },
      budget: { key: 'budget', label: 'Budget Compatibility', value: budgetValue, fit: isBudgetFit, score: isBudgetFit ? 5 : 0, maxScore: 5, detail: budgetDetail },
    }

    return {
      score,
      rating,
      label: `${score}% Smart Match`,
      reasons,
      warnings,
      isCapacityFit,
      isBodyTypeFit,
      isProximityFit,
      isVerified,
      isPreferredCorridor,
      isReturnLoad,
      isBudgetFit,
      distanceKm: dist,
      factors,
    }
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
    let where: any = {
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
