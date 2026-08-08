import { LoadStatus } from '@lorrycarry/database';
import { MapmyIndiaService } from '../common/services/mapmyindia.service';
import { CreateLoadDto } from './dto/create-load.dto';
export declare class LoadsService {
    private mapmyIndia;
    constructor(mapmyIndia: MapmyIndiaService);
    create(userId: string, dto: CreateLoadDto): Promise<{
        distanceKm: number;
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
    }>;
    findByUser(userId: string, status?: LoadStatus): Promise<({
        _count: {
            bookings: number;
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
    })[]>;
    findOne(id: string, requestingUserId?: string): Promise<{
        user: {
            id: string;
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
    }>;
    updateStatus(id: string, userId: string, status: LoadStatus): Promise<{
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
    }>;
    delete(id: string, userId: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=loads.service.d.ts.map