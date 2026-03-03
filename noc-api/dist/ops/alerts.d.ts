import type { OpsConfig } from './config.js';
export type AlertPayload = Record<string, unknown>;
export type AlertDispatchResult = {
    delivered: boolean;
    reason: string;
};
export declare class OpsAlertService {
    private readonly config;
    private _lastAlertAtUtc;
    constructor(config: OpsConfig);
    get lastAlertAtUtc(): Date | null;
    sendAlert(options: {
        tenantId: string;
        deviceFk?: string;
        alertType: string;
        payload: AlertPayload;
        dedupKey: string;
    }): Promise<AlertDispatchResult>;
    private formatMessage;
}
//# sourceMappingURL=alerts.d.ts.map