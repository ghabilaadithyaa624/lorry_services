export declare class SearchService {
    /**
     * Find trucks within radius of a location
     * Returns SUMMARY data only (PII masked for non-subscribers)
     */
    searchTrucks(params: {
        lat: number;
        lng: number;
        radiusKm?: number;
        truckType?: string;
        minTonnage?: number;
        userId?: string;
    }): Promise<unknown>;
    /**
     * Find loads within radius of a location
     */
    searchLoads(params: {
        lat: number;
        lng: number;
        radiusKm?: number;
        truckType?: string;
        maxTonnage?: number;
        userId?: string;
    }): Promise<unknown>;
    /**
     * Reveal full contact details (requires active subscription)
     */
    revealContact(userId: string, listingId: string, type: 'truck' | 'load'): Promise<({
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
    /**
     * Check if user has an active subscription
     */
    checkSubscription(userId: string): Promise<boolean>;
}
//# sourceMappingURL=search.service.d.ts.map