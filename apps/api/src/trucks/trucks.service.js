var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma, VerificationStatus } from '@lorrycarry/database';
let TrucksService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var TrucksService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TrucksService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        mapmyIndia;
        s3;
        constructor(mapmyIndia, s3) {
            this.mapmyIndia = mapmyIndia;
            this.s3 = s3;
        }
        async create(userId, dto) {
            // Check for duplicate registration
            const existing = await prisma.truck.findUnique({
                where: { registrationNumber: dto.registrationNumber.toUpperCase() },
            });
            if (existing) {
                throw new ConflictException('Registration number already exists');
            }
            // Geocode current location
            const location = await this.mapmyIndia.geocodeAddress(dto.currentLocationAddress);
            if (!location) {
                throw new NotFoundException('Could not geocode location. Please check the address.');
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
            });
            await prisma.$executeRawUnsafe(`UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`, location.lng, location.lat, truck.id);
            return truck;
        }
        async uploadDocument(truckId, userId, file, docType, docNumber) {
            // Verify truck ownership
            const truck = await prisma.truck.findFirst({
                where: { id: truckId, userId },
            });
            if (!truck) {
                throw new NotFoundException('Truck not found or not authorized');
            }
            // Validate file
            const validation = this.s3.validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 5);
            if (!validation.valid) {
                throw new ConflictException(validation.error);
            }
            // Upload to S3
            const uploadResult = await this.s3.uploadFile(file.buffer, file.mimetype, 'kyc', userId);
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
            });
            return {
                document,
                signedUrl: uploadResult.signedUrl,
            };
        }
        async findByUser(userId) {
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
            });
        }
        async findOne(id, requestingUserId) {
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
            });
            if (!truck) {
                throw new NotFoundException('Truck not found');
            }
            // Mask contact if not owner
            const isOwner = truck.userId === requestingUserId;
            if (!isOwner) {
                truck.user.phone = null;
                truck.user.name = null;
            }
            return truck;
        }
        async updateLocation(truckId, userId, address) {
            const truck = await prisma.truck.findFirst({
                where: { id: truckId, userId },
            });
            if (!truck) {
                throw new NotFoundException('Truck not found');
            }
            const location = await this.mapmyIndia.geocodeAddress(address);
            if (!location) {
                throw new NotFoundException('Could not geocode address');
            }
            const updated = await prisma.truck.update({
                where: { id: truckId },
                data: {
                    currentLat: location.lat,
                    currentLng: location.lng,
                },
            });
            await prisma.$executeRawUnsafe(`UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`, location.lng, location.lat, truckId);
            return updated;
        }
    };
    return TrucksService = _classThis;
})();
export { TrucksService };
//# sourceMappingURL=trucks.service.js.map