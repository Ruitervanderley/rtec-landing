import { OpsAlertService } from './alerts.js';
import { R2Service } from './r2Service.js';
export type OpsRuntimeState = {
    startedAtUtc: Date;
    lastOfflineScanAtUtc: Date | null;
    lastOfflineCandidates: number;
    lastRetentionRunAtUtc: Date | null;
    lastRetentionDeletedCount: number;
    lastError: string | null;
};
export declare class OpsJobRunner {
    private readonly r2Service;
    private readonly alertService;
    private readonly offlineThresholdMinutes;
    private readonly retentionDays;
    private readonly state;
    private offlineTimer;
    private retentionTimer;
    constructor(options: {
        r2Service: R2Service;
        alertService: OpsAlertService;
        offlineThresholdMinutes?: number;
        retentionDays?: number;
    });
    start(): void;
    stop(): void;
    getState(): OpsRuntimeState;
    private scanOfflineDevices;
    private runRetention;
}
//# sourceMappingURL=jobs.d.ts.map