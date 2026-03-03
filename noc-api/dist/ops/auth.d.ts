import type { NextFunction, Request, Response } from 'express';
import type { OpsConfig } from './config.js';
export type DeviceAuthContext = {
    devicePk: string;
    tenantId: string;
    userId: string;
    deviceId: string;
    deviceName: string;
};
export type OpsRequest = Request & {
    opsDevice?: DeviceAuthContext;
};
export declare function requireAdminToken(config: OpsConfig): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireDeviceToken(): (req: OpsRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map