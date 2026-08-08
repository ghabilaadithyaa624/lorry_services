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
import { Injectable } from '@nestjs/common';
import { prisma } from '@lorrycarry/database';
let SearchService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SearchService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SearchService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        /**
         * Find trucks within radius of a location
         * Returns SUMMARY data only (PII masked for non-subscribers)
         */
        async searchTrucks(params) {
            const { lat, lng, radiusKm = 50, truckType, minTonnage, userId } = params;
            // Raw query with PostGIS ST_DWithin for radius search
            const whereConditions = [
                `ST_DWithin(current_location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
                `verification_status = 'Verified'`,
            ];
            const queryParams = [lng, lat, radiusKm * 1000]; // Convert to meters
            if (truckType) {
                whereConditions.push(`body_type = $${queryParams.length + 1}`);
                queryParams.push(truckType);
            }
            if (minTonnage) {
                whereConditions.push(`tonnage_capacity >= $${queryParams.length + 1}`);
                queryParams.push(minTonnage);
            }
            const query = `
      SELECT 
        t.id,
        t.body_type as "bodyType",
        t.length_ft as "lengthFt",
        t.height_ft as "heightFt",
        t.tonnage_capacity as "tonnageCapacity",
        t.serviceable_radius_km as "serviceableRadiusKm",
        t.preferred_destinations as "preferredDestinations",
        t.verification_status as "verificationStatus",
        ST_Distance(t.current_location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as "distanceKm",
        -- MASKED: user_id, registration_number hidden for non-subscribers
        NULL as "registrationNumber",
        NULL as "ownerPhone",
        NULL as "ownerName"
      FROM trucks t
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY "distanceKm" ASC
      LIMIT 50
    `;
            const trucks = await prisma.$queryRawUnsafe(query, ...queryParams);
            return trucks;
        }
        /**
         * Find loads within radius of a location
         */
        async searchLoads(params) {
            const { lat, lng, radiusKm = 50, truckType, maxTonnage, userId } = params;
            const whereConditions = [
                `ST_DWithin(loading_point::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
                `status = 'Open'`,
            ];
            const queryParams = [lng, lat, radiusKm * 1000];
            if (truckType) {
                whereConditions.push(`truck_type = $${queryParams.length + 1}`);
                queryParams.push(truckType);
            }
            if (maxTonnage) {
                whereConditions.push(`tonnage_required <= $${queryParams.length + 1}`);
                queryParams.push(maxTonnage);
            }
            const query = `
      SELECT 
        l.id,
        l.tonnage_required as "tonnageRequired",
        l.loading_address as "loadingAddress",
        l.loading_pin as "loadingPin",
        l.unloading_address as "unloadingAddress",
        l.unloading_pin as "unloadingPin",
        l.truck_type as "truckType",
        l.min_length_ft as "minLengthFt",
        l.min_height_ft as "minHeightFt",
        l.urgent,
        l.max_price as "maxPrice",
        l.expected_delivery_at as "expectedDeliveryAt",
        l.advance_payable as "advancePayable",
        ST_Distance(l.loading_point::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as "distanceKm",
        -- MASKED: user_id hidden
        NULL as "ownerPhone",
        NULL as "ownerName"
      FROM loads l
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        l.urgent DESC,
        "distanceKm" ASC,
        l.created_at DESC
      LIMIT 50
    `;
            const loads = await prisma.$queryRawUnsafe(query, ...queryParams);
            return loads;
        }
        /**
         * Reveal full contact details (requires active subscription)
         */
        async revealContact(userId, listingId, type) {
            // Check subscription
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'active',
                    expiresAt: { gt: new Date() },
                },
            });
            if (!subscription) {
                throw new Error('SUBSCRIPTION_REQUIRED');
            }
            if (type === 'truck') {
                return prisma.truck.findUnique({
                    where: { id: listingId },
                    include: {
                        user: {
                            select: { phone: true, name: true },
                        },
                        documents: {
                            where: { verificationStatus: 'Verified' },
                            select: { type: true, docNumber: true },
                        },
                    },
                });
            }
            else {
                return prisma.load.findUnique({
                    where: { id: listingId },
                    include: {
                        user: {
                            select: { phone: true, name: true },
                        },
                    },
                });
            }
        }
        /**
         * Check if user has an active subscription
         */
        async checkSubscription(userId) {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'active',
                    expiresAt: { gt: new Date() },
                },
            });
            return !!subscription;
        }
    };
    return SearchService = _classThis;
})();
export { SearchService };
//# sourceMappingURL=search.service.js.map