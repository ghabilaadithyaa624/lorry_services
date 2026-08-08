import { TrucksService } from './trucks.service';
import { CreateTruckDto } from './dto/create-truck.dto';
export declare class TrucksController {
    private readonly trucksService;
    constructor(trucksService: TrucksService);
    create(dto: CreateTruckDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        registrationNumber: string;
        bodyType: import(".prisma/client").$Enums.TruckType;
        lengthFt: number;
        heightFt: number;
        tonnageCapacity: import("@prisma/client/runtime/library").Decimal;
        serviceableRadiusKm: number;
        preferredDestinations: import("@prisma/client/runtime/library").JsonValue | null;
        currentLat: import("@prisma/client/runtime/library").Decimal | null;
        currentLng: import("@prisma/client/runtime/library").Decimal | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        verifiedAt: Date | null;
    }>;
    uploadDocument(truckId: string, docType: 'RC' | 'Insurance', file: Express.Multer.File, userId: string, docNumber?: string): Promise<{
        document: {
            id: string;
            type: import(".prisma/client").$Enums.DocumentType;
            createdAt: Date;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            verifiedAt: Date | null;
            docNumber: string | null;
            s3Url: string;
            s3Key: string;
            originalFilename: string | null;
            fileSize: number | null;
            mimeType: string | null;
            verifiedBy: string | null;
            verificationNotes: string | null;
            truckId: string;
        };
        signedUrl: string;
    }>;
    findMyTrucks(userId: string): Promise<({
        documents: {
            id: string;
            type: import(".prisma/client").$Enums.DocumentType;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            verifiedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        registrationNumber: string;
        bodyType: import(".prisma/client").$Enums.TruckType;
        lengthFt: number;
        heightFt: number;
        tonnageCapacity: import("@prisma/client/runtime/library").Decimal;
        serviceableRadiusKm: number;
        preferredDestinations: import("@prisma/client/runtime/library").JsonValue | null;
        currentLat: import("@prisma/client/runtime/library").Decimal | null;
        currentLng: import("@prisma/client/runtime/library").Decimal | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        verifiedAt: Date | null;
    })[]>;
    findOne(id: string, userId: string): Promise<{
        documents: {
            type: import(".prisma/client").$Enums.DocumentType;
            docNumber: string | null;
        }[];
        user: {
            id: string;
            name: string | null;
            phone: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        registrationNumber: string;
        bodyType: import(".prisma/client").$Enums.TruckType;
        lengthFt: number;
        heightFt: number;
        tonnageCapacity: import("@prisma/client/runtime/library").Decimal;
        serviceableRadiusKm: number;
        preferredDestinations: import("@prisma/client/runtime/library").JsonValue | null;
        currentLat: import("@prisma/client/runtime/library").Decimal | null;
        currentLng: import("@prisma/client/runtime/library").Decimal | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        verifiedAt: Date | null;
    }>;
    updateLocation(id: string, address: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        registrationNumber: string;
        bodyType: import(".prisma/client").$Enums.TruckType;
        lengthFt: number;
        heightFt: number;
        tonnageCapacity: import("@prisma/client/runtime/library").Decimal;
        serviceableRadiusKm: number;
        preferredDestinations: import("@prisma/client/runtime/library").JsonValue | null;
        currentLat: import("@prisma/client/runtime/library").Decimal | null;
        currentLng: import("@prisma/client/runtime/library").Decimal | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        verifiedAt: Date | null;
    }>;
}
//# sourceMappingURL=trucks.controller.d.ts.map