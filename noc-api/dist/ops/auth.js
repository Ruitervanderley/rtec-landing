import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { deviceApiTokens, tenantDevices } from '../db/schema.js';
import { hashOpaqueToken } from './tokenUtils.js';
function parseBearerToken(req) {
    const auth = req.header('authorization') ?? req.header('Authorization');
    if (!auth) {
        return null;
    }
    const [type, token] = auth.split(' ');
    if (!type || !token || type.toLowerCase() !== 'bearer') {
        return null;
    }
    return token.trim();
}
export function requireAdminToken(config) {
    return (req, res, next) => {
        if (!config.adminServiceToken) {
            res.status(503).json({ error: 'OPS_ADMIN_TOKEN_NOT_CONFIGURED' });
            return;
        }
        const bearer = parseBearerToken(req);
        if (!bearer || bearer !== config.adminServiceToken) {
            res.status(401).json({ error: 'UNAUTHORIZED_ADMIN' });
            return;
        }
        next();
    };
}
export function requireDeviceToken() {
    return async (req, res, next) => {
        try {
            const token = parseBearerToken(req);
            if (!token) {
                res.status(401).json({ error: 'MISSING_DEVICE_TOKEN' });
                return;
            }
            const tokenHash = hashOpaqueToken(token);
            const rows = await db
                .select({
                devicePk: tenantDevices.id,
                tenantId: tenantDevices.tenantId,
                userId: tenantDevices.userId,
                deviceId: tenantDevices.deviceId,
                deviceName: tenantDevices.deviceName,
            })
                .from(deviceApiTokens)
                .innerJoin(tenantDevices, eq(deviceApiTokens.deviceFk, tenantDevices.id))
                .where(and(eq(deviceApiTokens.tokenHash, tokenHash), isNull(deviceApiTokens.revokedAt), gt(deviceApiTokens.expiresAt, new Date()), isNull(tenantDevices.revokedAt)))
                .limit(1);
            const row = rows[0];
            if (!row) {
                res.status(401).json({ error: 'INVALID_DEVICE_TOKEN' });
                return;
            }
            req.opsDevice = {
                devicePk: row.devicePk,
                tenantId: row.tenantId,
                userId: row.userId,
                deviceId: row.deviceId,
                deviceName: row.deviceName ?? '',
            };
            next();
        }
        catch (error) {
            console.error('requireDeviceToken error:', error);
            res.status(500).json({ error: 'DEVICE_AUTH_ERROR' });
        }
    };
}
//# sourceMappingURL=auth.js.map