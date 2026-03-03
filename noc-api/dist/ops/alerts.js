import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { opsAlerts } from '../db/schema.js';
export class OpsAlertService {
    config;
    _lastAlertAtUtc = null;
    constructor(config) {
        this.config = config;
    }
    get lastAlertAtUtc() {
        return this._lastAlertAtUtc;
    }
    async sendAlert(options) {
        const recent = await db
            .select({ id: opsAlerts.id })
            .from(opsAlerts)
            .where(and(eq(opsAlerts.dedupKey, options.dedupKey), gt(opsAlerts.createdAt, sql `now() - interval '30 minutes'`)))
            .orderBy(desc(opsAlerts.createdAt))
            .limit(1);
        if (recent.length > 0) {
            return { delivered: false, reason: 'DEDUP_SKIPPED' };
        }
        const message = this.formatMessage(options.alertType, options.payload);
        if (!this.config.telegramBotToken || !this.config.telegramChatId) {
            await db.insert(opsAlerts).values({
                tenantId: options.tenantId,
                deviceFk: options.deviceFk,
                alertType: options.alertType,
                payload: options.payload,
                dedupKey: options.dedupKey,
                delivered: false,
            });
            return { delivered: false, reason: 'TELEGRAM_NOT_CONFIGURED' };
        }
        let delivered = false;
        try {
            const response = await fetch(`https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.config.telegramChatId,
                    text: message,
                    disable_web_page_preview: true,
                }),
            });
            delivered = response.ok;
        }
        catch {
            delivered = false;
        }
        const now = new Date();
        await db.insert(opsAlerts).values({
            tenantId: options.tenantId,
            deviceFk: options.deviceFk,
            alertType: options.alertType,
            payload: options.payload,
            dedupKey: options.dedupKey,
            delivered,
            sentAt: delivered ? now : null,
        });
        if (delivered) {
            this._lastAlertAtUtc = now;
            return { delivered: true, reason: 'SENT' };
        }
        return { delivered: false, reason: 'TELEGRAM_ERROR' };
    }
    formatMessage(alertType, payload) {
        const lines = [
            `LegislativoTimer OPS - ${alertType}`,
            `When: ${new Date().toISOString()}`,
        ];
        Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            lines.push(`${key}: ${String(value)}`);
        });
        return lines.join('\n');
    }
}
//# sourceMappingURL=alerts.js.map