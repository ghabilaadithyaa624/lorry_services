import { TruckType } from '@prisma/client';
export declare class CreateLoadDto {
    tonnageRequired: number;
    loadingAddress: string;
    loadingPin: string;
    unloadingAddress: string;
    unloadingPin: string;
    truckType: TruckType;
    minLengthFt?: number;
    minHeightFt?: number;
    urgent?: boolean;
    maxPrice?: number;
    expectedDeliveryAt?: Date;
    advancePayable?: number;
}
//# sourceMappingURL=create-load.dto.d.ts.map