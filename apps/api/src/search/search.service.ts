import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { prisma, Prisma } from '@lorrycarry/database'

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  /**
   * Find trucks within radius of a location
   * Returns SUMMARY data only (PII masked for non-subscribers)
   */
  async searchTrucks(params: {
    lat: number
    lng: number
    radiusKm?: number
    truckType?: string
    minTonnage?: number
    userId?: string
  }) {
    const { lat, lng, radiusKm = 50, truckType, minTonnage, userId } = params
    
    const radiusMeters = radiusKm * 1000

    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`ST_DWithin(t.current_location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
      Prisma.sql`t.verification_status = 'Verified'`
    ]
    
    if (truckType) {
      whereConditions.push(Prisma.sql`t.body_type::text = ${truckType}`)
    }
    
    if (minTonnage) {
      whereConditions.push(Prisma.sql`t.tonnage_capacity >= ${minTonnage}`)
    }
    
    const whereClause = Prisma.join(whereConditions, ' AND ')

    const query = Prisma.sql`
      SELECT 
        t.id,
        t.body_type as "bodyType",
        t.length_ft as "lengthFt",
        t.height_ft as "heightFt",
        t.tonnage_capacity as "tonnageCapacity",
        t.serviceable_radius_km as "serviceableRadiusKm",
        t.preferred_destinations as "preferredDestinations",
        t.verification_status as "verificationStatus",
        ST_Distance(t.current_location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 as "distanceKm",
        -- MASKED: user_id, registration_number hidden for non-subscribers
        NULL as "registrationNumber",
        NULL as "ownerPhone",
        NULL as "ownerName"
      FROM trucks t
      WHERE ${whereClause}
      ORDER BY "distanceKm" ASC
      LIMIT 50
    `
    
    const trucks = await prisma.$queryRaw<any[]>(query)
    return trucks
  }

  /**
   * Find loads within radius of a location
   */
  async searchLoads(params: {
    lat: number
    lng: number
    radiusKm?: number
    truckType?: string
    maxTonnage?: number
    userId?: string
  }) {
    const { lat, lng, radiusKm = 50, truckType, maxTonnage, userId } = params
    
    const radiusMeters = radiusKm * 1000

    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`ST_DWithin(l.loading_point::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
      Prisma.sql`l.status = 'Open'`
    ]
    
    if (truckType) {
      whereConditions.push(Prisma.sql`l.truck_type::text = ${truckType}`)
    }
    
    if (maxTonnage) {
      whereConditions.push(Prisma.sql`l.tonnage_required <= ${maxTonnage}`)
    }
    
    const whereClause = Prisma.join(whereConditions, ' AND ')

    const query = Prisma.sql`
      SELECT 
        l.id,
        l.tonnage_required as "tonnageRequired",
        l.loading_address as "loadingAddress",
        l.loading_pin as "loadingPin",
        l.unloading_address as "unloadingAddress",
        l.unloading_pin as "unloadingPin",
        l.truck_type as "truckType",
        l.min_length_ft as "minLengthFt",
        l.min_height_ft as "minHeightFt",
        l.urgent,
        l.max_price as "maxPrice",
        l.expected_delivery_at as "expectedDeliveryAt",
        l.advance_payable as "advancePayable",
        ST_Distance(l.loading_point::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 as "distanceKm",
        -- MASKED: user_id hidden
        NULL as "ownerPhone",
        NULL as "ownerName"
      FROM loads l
      WHERE ${whereClause}
      ORDER BY 
        l.urgent DESC,
        "distanceKm" ASC,
        l.created_at DESC
      LIMIT 50
    `
    
    const loads = await prisma.$queryRaw<any[]>(query)
    return loads
  }

  /**
   * Reveal full contact details (requires active subscription)
   */
  async revealContact(userId: string, listingId: string, type: 'truck' | 'load') {
    // Check subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: { gt: new Date() },
      },
    })
    
    if (!subscription) {
      this.logger.warn(
        `Contact reveal denied (no active subscription): userId=${userId}, type=${type}, listingId=${listingId}`,
      )
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Payment Required',
          message: 'An active subscription is required to view contact details.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    this.logger.log(
      `Contact reveal authorized: userId=${userId}, type=${type}, listingId=${listingId}`,
    )
    
    if (type === 'truck') {
      return prisma.truck.findUnique({
        where: { id: listingId },
        include: {
          user: {
            select: { phone: true, name: true },
          },
          documents: {
            where: { verificationStatus: 'Verified' },
            select: { type: true, docNumber: true },
          },
        },
      })
    } else {
      return prisma.load.findUnique({
        where: { id: listingId },
        include: {
          user: {
            select: { phone: true, name: true },
          },
        },
      })
    }
  }

  /**
   * Check if user has an active subscription
   */
  async checkSubscription(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: { gt: new Date() },
      },
    })
    return !!subscription
  }
}