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
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
/**
 * MSG91 Service for SMS OTP
 * DLT-compliant for India (required for commercial SMS)
 * Docs: https://docs.msg91.com/
 */
let Msg91Service = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Msg91Service = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Msg91Service = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        config;
        logger = new Logger(Msg91Service.name);
        baseUrl = 'https://api.msg91.com/api/v5';
        constructor(config) {
            this.config = config;
        }
        async sendOtp(phone, otp) {
            const authKey = this.config.get('MSG91_API_KEY');
            const senderId = this.config.get('MSG91_SENDER_ID', 'LORRYC');
            const templateId = this.config.get('MSG91_TEMPLATE_ID');
            if (!authKey) {
                this.logger.warn('MSG91_API_KEY not configured, using dev mode');
                return { success: true, message: 'Dev mode - OTP not sent' };
            }
            // Remove +91 if present for MSG91
            const mobile = phone.replace(/^\+91/, '');
            try {
                const response = await axios.post(`${this.baseUrl}/otp`, {
                    mobile,
                    otp,
                    sender: senderId,
                    template_id: templateId,
                    otp_length: 6,
                    otp_expiry: 600, // 10 minutes
                }, {
                    headers: {
                        'authkey': authKey,
                        'Content-Type': 'application/json',
                    },
                });
                this.logger.log(`MSG91 OTP sent to ${phone}, response: ${JSON.stringify(response.data)}`);
                return {
                    success: response.data.type === 'success',
                    message: response.data.message || 'OTP sent successfully'
                };
            }
            catch (error) {
                this.logger.error(`MSG91 failed: ${error.message}`, error.response?.data);
                return {
                    success: false,
                    message: error.response?.data?.message || 'Failed to send SMS'
                };
            }
        }
        async resendOtp(phone, retryType = 'text') {
            const authKey = this.config.get('MSG91_API_KEY');
            const mobile = phone.replace(/^\+91/, '');
            if (!authKey) {
                return { success: false, message: 'MSG91 not configured' };
            }
            try {
                const response = await axios.post(`${this.baseUrl}/otp/retry`, { mobile, retrytype: retryType }, { headers: { 'authkey': authKey } });
                return {
                    success: response.data.type === 'success',
                    message: response.data.message
                };
            }
            catch (error) {
                this.logger.error(`MSG91 resend failed: ${error.message}`);
                return { success: false, message: error.response?.data?.message || 'Resend failed' };
            }
        }
        async verifyOtp(phone, otp) {
            const authKey = this.config.get('MSG91_API_KEY');
            const mobile = phone.replace(/^\+91/, '');
            if (!authKey) {
                // Dev mode: skip verification
                return { success: true, message: 'Dev mode - verification skipped' };
            }
            try {
                const response = await axios.post(`${this.baseUrl}/otp/verify`, { mobile, otp }, { headers: { 'authkey': authKey } });
                return {
                    success: response.data.type === 'success',
                    message: response.data.message
                };
            }
            catch (error) {
                this.logger.error(`MSG91 verify failed: ${error.message}`);
                return { success: false, message: 'Invalid OTP' };
            }
        }
    };
    return Msg91Service = _classThis;
})();
export { Msg91Service };
//# sourceMappingURL=msg91.service.js.map