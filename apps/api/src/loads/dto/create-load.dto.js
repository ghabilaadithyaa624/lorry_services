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
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TruckType } from '@prisma/client';
let CreateLoadDto = (() => {
    let _tonnageRequired_decorators;
    let _tonnageRequired_initializers = [];
    let _tonnageRequired_extraInitializers = [];
    let _loadingAddress_decorators;
    let _loadingAddress_initializers = [];
    let _loadingAddress_extraInitializers = [];
    let _loadingPin_decorators;
    let _loadingPin_initializers = [];
    let _loadingPin_extraInitializers = [];
    let _unloadingAddress_decorators;
    let _unloadingAddress_initializers = [];
    let _unloadingAddress_extraInitializers = [];
    let _unloadingPin_decorators;
    let _unloadingPin_initializers = [];
    let _unloadingPin_extraInitializers = [];
    let _truckType_decorators;
    let _truckType_initializers = [];
    let _truckType_extraInitializers = [];
    let _minLengthFt_decorators;
    let _minLengthFt_initializers = [];
    let _minLengthFt_extraInitializers = [];
    let _minHeightFt_decorators;
    let _minHeightFt_initializers = [];
    let _minHeightFt_extraInitializers = [];
    let _urgent_decorators;
    let _urgent_initializers = [];
    let _urgent_extraInitializers = [];
    let _maxPrice_decorators;
    let _maxPrice_initializers = [];
    let _maxPrice_extraInitializers = [];
    let _expectedDeliveryAt_decorators;
    let _expectedDeliveryAt_initializers = [];
    let _expectedDeliveryAt_extraInitializers = [];
    let _advancePayable_decorators;
    let _advancePayable_initializers = [];
    let _advancePayable_extraInitializers = [];
    return class CreateLoadDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _tonnageRequired_decorators = [ApiProperty({ example: 15.5 }), IsNumber(), Min(0.5), Max(100)];
            _loadingAddress_decorators = [ApiProperty({ example: 'MIDC Industrial Area, Pune' }), IsString()];
            _loadingPin_decorators = [ApiProperty({ example: '411018' }), IsString()];
            _unloadingAddress_decorators = [ApiProperty({ example: 'Electronic City, Bangalore' }), IsString()];
            _unloadingPin_decorators = [ApiProperty({ example: '560100' }), IsString()];
            _truckType_decorators = [ApiProperty({ enum: TruckType }), IsEnum(TruckType)];
            _minLengthFt_decorators = [ApiProperty({ example: 18, required: false }), IsOptional(), IsNumber(), Min(8), Max(60)];
            _minHeightFt_decorators = [ApiProperty({ example: 7, required: false }), IsOptional(), IsNumber(), Min(6), Max(15)];
            _urgent_decorators = [ApiProperty({ example: true, required: false }), IsOptional(), IsBoolean()];
            _maxPrice_decorators = [ApiProperty({ example: 45000, required: false }), IsOptional(), IsNumber(), Min(1000)];
            _expectedDeliveryAt_decorators = [ApiProperty({ example: '2024-12-31T10:00:00Z', required: false }), IsOptional()];
            _advancePayable_decorators = [ApiProperty({ example: 22500, required: false }), IsOptional(), IsNumber(), Min(0)];
            __esDecorate(null, null, _tonnageRequired_decorators, { kind: "field", name: "tonnageRequired", static: false, private: false, access: { has: obj => "tonnageRequired" in obj, get: obj => obj.tonnageRequired, set: (obj, value) => { obj.tonnageRequired = value; } }, metadata: _metadata }, _tonnageRequired_initializers, _tonnageRequired_extraInitializers);
            __esDecorate(null, null, _loadingAddress_decorators, { kind: "field", name: "loadingAddress", static: false, private: false, access: { has: obj => "loadingAddress" in obj, get: obj => obj.loadingAddress, set: (obj, value) => { obj.loadingAddress = value; } }, metadata: _metadata }, _loadingAddress_initializers, _loadingAddress_extraInitializers);
            __esDecorate(null, null, _loadingPin_decorators, { kind: "field", name: "loadingPin", static: false, private: false, access: { has: obj => "loadingPin" in obj, get: obj => obj.loadingPin, set: (obj, value) => { obj.loadingPin = value; } }, metadata: _metadata }, _loadingPin_initializers, _loadingPin_extraInitializers);
            __esDecorate(null, null, _unloadingAddress_decorators, { kind: "field", name: "unloadingAddress", static: false, private: false, access: { has: obj => "unloadingAddress" in obj, get: obj => obj.unloadingAddress, set: (obj, value) => { obj.unloadingAddress = value; } }, metadata: _metadata }, _unloadingAddress_initializers, _unloadingAddress_extraInitializers);
            __esDecorate(null, null, _unloadingPin_decorators, { kind: "field", name: "unloadingPin", static: false, private: false, access: { has: obj => "unloadingPin" in obj, get: obj => obj.unloadingPin, set: (obj, value) => { obj.unloadingPin = value; } }, metadata: _metadata }, _unloadingPin_initializers, _unloadingPin_extraInitializers);
            __esDecorate(null, null, _truckType_decorators, { kind: "field", name: "truckType", static: false, private: false, access: { has: obj => "truckType" in obj, get: obj => obj.truckType, set: (obj, value) => { obj.truckType = value; } }, metadata: _metadata }, _truckType_initializers, _truckType_extraInitializers);
            __esDecorate(null, null, _minLengthFt_decorators, { kind: "field", name: "minLengthFt", static: false, private: false, access: { has: obj => "minLengthFt" in obj, get: obj => obj.minLengthFt, set: (obj, value) => { obj.minLengthFt = value; } }, metadata: _metadata }, _minLengthFt_initializers, _minLengthFt_extraInitializers);
            __esDecorate(null, null, _minHeightFt_decorators, { kind: "field", name: "minHeightFt", static: false, private: false, access: { has: obj => "minHeightFt" in obj, get: obj => obj.minHeightFt, set: (obj, value) => { obj.minHeightFt = value; } }, metadata: _metadata }, _minHeightFt_initializers, _minHeightFt_extraInitializers);
            __esDecorate(null, null, _urgent_decorators, { kind: "field", name: "urgent", static: false, private: false, access: { has: obj => "urgent" in obj, get: obj => obj.urgent, set: (obj, value) => { obj.urgent = value; } }, metadata: _metadata }, _urgent_initializers, _urgent_extraInitializers);
            __esDecorate(null, null, _maxPrice_decorators, { kind: "field", name: "maxPrice", static: false, private: false, access: { has: obj => "maxPrice" in obj, get: obj => obj.maxPrice, set: (obj, value) => { obj.maxPrice = value; } }, metadata: _metadata }, _maxPrice_initializers, _maxPrice_extraInitializers);
            __esDecorate(null, null, _expectedDeliveryAt_decorators, { kind: "field", name: "expectedDeliveryAt", static: false, private: false, access: { has: obj => "expectedDeliveryAt" in obj, get: obj => obj.expectedDeliveryAt, set: (obj, value) => { obj.expectedDeliveryAt = value; } }, metadata: _metadata }, _expectedDeliveryAt_initializers, _expectedDeliveryAt_extraInitializers);
            __esDecorate(null, null, _advancePayable_decorators, { kind: "field", name: "advancePayable", static: false, private: false, access: { has: obj => "advancePayable" in obj, get: obj => obj.advancePayable, set: (obj, value) => { obj.advancePayable = value; } }, metadata: _metadata }, _advancePayable_initializers, _advancePayable_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        tonnageRequired = __runInitializers(this, _tonnageRequired_initializers, void 0);
        loadingAddress = (__runInitializers(this, _tonnageRequired_extraInitializers), __runInitializers(this, _loadingAddress_initializers, void 0));
        loadingPin = (__runInitializers(this, _loadingAddress_extraInitializers), __runInitializers(this, _loadingPin_initializers, void 0));
        unloadingAddress = (__runInitializers(this, _loadingPin_extraInitializers), __runInitializers(this, _unloadingAddress_initializers, void 0));
        unloadingPin = (__runInitializers(this, _unloadingAddress_extraInitializers), __runInitializers(this, _unloadingPin_initializers, void 0));
        truckType = (__runInitializers(this, _unloadingPin_extraInitializers), __runInitializers(this, _truckType_initializers, void 0));
        minLengthFt = (__runInitializers(this, _truckType_extraInitializers), __runInitializers(this, _minLengthFt_initializers, void 0));
        minHeightFt = (__runInitializers(this, _minLengthFt_extraInitializers), __runInitializers(this, _minHeightFt_initializers, void 0));
        urgent = (__runInitializers(this, _minHeightFt_extraInitializers), __runInitializers(this, _urgent_initializers, void 0));
        maxPrice = (__runInitializers(this, _urgent_extraInitializers), __runInitializers(this, _maxPrice_initializers, void 0));
        expectedDeliveryAt = (__runInitializers(this, _maxPrice_extraInitializers), __runInitializers(this, _expectedDeliveryAt_initializers, void 0));
        advancePayable = (__runInitializers(this, _expectedDeliveryAt_extraInitializers), __runInitializers(this, _advancePayable_initializers, void 0));
        constructor() {
            __runInitializers(this, _advancePayable_extraInitializers);
        }
    };
})();
export { CreateLoadDto };
//# sourceMappingURL=create-load.dto.js.map