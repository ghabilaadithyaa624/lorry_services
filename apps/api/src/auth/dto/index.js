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
import { IsString, IsEnum, IsOptional } from 'class-validator';
export var OtpChannel;
(function (OtpChannel) {
    OtpChannel["SMS"] = "sms";
    OtpChannel["WHATSAPP"] = "whatsapp";
})(OtpChannel || (OtpChannel = {}));
export var UserRole;
(function (UserRole) {
    UserRole["LOAD_OWNER"] = "load_owner";
    UserRole["TRUCK_OWNER"] = "truck_owner";
})(UserRole || (UserRole = {}));
let RequestOtpDto = (() => {
    let _phone_decorators;
    let _phone_initializers = [];
    let _phone_extraInitializers = [];
    let _channel_decorators;
    let _channel_initializers = [];
    let _channel_extraInitializers = [];
    return class RequestOtpDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _phone_decorators = [IsString()];
            _channel_decorators = [IsEnum(OtpChannel), IsOptional()];
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: obj => "phone" in obj, get: obj => obj.phone, set: (obj, value) => { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _channel_decorators, { kind: "field", name: "channel", static: false, private: false, access: { has: obj => "channel" in obj, get: obj => obj.channel, set: (obj, value) => { obj.channel = value; } }, metadata: _metadata }, _channel_initializers, _channel_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        phone = __runInitializers(this, _phone_initializers, void 0); // Format: +919876543210
        channel = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _channel_initializers, OtpChannel.SMS));
        constructor() {
            __runInitializers(this, _channel_extraInitializers);
        }
    };
})();
export { RequestOtpDto };
let VerifyOtpDto = (() => {
    let _phone_decorators;
    let _phone_initializers = [];
    let _phone_extraInitializers = [];
    let _otp_decorators;
    let _otp_initializers = [];
    let _otp_extraInitializers = [];
    let _role_decorators;
    let _role_initializers = [];
    let _role_extraInitializers = [];
    return class VerifyOtpDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _phone_decorators = [IsString()];
            _otp_decorators = [IsString()];
            _role_decorators = [IsEnum(UserRole), IsOptional()];
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: obj => "phone" in obj, get: obj => obj.phone, set: (obj, value) => { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _otp_decorators, { kind: "field", name: "otp", static: false, private: false, access: { has: obj => "otp" in obj, get: obj => obj.otp, set: (obj, value) => { obj.otp = value; } }, metadata: _metadata }, _otp_initializers, _otp_extraInitializers);
            __esDecorate(null, null, _role_decorators, { kind: "field", name: "role", static: false, private: false, access: { has: obj => "role" in obj, get: obj => obj.role, set: (obj, value) => { obj.role = value; } }, metadata: _metadata }, _role_initializers, _role_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        phone = __runInitializers(this, _phone_initializers, void 0);
        otp = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _otp_initializers, void 0));
        role = (__runInitializers(this, _otp_extraInitializers), __runInitializers(this, _role_initializers, void 0)); // Required only for new users
        constructor() {
            __runInitializers(this, _role_extraInitializers);
        }
    };
})();
export { VerifyOtpDto };
//# sourceMappingURL=index.js.map