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
import { Controller, Get, Post, Patch, UseGuards, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
let TrucksController = (() => {
    let _classDecorators = [ApiTags('Trucks'), ApiBearerAuth(), UseGuards(JwtAuthGuard, RolesGuard), Controller('trucks')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _uploadDocument_decorators;
    let _findMyTrucks_decorators;
    let _findOne_decorators;
    let _updateLocation_decorators;
    var TrucksController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _create_decorators = [Post(), Roles(UserRole.truck_owner), ApiOperation({ summary: 'Register a new truck' })];
            _uploadDocument_decorators = [Post(':id/documents/:type'), Roles(UserRole.truck_owner), UseInterceptors(FileInterceptor('file')), ApiConsumes('multipart/form-data'), ApiOperation({ summary: 'Upload RC or Insurance document' })];
            _findMyTrucks_decorators = [Get('my-trucks'), Roles(UserRole.truck_owner), ApiOperation({ summary: 'Get my registered trucks' })];
            _findOne_decorators = [Get(':id'), ApiOperation({ summary: 'Get truck details' })];
            _updateLocation_decorators = [Patch(':id/location'), Roles(UserRole.truck_owner), ApiOperation({ summary: 'Update truck current location' })];
            __esDecorate(this, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _uploadDocument_decorators, { kind: "method", name: "uploadDocument", static: false, private: false, access: { has: obj => "uploadDocument" in obj, get: obj => obj.uploadDocument }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _findMyTrucks_decorators, { kind: "method", name: "findMyTrucks", static: false, private: false, access: { has: obj => "findMyTrucks" in obj, get: obj => obj.findMyTrucks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateLocation_decorators, { kind: "method", name: "updateLocation", static: false, private: false, access: { has: obj => "updateLocation" in obj, get: obj => obj.updateLocation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TrucksController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        trucksService = __runInitializers(this, _instanceExtraInitializers);
        constructor(trucksService) {
            this.trucksService = trucksService;
        }
        async create(dto, userId) {
            return this.trucksService.create(userId, dto);
        }
        async uploadDocument(truckId, docType, file, userId, docNumber) {
            return this.trucksService.uploadDocument(truckId, userId, file, docType, docNumber);
        }
        async findMyTrucks(userId) {
            return this.trucksService.findByUser(userId);
        }
        async findOne(id, userId) {
            return this.trucksService.findOne(id, userId);
        }
        async updateLocation(id, address, userId) {
            return this.trucksService.updateLocation(id, userId, address);
        }
    };
    return TrucksController = _classThis;
})();
export { TrucksController };
//# sourceMappingURL=trucks.controller.js.map