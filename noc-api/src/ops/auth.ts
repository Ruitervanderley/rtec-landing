import type { NextFunction, Request, Response } from 'express';
import type { OpsConfig } from './config.js';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { deviceApiTokens, tenantDevices } from '../db/schema.js';
import { getProfileAccessInfo, getSupabaseIdentity, isAccessAllowed } from './supabaseIdentity.js';
import { hashOpaqueToken } from './tokenUtils.js';

export type DeviceAuthContext = {
  devicePk: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
};

export type OpsRequest = Request & {
  opsDevice?: DeviceAuthContext;
  portalUser?: PortalUserContext;
};

export type PortalUserContext = {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  tenantName: string;
  tenantPortalSlug: string;
  tenantLogoUrl: string | null;
  tenantValidUntil: string | null;
  userValidUntil: string | null;
};

function parseBearerToken(req: Request): string | null {
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

export function requireAdminToken(config: OpsConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

export function requirePortalUser(config: OpsConfig) {
  return async (req: OpsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accessToken = parseBearerToken(req);
      if (!accessToken) {
        res.status(401).json({ error: 'MISSING_SUPABASE_TOKEN' });
        return;
      }

      const identity = await getSupabaseIdentity(accessToken, config);
      if (!identity) {
        res.status(401).json({ error: 'INVALID_SUPABASE_TOKEN' });
        return;
      }

      const profile = await getProfileAccessInfo(identity.userId);
      if (!profile) {
        res.status(403).json({ error: 'PROFILE_NOT_FOUND' });
        return;
      }

      const access = isAccessAllowed(profile);
      if (!access.canAccess) {
        res.status(403).json({ error: access.reason });
        return;
      }

      req.portalUser = {
        userId: profile.userId,
        tenantId: profile.tenantId,
        email: profile.email,
        displayName: profile.displayName,
        isAdmin: profile.isAdmin,
        tenantName: profile.tenantName,
        tenantPortalSlug: profile.tenantPortalSlug,
        tenantLogoUrl: profile.tenantLogoUrl,
        tenantValidUntil: profile.tenantValidUntil,
        userValidUntil: profile.userValidUntil,
      };

      next();
    } catch (error) {
      console.error('requirePortalUser error:', error);
      res.status(500).json({ error: 'PORTAL_AUTH_ERROR' });
    }
  };
}

export function requireDeviceToken() {
  return async (req: OpsRequest, res: Response, next: NextFunction): Promise<void> => {
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
        .where(
          and(
            eq(deviceApiTokens.tokenHash, tokenHash),
            isNull(deviceApiTokens.revokedAt),
            gt(deviceApiTokens.expiresAt, new Date()),
            isNull(tenantDevices.revokedAt),
          ),
        )
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
    } catch (error) {
      console.error('requireDeviceToken error:', error);
      res.status(500).json({ error: 'DEVICE_AUTH_ERROR' });
    }
  };
}
