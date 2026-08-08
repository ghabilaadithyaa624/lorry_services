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
import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, LoadStatus } from '@lorrycarry/database';
let LoadsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var LoadsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            LoadsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        mapmyIndia;
        constructor(mapmyIndia) {
            this.mapmyIndia = mapmyIndia;
        }
        async create(userId, dto) {
            // Geocode loading address
            const loadingGeo = await this.mapmyIndia.geocodeAddress(`${dto.loadingAddress}, ${dto.loadingPin}`);
            if (!loadingGeo) {
                throw new NotFoundException('Could not geocode loading address. Please check and try again.');
            }
            // Geocode unloading address
            const unloadingGeo = await this.mapmyIndia.geocodeAddress(`${dto.unloadingAddress}, ${dto.unloadingPin}`);
            if (!unloadingGeo) {
                throw new NotFoundException('Could not geocode unloading address. Please check and try again.');
            }
            // Create load with geospatial data
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
            });
            // Update PostGIS geography points
            await prisma.$executeRawUnsafe(`UPDATE loads SET 
        loading_point = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        unloading_point = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
       WHERE id = $5`, loadingGeo.lng, loadingGeo.lat, unloadingGeo.lng, unloadingGeo.lat, load.id);
            return {
                ...load,
                distanceKm: this.mapmyIndia.calculateDistance(loadingGeo.lat, loadingGeo.lng, unloadingGeo.lat, unloadingGeo.lng),
            };
        }
        async findByUser(userId, status) {
            const where = { userId };
            if (status)
                where.status = status;
            return prisma.load.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { bookings: true },
                    },
                },
            });
        }
        async findOne(id, requestingUserId) {
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
            });
            if (!load) {
                throw new NotFoundException('Load not found');
            }
            // Mask contact info if not the owner
            const isOwner = load.userId === requestingUserId;
            if (!isOwner) {
                load.user.phone = null;
                load.user.name = null;
            }
            return load;
        }
        async updateStatus(id, userId, status) {
            const load = await prisma.load.findFirst({
                where: { id, userId },
            });
            if (!load) {
                throw new NotFoundException('Load not found or not authorized');
            }
            return prisma.load.update({
                where: { id },
                data: { status },
            });
        }
        async delete(id, userId) {
            const load = await prisma.load.findFirst({
                where: { id, userId, status: LoadStatus.Open },
            });
            if (!load) {
                throw new NotFoundException('Load not found or cannot be deleted');
            }
            await prisma.load.delete({ where: { id } });
            return { success: true };
        }
    };
    return LoadsService = _classThis;
})();
export { LoadsService };
//# sourceMappingURL=loads.service.js.map