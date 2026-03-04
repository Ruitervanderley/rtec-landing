import type { OpsAlertService } from '../ops/alerts.js';
import type { OpsConfig } from '../ops/config.js';
import type { OpsJobRunner } from '../ops/jobs.js';
import type { R2Service } from '../ops/r2Service.js';
import { Router } from 'express';
export declare function createOpsV1Router(options: {
    config: OpsConfig;
    r2Service: R2Service;
    alertService: OpsAlertService;
    jobRunner: OpsJobRunner;
}): Router;
export declare function getOpsHealth(options: {
    config: OpsConfig;
    r2Service: R2Service;
    jobRunner: OpsJobRunner;
}): Promise<Record<string, unknown>>;
//# sourceMappingURL=opsV1.d.ts.map