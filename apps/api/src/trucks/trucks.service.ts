import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { prisma, VerificationStatus, Prisma } from '@lorrycarry/database'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { VahanService } from '../common/services/vahan.service'
import { S3Service } from '../common/services/s3.service'
import { CreateTruckDto } from './dto/create-truck.dto'

@Injectable()
export class TrucksService {
  constructor(
    private mapmyIndia: MapmyIndiaService,
    private vahan: VahanService,
    private s3: S3Service
  ) {}

  async create(userId: string, dto: CreateTruckDto) {
    const registrationNumber = dto.registrationNumber.toUpperCase().trim()

    // Vahan format gate: reject malformed plates before any DB or API work.
    if (!this.vahan.isValidRegistrationFormat(registrationNumber)) {
      throw new BadRequestException(
        'Registration number must be a valid Indian vehicle number, e.g. MH12QW8842 or 21BH0000AA'
      )
    }

    // Check for duplicate registration
    const existing = await prisma.truck.findUnique({
      where: { registrationNumber },
    })

    if (existing) {
      throw new ConflictException('Registration number already exists')
    }

    // Geocode current location
    const location = await this.mapmyIndia.geocodeAddress(dto.currentLocationAddress)
    
    if (!location) {
      throw new NotFoundException('Could not geocode location. Please check the address.')
    }

    // Best-effort Vahan RC validation: never blocks registration, but stores
    // the snapshot + validation timestamp when the RC resolves successfully.
    let vahanDetails: Prisma.InputJsonValue | undefined
    let vahanValidatedAt: Date | undefined
    try {
      const rcResult = await this.vahan.validateRC(registrationNumber)
      const snapshot = this.vahan.toPersistableSnapshot(rcResult)
      if (snapshot) {
        vahanDetails = snapshot as Prisma.InputJsonValue
        vahanValidatedAt = new Date()
        if (!rcResult.valid) {
          this.logRcConcern(registrationNumber, rcResult.error)
        }
      }
    } catch (err: any) {
      // Registry unavailable — registration proceeds, admin KYC still applies.
    }

    const truck = await prisma.truck.create({
      data: {
        userId,
        registrationNumber,
        bodyType: dto.bodyType,
        lengthFt: dto.lengthFt,
        heightFt: dto.heightFt,
        tonnageCapacity: dto.tonnageCapacity,
        currentLat: location.lat,
        currentLng: location.lng,
        serviceableRadiusKm: dto.serviceableRadiusKm ?? 50,
        preferredDestinations: dto.preferredDestinations || [],
        verificationStatus: VerificationStatus.Pending,
        vahanDetails,
        vahanValidatedAt,
      },
    })

    try {
      await prisma.$executeRaw`UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography WHERE id = ${truck.id}`
    } catch (err) {
      // PostGIS point update fallback
    }

    return truck
  }

  private logRcConcern(registrationNumber: string, error?: string): void {
    // Surfaced for ops visibility; truck remains Pending for admin KYC review.
    console.warn(`[TrucksService] Vahan RC concern for ${registrationNumber}: ${error || 'unknown'}`)
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
      await prisma.$executeRaw`UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography WHERE id = ${truckId}`
    } catch (err) {
      // PostGIS point update fallback
    }

    return updatedTruck
  }
}
