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
/**
 * Secure OTP storage in Redis
 * - OTP expires in 10 minutes
 * - Max 3 verification attempts
 * - Auto-cleanup on success/failure
 */
let OtpStorageService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var OtpStorageService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            OtpStorageService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        redis;
        OTP_TTL = 600; // 10 minutes
        MAX_ATTEMPTS = 3;
        constructor(redis) {
            this.redis = redis;
        }
        async storeOtp(phone, otp) {
            const data = {
                otp,
                attempts: 0,
                createdAt: Date.now(),
            };
            await this.redis.set(`otp:data:${phone}`, JSON.stringify(data), 'EX', this.OTP_TTL);
        }
        async getOtp(phone) {
            const data = await this.redis.get(`otp:data:${phone}`);
            return data ? JSON.parse(data) : null;
        }
        async incrementAttempts(phone) {
            const data = await this.getOtp(phone);
            if (!data)
                return 0;
            data.attempts += 1;
            await this.redis.set(`otp:data:${phone}`, JSON.stringify(data), 'EX', this.OTP_TTL);
            return data.attempts;
        }
        async verifyOtp(phone, inputOtp) {
            const data = await this.getOtp(phone);
            if (!data) {
                return { valid: false, message: 'OTP expired. Please request a new one.' };
            }
            if (data.attempts >= this.MAX_ATTEMPTS) {
                await this.deleteOtp(phone);
                return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
            }
            if (data.otp !== inputOtp) {
                const attempts = await this.incrementAttempts(phone);
                const remaining = this.MAX_ATTEMPTS - attempts;
                return {
                    valid: false,
                    message: `Invalid OTP. ${remaining} attempts remaining.`
                };
            }
            // Success - delete OTP
            await this.deleteOtp(phone);
            return { valid: true, message: 'OTP verified successfully' };
        }
        async deleteOtp(phone) {
            await this.redis.del(`otp:data:${phone}`);
        }
    };
    return OtpStorageService = _classThis;
})();
export { OtpStorageService };
//# sourceMappingURL=otp-storage.service.js.map