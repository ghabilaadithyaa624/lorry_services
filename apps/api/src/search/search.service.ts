import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { prisma } from '@lorrycarry/database'

@Injectable()
export class SearchService {
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
    
    // Raw query with PostGIS ST_DWithin for radius search
    const whereConditions = [
      `ST_DWithin(current_location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
      `verification_status = 'Verified'`,
    ]
    const queryParams: any[] = [lng, lat, radiusKm * 1000] // Convert to meters
    
    if (truckType) {
      whereConditions.push(`body_type::text = $${queryParams.length + 1}`)
      queryParams.push(truckType)
    }
    
    if (minTonnage) {
      whereConditions.push(`tonnage_capacity >= $${queryParams.length + 1}`)
      queryParams.push(minTonnage)
    }
    
    const query = `
      SELECT 
        t.id,
        t.body_type as "bodyType",
        t.length_ft as "lengthFt",
        t.height_ft as "heightFt",
        t.tonnage_capacity as "tonnageCapacity",
        t.serviceable_radius_km as "serviceableRadiusKm",
        t.preferred_destinations as "preferredDestinations",
        t.verification_status as "verificationStatus",
        ST_Distance(t.current_location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as "distanceKm",
        -- MASKED: user_id, registration_number hidden for non-subscribers
        NULL as "registrationNumber",
        NULL as "ownerPhone",
        NULL as "ownerName"
      FROM trucks t
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY "distanceKm" ASC
      LIMIT 50
    `
    
    const trucks = await prisma.$queryRawUnsafe(query, ...queryParams)
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
    
    const whereConditions = [
      `ST_DWithin(loading_point::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
      `status = 'Open'`,
    ]
    const queryParams: any[] = [lng, lat, radiusKm * 1000]
    
    if (truckType) {
      whereConditions.push(`truck_type::text = $${queryParams.length + 1}`)
      queryParams.push(truckType)
    }
    
    if (maxTonnage) {
      whereConditions.push(`tonnage_required <= $${queryParams.length + 1}`)
      queryParams.push(maxTonnage)
    }
    
    const query = `
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
        ST_Distance(l.loading_point::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as "distanceKm",
        -- MASKED: user_id hidden
        NULL as "ownerPhone",
        NULL as "ownerName"
      FROM loads l
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        l.urgent DESC,
        "distanceKm" ASC,
        l.created_at DESC
      LIMIT 50
    `
    
    const loads = await prisma.$queryRawUnsafe(query, ...queryParams)
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
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Payment Required',
          message: 'An active subscription is required to view contact details.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      )
    }
    
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