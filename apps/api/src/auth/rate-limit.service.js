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
 * Rate limiting for OTP requests
 * - 1 request per minute per phone
 * - 5 requests per hour per phone
 * - 20 requests per hour per IP
 */
let RateLimitService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var RateLimitService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            RateLimitService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        redis;
        constructor(redis) {
            this.redis = redis;
        }
        async checkOtpRateLimit(phone, ip) {
            const phoneKey = `otp:phone:${phone}`;
            const ipKey = `otp:ip:${ip}`;
            const now = Date.now();
            // Check phone rate limit (1 per minute)
            const lastRequest = await this.redis.get(phoneKey);
            if (lastRequest) {
                const timeSinceLast = now - parseInt(lastRequest);
                if (timeSinceLast < 60000) { // 1 minute
                    const waitSeconds = Math.ceil((60000 - timeSinceLast) / 1000);
                    return {
                        allowed: false,
                        message: `Please wait ${waitSeconds} seconds before requesting another OTP`
                    };
                }
            }
            // Check phone hourly limit (5 per hour)
            const phoneHourKey = `otp:phone:hour:${phone}`;
            const phoneHourCount = await this.redis.incr(phoneHourKey);
            if (phoneHourCount === 1) {
                await this.redis.pexpire(phoneHourKey, 3600000); // 1 hour
            }
            if (phoneHourCount > 5) {
                return {
                    allowed: false,
                    message: 'Too many OTP requests. Please try again after 1 hour.'
                };
            }
            // Check IP hourly limit (20 per hour)
            const ipHourCount = await this.redis.incr(ipKey);
            if (ipHourCount === 1) {
                await this.redis.pexpire(ipKey, 3600000);
            }
            if (ipHourCount > 20) {
                return {
                    allowed: false,
                    message: 'Too many requests from this device. Please try again later.'
                };
            }
            // Set last request time
            await this.redis.set(phoneKey, now.toString(), 'PX', 60000);
            return { allowed: true };
        }
        async clearRateLimit(phone) {
            await this.redis.del(`otp:phone:${phone}`);
            await this.redis.del(`otp:phone:hour:${phone}`);
        }
    };
    return RateLimitService = _classThis;
})();
export { RateLimitService };
//# sourceMappingURL=rate-limit.service.js.map