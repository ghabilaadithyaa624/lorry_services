import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { prisma, VerificationStatus } from '@lorrycarry/database'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { S3Service } from '../common/services/s3.service'
import { CreateTruckDto } from './dto/create-truck.dto'

@Injectable()
export class TrucksService {
  constructor(
    private mapmyIndia: MapmyIndiaService,
    private s3: S3Service
  ) {}

  async create(userId: string, dto: CreateTruckDto) {
    // Check for duplicate registration
    const existing = await prisma.truck.findUnique({
      where: { registrationNumber: dto.registrationNumber.toUpperCase() },
    })

    if (existing) {
      throw new ConflictException('Registration number already exists')
    }

    // Geocode current location
    const location = await this.mapmyIndia.geocodeAddress(dto.currentLocationAddress)
    
    if (!location) {
      throw new NotFoundException('Could not geocode location. Please check the address.')
    }

    const truck = await prisma.truck.create({
      data: {
        userId,
        registrationNumber: dto.registrationNumber.toUpperCase(),
        bodyType: dto.bodyType,
        lengthFt: dto.lengthFt,
        heightFt: dto.heightFt,
        tonnageCapacity: dto.tonnageCapacity,
        currentLat: location.lat,
        currentLng: location.lng,
        serviceableRadiusKm: dto.serviceableRadiusKm ?? 50,
        preferredDestinations: dto.preferredDestinations || [],
        verificationStatus: VerificationStatus.Pending,
      },
    })

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
        location.lng,
        location.lat,
        truck.id
      )
    } catch (err) {
      // PostGIS point update fallback
    }

    return truck
  }

  async uploadDocument(
    truckId: string,
    userId: string,
    file: Express.Multer.File,
    docType: 'RC' | 'Insurance',
    docNumber?: string
  ) {
    // Verify truck ownership
    const truck = await prisma.truck.findFirst({
      where: { id: truckId, userId },
    })

    if (!truck) {
      throw new NotFoundException('Truck not found or not authorized')
    }

    // Validate file
    const validation = this.s3.validateFile(
      file,
      ['application/pdf', 'image/jpeg', 'image/png'],
      5
    )

    if (!validation.valid) {
      throw new ConflictException(validation.error)
    }

    // Upload to S3
    const uploadResult = await this.s3.uploadFile(
      file.buffer,
      file.mimetype,
      'kyc',
      userId
    )

    // Create document record
    const document = await prisma.document.create({
      data: {
        truckId,
        type: docType,
        docNumber: docNumber?.toUpperCase(),
        s3Url: uploadResult.url,
        s3Key: uploadResult.key,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        verificationStatus: VerificationStatus.Pending,
      },
    })

    return {
      document,
      signedUrl: uploadResult.signedUrl,
    }
  }

  async findByUser(userId: string) {
    return prisma.truck.findMany({
      where: { userId },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            verificationStatus: true,
            verifiedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, requestingUserId?: string) {
    const truck = await prisma.truck.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        documents: {
          where: { verificationStatus: VerificationStatus.Verified },
          select: {
            type: true,
            docNumber: true,
          },
        },
      },
    })

    if (!truck) {
      throw new NotFoundException('Truck not found')
    }

    // Mask contact if not owner
    const isOwner = truck.userId === requestingUserId
    if (!isOwner) {
      truck.user.phone = null as any
      truck.user.name = null as any
    }

    return truck
  }

  async updateLocation(truckId: string, userId: string, address: string) {
    const truck = await prisma.truck.findFirst({
      where: { id: truckId, userId },
    })

    if (!truck) {
      throw new NotFoundException('Truck not found')
    }

    const location = await this.mapmyIndia.geocodeAddress(address)
    if (!location) {
      throw new NotFoundException('Could not geocode address')
    }

    const updatedTruck = await prisma.truck.update({
      where: { id: truckId },
      data: {
        currentLat: location.lat,
        currentLng: location.lng,
      },
    })

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
        location.lng,
        location.lat,
        truckId
      )
    } catch (err) {
      // PostGIS point update fallback
    }

    return updatedTruck
  }
}
