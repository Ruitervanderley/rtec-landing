import type { OpsConfig } from './config.js';
import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type SignedUpload = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

export class R2Service {
  private readonly bucket: string;
  private readonly client: S3Client | null;

  public constructor(config: OpsConfig) {
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

  public get isConfigured(): boolean {
    return this.client !== null;
  }

  public async createSignedUpload(objectKey: string): Promise<SignedUpload> {
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

  public async deleteObject(objectKey: string): Promise<void> {
    if (!this.client) {
      throw new Error('R2_NOT_CONFIGURED');
    }

    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    }));
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string }> {
    if (!this.client) {
      return { ok: false, message: 'R2 not configured' };
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true, message: 'ok' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      return { ok: false, message };
    }
  }
}
