import { and, inArray, isNull, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { deviceBackups, tenantDevices } from '../db/schema.js';
import { buildDedupWindowKey } from './tokenUtils.js';
export class OpsJobRunner {
    r2Service;
    alertService;
    offlineThresholdMinutes;
    retentionDays;
    state;
    offlineTimer = null;
    retentionTimer = null;
    constructor(options) {
        this.r2Service = options.r2Service;
        this.alertService = options.alertService;
        this.offlineThresholdMinutes = options.offlineThresholdMinutes ?? 15;
        this.retentionDays = options.retentionDays ?? 90;
        this.state = {
            startedAtUtc: new Date(),
            lastOfflineScanAtUtc: null,
            lastOfflineCandidates: 0,
            lastRetentionRunAtUtc: null,
            lastRetentionDeletedCount: 0,
            lastError: null,
        };
    }
    start() {
        if (!this.offlineTimer) {
            this.offlineTimer = setInterval(() => {
                void this.scanOfflineDevices();
            }, 5 * 60 * 1000);
        }
        if (!this.retentionTimer) {
            this.retentionTimer = setInterval(() => {
                void this.runRetention();
            }, 6 * 60 * 60 * 1000);
        }
        void this.scanOfflineDevices();
        void this.runRetention();
    }
    stop() {
        if (this.offlineTimer) {
            clearInterval(this.offlineTimer);
            this.offlineTimer = null;
        }
        if (this.retentionTimer) {
            clearInterval(this.retentionTimer);
            this.retentionTimer = null;
        }
    }
    getState() {
        return {
            ...this.state,
        };
    }
    async scanOfflineDevices() {
        try {
            const threshold = new Date(Date.now() - (this.offlineThresholdMinutes * 60 * 1000));
            const rows = await db
                .select({
                devicePk: tenantDevices.id,
                tenantId: tenantDevices.tenantId,
                deviceId: tenantDevices.deviceId,
                deviceName: tenantDevices.deviceName,
                lastSeenAt: tenantDevices.lastSeenAt,
            })
                .from(tenantDevices)
                .where(and(isNull(tenantDevices.revokedAt), lt(tenantDevices.lastSeenAt, threshold)));
            this.state.lastOfflineScanAtUtc = new Date();
            this.state.lastOfflineCandidates = rows.length;
            this.state.lastError = null;
            for (const row of rows) {
                if (!row.lastSeenAt) {
                    continue;
                }
                const dedupKey = buildDedupWindowKey(`offline:${row.deviceId}`, 30);
                await this.alertService.sendAlert({
                    tenantId: row.tenantId,
                    deviceFk: row.devicePk,
                    alertType: 'DEVICE_OFFLINE',
                    dedupKey,
                    payload: {
                        deviceId: row.deviceId,
                        deviceName: row.deviceName ?? '',
                        lastSeenAtUtc: row.lastSeenAt.toISOString(),
                        thresholdMinutes: this.offlineThresholdMinutes,
                    },
                });
            }
        }
        catch (error) {
            this.state.lastError = error instanceof Error ? error.message : 'offline_scan_error';
            console.error('scanOfflineDevices error:', error);
        }
    }
    async runRetention() {
        try {
            const cutoff = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));
            const oldBackups = await db
                .select({
                id: deviceBackups.id,
                objectKey: deviceBackups.objectKey,
            })
                .from(deviceBackups)
                .where(lt(deviceBackups.createdAt, cutoff));
            let deletedCount = 0;
            for (const backup of oldBackups) {
                if (backup.objectKey && this.r2Service.isConfigured) {
                    try {
                        await this.r2Service.deleteObject(backup.objectKey);
                    }
                    catch (error) {
                        console.warn('R2 delete warning:', error);
                    }
                }
            }
            const ids = oldBackups.map(backup => backup.id);
            if (ids.length > 0) {
                await db.delete(deviceBackups).where(inArray(deviceBackups.id, ids));
                deletedCount = ids.length;
            }
            this.state.lastRetentionRunAtUtc = new Date();
            this.state.lastRetentionDeletedCount = deletedCount;
            this.state.lastError = null;
        }
        catch (error) {
            this.state.lastRetentionRunAtUtc = new Date();
            this.state.lastError = error instanceof Error ? error.message : 'retention_error';
            console.error('runRetention error:', error);
        }
    }
}
//# sourceMappingURL=jobs.js.map