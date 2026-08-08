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
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
/**
 * S3/Minio Service for document storage
 * Supports AWS S3 in production, Minio for local dev
 */
let S3Service = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var S3Service = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            S3Service = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        config;
        logger = new Logger(S3Service.name);
        s3Client;
        bucket;
        constructor(config) {
            this.config = config;
            this.bucket = config.get('AWS_S3_BUCKET', 'lorrycarry-kyc');
            this.s3Client = new S3Client({
                region: config.get('AWS_REGION', 'ap-south-1'),
                endpoint: config.get('AWS_S3_ENDPOINT'), // For Minio
                credentials: {
                    accessKeyId: config.get('AWS_ACCESS_KEY_ID', ''),
                    secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', ''),
                },
                forcePathStyle: config.get('AWS_S3_FORCE_PATH_STYLE') === 'true', // For Minio
            });
        }
        /**
         * Upload file to S3
         */
        async uploadFile(file, mimeType, folder, userId) {
            const key = `${folder}/${userId}/${uuidv4()}`;
            try {
                await this.s3Client.send(new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: file,
                    ContentType: mimeType,
                    Metadata: {
                        'x-amz-meta-userid': userId,
                        'x-amz-meta-uploadedat': new Date().toISOString(),
                    },
                }));
                const signedUrl = await this.getSignedUrl(key);
                return {
                    key,
                    url: `${this.config.get('AWS_S3_ENDPOINT') || 'https://s3.amazonaws.com'}/${this.bucket}/${key}`,
                    signedUrl,
                };
            }
            catch (error) {
                this.logger.error(`Upload failed: ${error.message}`);
                throw new Error('File upload failed');
            }
        }
        /**
         * Generate signed URL for file access (valid for 1 hour)
         */
        async getSignedUrl(key, expiresIn = 3600) {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            return getSignedUrl(this.s3Client, command, { expiresIn });
        }
        /**
         * Validate file before upload
         */
        validateFile(file, allowedTypes, maxSizeMB = 5) {
            // Check file size
            const maxSizeBytes = maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
                return { valid: false, error: `File too large. Max size: ${maxSizeMB}MB` };
            }
            // Check mime type
            if (!allowedTypes.includes(file.mimetype)) {
                return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
            }
            return { valid: true };
        }
    };
    return S3Service = _classThis;
})();
export { S3Service };
//# sourceMappingURL=s3.service.js.map