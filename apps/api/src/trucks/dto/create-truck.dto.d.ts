import { TruckType } from '@prisma/client';
export declare class CreateTruckDto {
    registrationNumber: string;
    bodyType: TruckType;
    lengthFt: number;
    heightFt: number;
    tonnageCapacity: number;
    currentLocationAddress: string;
    serviceableRadiusKm?: number;
    preferredDestinations?: string[];
}
//# sourceMappingURL=create-truck.dto.d.ts.map