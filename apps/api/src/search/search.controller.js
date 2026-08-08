var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
let SearchController = (() => {
    let _classDecorators = [ApiTags('Search'), ApiBearerAuth(), UseGuards(JwtAuthGuard), Controller('search')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _searchTrucks_decorators;
    let _searchLoads_decorators;
    let _revealContact_decorators;
    let _checkSubscription_decorators;
    var SearchController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _searchTrucks_decorators = [Get('trucks'), ApiOperation({ summary: 'Search trucks within radius (summary only)' })];
            _searchLoads_decorators = [Get('loads'), ApiOperation({ summary: 'Search loads within radius (summary only)' })];
            _revealContact_decorators = [Post(':type/:id/reveal'), ApiOperation({ summary: 'Reveal contact details (requires subscription)' })];
            _checkSubscription_decorators = [Get('subscription-status'), ApiOperation({ summary: 'Check if user has active subscription' })];
            __esDecorate(this, null, _searchTrucks_decorators, { kind: "method", name: "searchTrucks", static: false, private: false, access: { has: obj => "searchTrucks" in obj, get: obj => obj.searchTrucks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _searchLoads_decorators, { kind: "method", name: "searchLoads", static: false, private: false, access: { has: obj => "searchLoads" in obj, get: obj => obj.searchLoads }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _revealContact_decorators, { kind: "method", name: "revealContact", static: false, private: false, access: { has: obj => "revealContact" in obj, get: obj => obj.revealContact }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _checkSubscription_decorators, { kind: "method", name: "checkSubscription", static: false, private: false, access: { has: obj => "checkSubscription" in obj, get: obj => obj.checkSubscription }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SearchController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        searchService = __runInitializers(this, _instanceExtraInitializers);
        constructor(searchService) {
            this.searchService = searchService;
        }
        async searchTrucks(lat, lng, radius, truckType, minTonnage, userId) {
            return this.searchService.searchTrucks({
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                radiusKm: radius ? parseInt(radius) : 50,
                truckType,
                minTonnage: minTonnage ? parseFloat(minTonnage) : undefined,
                userId: userId || '',
            });
        }
        async searchLoads(lat, lng, radius, truckType, maxTonnage, userId) {
            return this.searchService.searchLoads({
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                radiusKm: radius ? parseInt(radius) : 50,
                truckType,
                maxTonnage: maxTonnage ? parseFloat(maxTonnage) : undefined,
                userId: userId || '',
            });
        }
        async revealContact(type, id, userId) {
            return this.searchService.revealContact(userId, id, type);
        }
        async checkSubscription(userId) {
            const hasSubscription = await this.searchService.checkSubscription(userId);
            return { hasSubscription };
        }
    };
    return SearchController = _classThis;
})();
export { SearchController };
//# sourceMappingURL=search.controller.js.map