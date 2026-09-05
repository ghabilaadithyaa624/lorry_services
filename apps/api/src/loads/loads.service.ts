import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { prisma, LoadStatus, UserRole } from '@lorrycarry/database'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { normalizeRole } from '../common/utils/roles.util'
import { CreateLoadDto } from './dto/create-load.dto'
import { UpdateLoadDto } from './dto/update-load.dto'

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
      await prisma.$executeRaw`UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint(${loadingGeo.lng}, ${loadingGeo.lat}), 4326)::geography, unloading_point = ST_SetSRID(ST_MakePoint(${unloadingGeo.lng}, ${unloadingGeo.lat}), 4326)::geography WHERE id = ${load.id}`
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

  async findByUser(
    userId: string, 
    status?: LoadStatus, 
    page: number = 1, 
    limit: number = 50
  ) {
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50))
    const skip = (safePage - 1) * safeLimit

    const where: any = { userId }
    if (status) where.status = status

    return prisma.load.findMany({
      where,
      skip,
      take: safeLimit,
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

  /**
   * Ownership gate for mutating a load. A load may only be modified by the user
   * who posted it (`load.userId === currentUser.id`) or by an admin. This is the
   * single source of truth for load write authorization, so transporters (who
   * can post loads) can never edit or delete another user's load.
   */
  private async assertLoadOwnership(id: string, userId: string, role?: string | null) {
    const load = await prisma.load.findUnique({ where: { id } })

    if (!load) {
      throw new NotFoundException('Load not found')
    }

    const isAdmin = normalizeRole(role) === UserRole.admin
    if (load.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only modify your own loads')
    }

    return load
  }

  async update(id: string, userId: string, dto: UpdateLoadDto, role?: string | null) {
    const load = await this.assertLoadOwnership(id, userId, role)

    if (load.status !== LoadStatus.Open) {
      throw new ForbiddenException('Only open loads can be edited')
    }

    const data: Partial<{
      tonnageRequired: number
      truckType: typeof dto.truckType
      urgent: boolean
      maxPrice: number
      minLengthFt: number
      minHeightFt: number
    }> = {}
    if (dto.tonnageRequired !== undefined) data.tonnageRequired = dto.tonnageRequired
    if (dto.truckType !== undefined) data.truckType = dto.truckType
    if (dto.urgent !== undefined) data.urgent = dto.urgent
    if (dto.maxPrice !== undefined) data.maxPrice = dto.maxPrice
    if (dto.minLengthFt !== undefined) data.minLengthFt = dto.minLengthFt
    if (dto.minHeightFt !== undefined) data.minHeightFt = dto.minHeightFt

    return prisma.load.update({
      where: { id },
      data,
      include: {
        _count: { select: { bookings: true } },
      },
    })
  }

  async updateStatus(id: string, userId: string, status: LoadStatus, role?: string | null) {
    await this.assertLoadOwnership(id, userId, role)

    return prisma.load.update({
      where: { id },
      data: { status },
    })
  }

  async delete(id: string, userId: string, role?: string | null) {
    const load = await this.assertLoadOwnership(id, userId, role)

    if (load.status !== LoadStatus.Open) {
      throw new NotFoundException('Load cannot be deleted')
    }

    await prisma.load.delete({ where: { id } })
    return { success: true }
  }
}
