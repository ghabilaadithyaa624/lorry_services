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
 * Gupshup Service for WhatsApp OTP
 * Uses Meta's Cloud API via Gupshup BSP (Business Service Provider)
 * More reliable than SMS in India, higher open rates
 * Docs: https://www.gupshup.io/developer/docs
 */
let GupshupService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GupshupService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GupshupService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        config;
        logger = new Logger(GupshupService.name);
        baseUrl = 'https://api.gupshup.io/sm/api/v1';
        constructor(config) {
            this.config = config;
        }
        async sendOtp(phone, otp) {
            const appId = this.config.get('GUPSHUP_APP_ID');
            const appToken = this.config.get('GUPSHUP_APP_TOKEN');
            const templateName = 'otp_verification'; // Must be pre-approved template
            if (!appId || !appToken) {
                this.logger.warn('Gupshup credentials not configured, using dev mode');
                return { success: true, message: 'Dev mode - WhatsApp OTP not sent' };
            }
            // Ensure phone has country code
            const to = phone.startsWith('+') ? phone : `+${phone}`;
            try {
                const response = await axios.post(`${this.baseUrl}/template/msg`, {
                    app: appId,
                    sender: '919876543210', // Your Gupshup-approved WhatsApp number
                    phone: to,
                    template: {
                        name: templateName,
                        params: [otp], // {{1}} in template
                    },
                }, {
                    headers: {
                        'apikey': appToken,
                        'Content-Type': 'application/json',
                    },
                });
                this.logger.log(`Gupshup OTP sent to ${to}, response: ${JSON.stringify(response.data)}`);
                return {
                    success: response.data.status === 'success',
                    message: response.data.message || 'WhatsApp OTP sent'
                };
            }
            catch (error) {
                this.logger.error(`Gupshup failed: ${error.message}`, error.response?.data);
                return {
                    success: false,
                    message: error.response?.data?.message || 'Failed to send WhatsApp'
                };
            }
        }
        /**
         * Send rich notification (for booking updates, checkpoint alerts)
         */
        async sendNotification(phone, templateName, params) {
            const appId = this.config.get('GUPSHUP_APP_ID');
            const appToken = this.config.get('GUPSHUP_APP_TOKEN');
            if (!appId || !appToken) {
                return { success: false, message: 'Gupshup not configured' };
            }
            const to = phone.startsWith('+') ? phone : `+${phone}`;
            try {
                const response = await axios.post(`${this.baseUrl}/template/msg`, {
                    app: appId,
                    phone: to,
                    template: {
                        name: templateName,
                        params,
                    },
                }, { headers: { 'apikey': appToken } });
                return {
                    success: response.data.status === 'success',
                    message: 'Notification sent'
                };
            }
            catch (error) {
                this.logger.error(`Gupshup notification failed: ${error.message}`);
                return { success: false, message: 'Failed to send notification' };
            }
        }
        /**
         * Handle incoming webhooks from Gupshup
         */
        async handleWebhook(payload) {
            this.logger.log(`Gupshup webhook: ${JSON.stringify(payload)}`);
            // Handle message delivery status, replies, etc.
            if (payload.type === 'message') {
                // Store delivery receipt
            }
        }
    };
    return GupshupService = _classThis;
})();
export { GupshupService };
//# sourceMappingURL=gupshup.service.js.map