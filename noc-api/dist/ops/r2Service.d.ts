import type { OpsConfig } from './config.js';
export type SignedUpload = {
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
};
export declare class R2Service {
    private readonly bucket;
    private readonly client;
    constructor(config: OpsConfig);
    get isConfigured(): boolean;
    createSignedUpload(objectKey: string): Promise<SignedUpload>;
    deleteObject(objectKey: string): Promise<void>;
    checkHealth(): Promise<{
        ok: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=r2Service.d.ts.map