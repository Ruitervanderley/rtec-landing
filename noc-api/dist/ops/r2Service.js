import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export class R2Service {
    bucket;
    client;
    constructor(config) {
        this.bucket = config.r2Bucket;
        if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2SecretAccessKey || !config.r2Bucket) {
            this.client = null;
            return;
        }
        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.r2AccessKeyId,
                secretAccessKey: config.r2SecretAccessKey,
            },
        });
    }
    get isConfigured() {
        return this.client !== null;
    }
    async createSignedUpload(objectKey) {
        if (!this.client) {
            throw new Error('R2_NOT_CONFIGURED');
        }
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            ContentType: 'application/zip',
        });
        const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });
        return {
            uploadUrl,
            requiredHeaders: {
                'Content-Type': 'application/zip',
            },
        };
    }
    async deleteObject(objectKey) {
        if (!this.client) {
            throw new Error('R2_NOT_CONFIGURED');
        }
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
        }));
    }
    async checkHealth() {
        if (!this.client) {
            return { ok: false, message: 'R2 not configured' };
        }
        try {
            await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
            return { ok: true, message: 'ok' };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            return { ok: false, message };
        }
    }
}
//# sourceMappingURL=r2Service.js.map