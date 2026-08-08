import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    searchTrucks(lat: string, lng: string, radius: string, truckType?: string, minTonnage?: string, userId?: string): Promise<unknown>;
    searchLoads(lat: string, lng: string, radius: string, truckType?: string, maxTonnage?: string, userId?: string): Promise<unknown>;
    revealContact(type: 'truck' | 'load', id: string, userId: string): Promise<({
        documents: {
            type: import(".prisma/client").$Enums.DocumentType;
            docNumber: string | null;
        }[];
        user: {
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
    }) | ({
        user: {
            name: string | null;
            phone: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.LoadStatus;
        createdAt: Date;
        updatedAt: Date;
        tonnageRequired: import("@prisma/client/runtime/library").Decimal;
        loadingAddress: string;
        loadingPin: string;
        unloadingAddress: string;
        unloadingPin: string;
        truckType: import(".prisma/client").$Enums.TruckType;
        minLengthFt: number | null;
        minHeightFt: number | null;
        urgent: boolean;
        maxPrice: import("@prisma/client/runtime/library").Decimal | null;
        expectedDeliveryAt: Date | null;
        advancePayable: import("@prisma/client/runtime/library").Decimal | null;
        loadingLat: import("@prisma/client/runtime/library").Decimal | null;
        loadingLng: import("@prisma/client/runtime/library").Decimal | null;
        unloadingLat: import("@prisma/client/runtime/library").Decimal | null;
        unloadingLng: import("@prisma/client/runtime/library").Decimal | null;
        userId: string;
    }) | null>;
    checkSubscription(userId: string): Promise<{
        hasSubscription: boolean;
    }>;
}
//# sourceMappingURL=search.controller.d.ts.map