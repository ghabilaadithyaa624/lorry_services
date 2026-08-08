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
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@lorrycarry/database';
let AuthService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AuthService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        jwtService;
        configService;
        msg91Service;
        gupshupService;
        rateLimitService;
        otpStorageService;
        constructor(jwtService, configService, msg91Service, gupshupService, rateLimitService, otpStorageService) {
            this.jwtService = jwtService;
            this.configService = configService;
            this.msg91Service = msg91Service;
            this.gupshupService = gupshupService;
            this.rateLimitService = rateLimitService;
            this.otpStorageService = otpStorageService;
        }
        async requestOtp(phone, channel = 'sms', ip = '127.0.0.1') {
            const rateCheck = await this.rateLimitService.checkOtpRateLimit(phone, ip);
            if (!rateCheck.allowed) {
                throw new UnauthorizedException(rateCheck.message || 'Rate limit exceeded');
            }
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await this.otpStorageService.storeOtp(phone, otp);
            console.log(`📱 OTP for ${phone}: ${otp} (via ${channel})`);
            if (channel === 'whatsapp') {
                await this.gupshupService.sendOtp(phone, otp);
            }
            else if (channel === 'sms') {
                await this.msg91Service.sendOtp(phone, otp);
            }
            return {
                success: true,
                message: `OTP sent via ${channel}`,
                // In dev only:
                devOtp: otp,
            };
        }
        async verifyOtp(phone, otp, role) {
            const verification = await this.otpStorageService.verifyOtp(phone, otp);
            if (!verification.valid) {
                throw new UnauthorizedException(verification.message);
            }
            // Find or create user
            let user = await prisma.user.findUnique({ where: { phone } });
            if (!user) {
                if (!role) {
                    throw new UnauthorizedException('Role required for new user');
                }
                user = await prisma.user.create({
                    data: { phone, role },
                });
            }
            const payload = { sub: user.id, phone: user.phone, role: user.role };
            const accessToken = this.jwtService.sign(payload);
            const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
            return {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                },
            };
        }
        async refreshToken(refreshToken) {
            try {
                const payload = this.jwtService.verify(refreshToken);
                const newAccessToken = this.jwtService.sign({
                    sub: payload.sub,
                    phone: payload.phone,
                    role: payload.role,
                });
                return { accessToken: newAccessToken };
            }
            catch {
                throw new UnauthorizedException('Invalid refresh token');
            }
        }
    };
    return AuthService = _classThis;
})();
export { AuthService };
//# sourceMappingURL=auth.service.js.map