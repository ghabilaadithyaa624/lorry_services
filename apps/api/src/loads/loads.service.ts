import { Injectable, NotFoundException } from '@nestjs/common'
import { prisma, LoadStatus, UserRole } from '@lorrycarry/database'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { CreateLoadDto } from './dto/create-load.dto'

@Injectable()
export class LoadsService {
  constructor(private mapmyIndia: MapmyIndiaService) {}

  async create(userId: string, dto: CreateLoadDto) {
    // Geocode loading address
    const loadingGeo = await this.mapmyIndia.geocodeAddress(
      `${dto.loadingAddress}, ${dto.loadingPin}`
    )
    
    if (!loadingGeo) {
      throw new NotFoundException('Could not geocode loading address. Please check and try again.')
    }

    // Geocode unloading address
    const unloadingGeo = await this.mapmyIndia.geocodeAddress(
      `${dto.unloadingAddress}, ${dto.unloadingPin}`
    )
    
    if (!unloadingGeo) {
      throw new NotFoundException('Could not geocode unloading address. Please check and try again.')
    }

    // Create load record
    const load = await prisma.load.create({
      data: {
        userId,
        tonnageRequired: dto.tonnageRequired,
        loadingAddress: dto.loadingAddress,
        loadingPin: dto.loadingPin,
        loadingLat: loadingGeo.lat,
        loadingLng: loadingGeo.lng,
        unloadingAddress: dto.unloadingAddress,
        unloadingPin: dto.unloadingPin,
        unloadingLat: unloadingGeo.lat,
        unloadingLng: unloadingGeo.lng,
        truckType: dto.truckType,
        minLengthFt: dto.minLengthFt,
        minHeightFt: dto.minHeightFt,
        urgent: dto.urgent ?? false,
        maxPrice: dto.maxPrice,
        expectedDeliveryAt: dto.expectedDeliveryAt,
        advancePayable: dto.advancePayable,
        status: LoadStatus.Open,
      },
    })

    // Update PostGIS geography points via raw SQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, unloading_point = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography WHERE id = $5`,
        loadingGeo.lng,
        loadingGeo.lat,
        unloadingGeo.lng,
        unloadingGeo.lat,
        load.id
      )
    } catch (err) {
      // PostGIS point update fallback
    }

    return {
      ...load,
      distanceKm: this.mapmyIndia.calculateDistance(
        loadingGeo.lat, loadingGeo.lng,
        unloadingGeo.lat, unloadingGeo.lng
      ),
    }
  }

  async findByUser(userId: string, status?: LoadStatus) {
    const where: any = { userId }
    if (status) where.status = status

    return prisma.load.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    })
  }

  async findOne(id: string, requestingUserId?: string) {
    const load = await prisma.load.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!load) {
      throw new NotFoundException('Load not found')
    }

    // Mask contact info if not the owner
    const isOwner = load.userId === requestingUserId
    if (!isOwner) {
      load.user.phone = null as any
      load.user.name = null as any
    }

    return load
  }

  async updateStatus(id: string, userId: string, status: LoadStatus) {
    const load = await prisma.load.findFirst({
      where: { id, userId },
    })

    if (!load) {
      throw new NotFoundException('Load not found or not authorized')
    }

    return prisma.load.update({
      where: { id },
      data: { status },
    })
  }

  async delete(id: string, userId: string) {
    const load = await prisma.load.findFirst({
      where: { id, userId, status: LoadStatus.Open },
    })

    if (!load) {
      throw new NotFoundException('Load not found or cannot be deleted')
    }

    await prisma.load.delete({ where: { id } })
    return { success: true }
  }
}
