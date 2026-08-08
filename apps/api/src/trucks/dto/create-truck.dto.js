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
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TruckType } from '@prisma/client';
let CreateTruckDto = (() => {
    let _registrationNumber_decorators;
    let _registrationNumber_initializers = [];
    let _registrationNumber_extraInitializers = [];
    let _bodyType_decorators;
    let _bodyType_initializers = [];
    let _bodyType_extraInitializers = [];
    let _lengthFt_decorators;
    let _lengthFt_initializers = [];
    let _lengthFt_extraInitializers = [];
    let _heightFt_decorators;
    let _heightFt_initializers = [];
    let _heightFt_extraInitializers = [];
    let _tonnageCapacity_decorators;
    let _tonnageCapacity_initializers = [];
    let _tonnageCapacity_extraInitializers = [];
    let _currentLocationAddress_decorators;
    let _currentLocationAddress_initializers = [];
    let _currentLocationAddress_extraInitializers = [];
    let _serviceableRadiusKm_decorators;
    let _serviceableRadiusKm_initializers = [];
    let _serviceableRadiusKm_extraInitializers = [];
    let _preferredDestinations_decorators;
    let _preferredDestinations_initializers = [];
    let _preferredDestinations_extraInitializers = [];
    return class CreateTruckDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _registrationNumber_decorators = [ApiProperty({ example: 'MH12AB1234' }), IsString()];
            _bodyType_decorators = [ApiProperty({ enum: TruckType }), IsEnum(TruckType)];
            _lengthFt_decorators = [ApiProperty({ example: 20 }), IsNumber(), Min(8), Max(60)];
            _heightFt_decorators = [ApiProperty({ example: 8 }), IsNumber(), Min(6), Max(15)];
            _tonnageCapacity_decorators = [ApiProperty({ example: 16 }), IsNumber(), Min(0.5), Max(100)];
            _currentLocationAddress_decorators = [ApiProperty({ example: 'Pune, Maharashtra' }), IsString()];
            _serviceableRadiusKm_decorators = [ApiProperty({ example: 50, required: false }), IsOptional(), IsNumber(), Min(10), Max(500)];
            _preferredDestinations_decorators = [ApiProperty({ example: ['Bangalore', 'Mumbai', 'Hyderabad'], required: false }), IsOptional()];
            __esDecorate(null, null, _registrationNumber_decorators, { kind: "field", name: "registrationNumber", static: false, private: false, access: { has: obj => "registrationNumber" in obj, get: obj => obj.registrationNumber, set: (obj, value) => { obj.registrationNumber = value; } }, metadata: _metadata }, _registrationNumber_initializers, _registrationNumber_extraInitializers);
            __esDecorate(null, null, _bodyType_decorators, { kind: "field", name: "bodyType", static: false, private: false, access: { has: obj => "bodyType" in obj, get: obj => obj.bodyType, set: (obj, value) => { obj.bodyType = value; } }, metadata: _metadata }, _bodyType_initializers, _bodyType_extraInitializers);
            __esDecorate(null, null, _lengthFt_decorators, { kind: "field", name: "lengthFt", static: false, private: false, access: { has: obj => "lengthFt" in obj, get: obj => obj.lengthFt, set: (obj, value) => { obj.lengthFt = value; } }, metadata: _metadata }, _lengthFt_initializers, _lengthFt_extraInitializers);
            __esDecorate(null, null, _heightFt_decorators, { kind: "field", name: "heightFt", static: false, private: false, access: { has: obj => "heightFt" in obj, get: obj => obj.heightFt, set: (obj, value) => { obj.heightFt = value; } }, metadata: _metadata }, _heightFt_initializers, _heightFt_extraInitializers);
            __esDecorate(null, null, _tonnageCapacity_decorators, { kind: "field", name: "tonnageCapacity", static: false, private: false, access: { has: obj => "tonnageCapacity" in obj, get: obj => obj.tonnageCapacity, set: (obj, value) => { obj.tonnageCapacity = value; } }, metadata: _metadata }, _tonnageCapacity_initializers, _tonnageCapacity_extraInitializers);
            __esDecorate(null, null, _currentLocationAddress_decorators, { kind: "field", name: "currentLocationAddress", static: false, private: false, access: { has: obj => "currentLocationAddress" in obj, get: obj => obj.currentLocationAddress, set: (obj, value) => { obj.currentLocationAddress = value; } }, metadata: _metadata }, _currentLocationAddress_initializers, _currentLocationAddress_extraInitializers);
            __esDecorate(null, null, _serviceableRadiusKm_decorators, { kind: "field", name: "serviceableRadiusKm", static: false, private: false, access: { has: obj => "serviceableRadiusKm" in obj, get: obj => obj.serviceableRadiusKm, set: (obj, value) => { obj.serviceableRadiusKm = value; } }, metadata: _metadata }, _serviceableRadiusKm_initializers, _serviceableRadiusKm_extraInitializers);
            __esDecorate(null, null, _preferredDestinations_decorators, { kind: "field", name: "preferredDestinations", static: false, private: false, access: { has: obj => "preferredDestinations" in obj, get: obj => obj.preferredDestinations, set: (obj, value) => { obj.preferredDestinations = value; } }, metadata: _metadata }, _preferredDestinations_initializers, _preferredDestinations_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        registrationNumber = __runInitializers(this, _registrationNumber_initializers, void 0);
        bodyType = (__runInitializers(this, _registrationNumber_extraInitializers), __runInitializers(this, _bodyType_initializers, void 0));
        lengthFt = (__runInitializers(this, _bodyType_extraInitializers), __runInitializers(this, _lengthFt_initializers, void 0));
        heightFt = (__runInitializers(this, _lengthFt_extraInitializers), __runInitializers(this, _heightFt_initializers, void 0));
        tonnageCapacity = (__runInitializers(this, _heightFt_extraInitializers), __runInitializers(this, _tonnageCapacity_initializers, void 0));
        currentLocationAddress = (__runInitializers(this, _tonnageCapacity_extraInitializers), __runInitializers(this, _currentLocationAddress_initializers, void 0));
        serviceableRadiusKm = (__runInitializers(this, _currentLocationAddress_extraInitializers), __runInitializers(this, _serviceableRadiusKm_initializers, void 0));
        preferredDestinations = (__runInitializers(this, _serviceableRadiusKm_extraInitializers), __runInitializers(this, _preferredDestinations_initializers, void 0));
        constructor() {
            __runInitializers(this, _preferredDestinations_extraInitializers);
        }
    };
})();
export { CreateTruckDto };
//# sourceMappingURL=create-truck.dto.js.map