import type { Request, Response } from 'express';
import type { OpsAlertService } from '../ops/alerts.js';
import type { OpsRequest } from '../ops/auth.js';
import type { OpsConfig } from '../ops/config.js';
import type { OpsJobRunner } from '../ops/jobs.js';
import type { R2Service } from '../ops/r2Service.js';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import {
  deviceApiTokens,
  deviceBackups,
  deviceHeartbeats,
  tenantDevices,
} from '../db/schema.js';
import { requireAdminToken, requireDeviceToken } from '../ops/auth.js';
import { isR2Configured } from '../ops/config.js';
import {
  getProfileAccessInfo,
  getSupabaseIdentity,
  isAccessAllowed,
} from '../ops/supabaseIdentity.js';
import {
  DEVICE_TOKEN_TTL_DAYS,
  generateOpaqueToken,
  hashOpaqueToken,
  nowPlusDays,
  sanitizeObjectPathSegment,
} from '../ops/tokenUtils.js';

const VALID_BACKUP_TYPES = new Set(['POST_SESSION', 'DAILY']);

class InMemoryRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  public consume(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (existing.count >= limit) {
      return false;
    }

    existing.count += 1;
    return true;
  }
}

const rateLimiter = new InMemoryRateLimiter();

function parseBearerToken(req: Request): string | null {
  const auth = req.header('authorization') ?? req.header('Authorization');
  if (!auth) {
    return null;
  }

  const [prefix, token] = auth.split(' ');
  if (!prefix || !token || prefix.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
}

function parseBackupStatus(success: unknown): 'UPLOADED' | 'FAILED' {
  if (typeof success === 'boolean') {
    return success ? 'UPLOADED' : 'FAILED';
  }
  return 'FAILED';
}

function ensureRateLimit(key: string, limit: number, windowMs: number, res: Response): boolean {
  const allowed = rateLimiter.consume(key, limit, windowMs);
  if (!allowed) {
    res.status(429).json({ error: 'RATE_LIMITED' });
    return false;
  }
  return true;
}

export function createOpsV1Router(options: {
  config: OpsConfig;
  r2Service: R2Service;
  alertService: OpsAlertService;
  jobRunner: OpsJobRunner;
}): Router {
  const router = Router();

  router.post('/device/provision', async (req: Request, res: Response) => {
    if (!ensureRateLimit(`provision:${req.ip}`, 30, 60_000, res)) {
      return;
    }

    try {
      const accessToken = parseBearerToken(req);
      if (!accessToken) {
        res.status(401).json({ error: 'MISSING_SUPABASE_TOKEN' });
        return;
      }

      const { deviceId, deviceName, appVersion } = req.body as {
        deviceId?: string;
        deviceName?: string;
        appVersion?: string;
      };

      if (!deviceId || typeof deviceId !== 'string') {
        res.status(400).json({ error: 'deviceId is required' });
        return;
      }

      const identity = await getSupabaseIdentity(accessToken, options.config);
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

      const normalizedDeviceId = deviceId.trim();
      const normalizedDeviceName = typeof deviceName === 'string' ? deviceName.trim() : '';
      const normalizedVersion = typeof appVersion === 'string' ? appVersion.trim() : '';

      const existingDevice = await db
        .select({ id: tenantDevices.id })
        .from(tenantDevices)
        .where(eq(tenantDevices.deviceId, normalizedDeviceId))
        .limit(1);

      let devicePk = '';

      if (existingDevice.length > 0) {
        devicePk = existingDevice[0]!.id;
        await db
          .update(tenantDevices)
          .set({
            tenantId: profile.tenantId,
            userId: identity.userId,
            deviceName: normalizedDeviceName,
            appVersion: normalizedVersion,
            updatedAt: new Date(),
            revokedAt: null,
          })
          .where(eq(tenantDevices.id, devicePk));
      } else {
        const inserted = await db
          .insert(tenantDevices)
          .values({
            tenantId: profile.tenantId,
            userId: identity.userId,
            deviceId: normalizedDeviceId,
            deviceName: normalizedDeviceName,
            appVersion: normalizedVersion,
          })
          .returning({ id: tenantDevices.id });
        devicePk = inserted[0]!.id;
      }

      await db
        .update(deviceApiTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(deviceApiTokens.deviceFk, devicePk),
            isNull(deviceApiTokens.revokedAt),
          ),
        );

      const token = generateOpaqueToken('ltdev');
      const tokenHash = hashOpaqueToken(token);
      const expiresAt = nowPlusDays(DEVICE_TOKEN_TTL_DAYS);

      await db.insert(deviceApiTokens).values({
        deviceFk: devicePk,
        tokenHash,
        expiresAt,
      });

      res.json({
        deviceToken: token,
        expiresAtUtc: expiresAt.toISOString(),
        tenantId: profile.tenantId,
        devicePk,
      });
    } catch (error) {
      console.error('POST /v1/device/provision error:', error);
      res.status(500).json({ error: 'PROVISION_ERROR' });
    }
  });

  router.post('/device/heartbeat', requireDeviceToken(), async (req: OpsRequest, res: Response) => {
    if (!ensureRateLimit(`hb:${req.opsDevice?.deviceId ?? req.ip}`, 120, 60_000, res)) {
      return;
    }

    if (!req.opsDevice) {
      res.status(401).json({ error: 'UNAUTHORIZED_DEVICE' });
      return;
    }

    try {
      const { appVersion, status, currentSessionGuid, lastSyncUsersAtUtc, lastKeepAliveAtUtc } = req.body as {
        appVersion?: string;
        status?: string;
        currentSessionGuid?: string;
        lastSyncUsersAtUtc?: string;
        lastKeepAliveAtUtc?: string;
      };

      if (!status || typeof status !== 'string') {
        res.status(400).json({ error: 'status is required' });
        return;
      }

      const meta: Record<string, unknown> = {
        currentSessionGuid: currentSessionGuid ?? null,
        lastSyncUsersAtUtc: lastSyncUsersAtUtc ?? null,
        lastKeepAliveAtUtc: lastKeepAliveAtUtc ?? null,
      };

      const normalizedVersion = typeof appVersion === 'string' ? appVersion.trim() : '';

      await db.insert(deviceHeartbeats).values({
        deviceFk: req.opsDevice.devicePk,
        status: status.trim(),
        sessionGuid: typeof currentSessionGuid === 'string' ? currentSessionGuid.trim() : null,
        appVersion: normalizedVersion,
        meta,
      });

      await db
        .update(tenantDevices)
        .set({
          lastSeenAt: new Date(),
          lastStatus: status.trim(),
          appVersion: normalizedVersion,
          updatedAt: new Date(),
        })
        .where(eq(tenantDevices.id, req.opsDevice.devicePk));

      res.json({ ok: true, serverTimeUtc: new Date().toISOString() });
    } catch (error) {
      console.error('POST /v1/device/heartbeat error:', error);
      res.status(500).json({ error: 'HEARTBEAT_ERROR' });
    }
  });

  router.post('/backups/request-upload', requireDeviceToken(), async (req: OpsRequest, res: Response) => {
    if (!req.opsDevice) {
      res.status(401).json({ error: 'UNAUTHORIZED_DEVICE' });
      return;
    }

    if (!ensureRateLimit(`backup-request:${req.opsDevice.deviceId}`, 20, 60_000, res)) {
      return;
    }

    if (!isR2Configured(options.config)) {
      res.status(503).json({ error: 'R2_NOT_CONFIGURED' });
      return;
    }

    try {
      const { backupType, sessionGuid, fileName, sizeBytes, sha256 } = req.body as {
        backupType?: string;
        sessionGuid?: string;
        fileName?: string;
        sizeBytes?: number;
        sha256?: string;
      };

      if (!backupType || !VALID_BACKUP_TYPES.has(backupType)) {
        res.status(400).json({ error: 'backupType must be POST_SESSION or DAILY' });
        return;
      }

      if (!fileName || typeof fileName !== 'string') {
        res.status(400).json({ error: 'fileName is required' });
        return;
      }

      const size = typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) ? Math.trunc(sizeBytes) : 0;
      if (size <= 0) {
        res.status(400).json({ error: 'sizeBytes must be > 0' });
        return;
      }

      const backupId = crypto.randomUUID();
      const today = new Date().toISOString().slice(0, 10);
      const objectKey = [
        sanitizeObjectPathSegment(req.opsDevice.tenantId),
        sanitizeObjectPathSegment(req.opsDevice.deviceId),
        today,
        `${backupId}-${sanitizeObjectPathSegment(fileName) || 'backup.zip'}`,
      ].join('/');

      await db.insert(deviceBackups).values({
        id: backupId,
        deviceFk: req.opsDevice.devicePk,
        tenantId: req.opsDevice.tenantId,
        backupType,
        sessionGuid: typeof sessionGuid === 'string' ? sessionGuid.trim() : null,
        objectKey,
        fileName: fileName.trim(),
        sizeBytes: size,
        sha256: typeof sha256 === 'string' ? sha256.trim() : null,
        status: 'PENDING',
      });

      const signed = await options.r2Service.createSignedUpload(objectKey);

      res.json({
        backupId,
        objectKey,
        uploadUrl: signed.uploadUrl,
        requiredHeaders: signed.requiredHeaders,
      });
    } catch (error) {
      console.error('POST /v1/backups/request-upload error:', error);
      res.status(500).json({ error: 'REQUEST_UPLOAD_ERROR' });
    }
  });

  router.post('/backups/complete', requireDeviceToken(), async (req: OpsRequest, res: Response) => {
    if (!req.opsDevice) {
      res.status(401).json({ error: 'UNAUTHORIZED_DEVICE' });
      return;
    }

    if (!ensureRateLimit(`backup-complete:${req.opsDevice.deviceId}`, 40, 60_000, res)) {
      return;
    }

    try {
      const { backupId, success, sizeBytes, sha256, errorMessage } = req.body as {
        backupId?: string;
        success?: boolean;
        sizeBytes?: number;
        sha256?: string;
        errorMessage?: string;
      };

      if (!backupId || typeof backupId !== 'string') {
        res.status(400).json({ error: 'backupId is required' });
        return;
      }

      const current = await db
        .select({ id: deviceBackups.id })
        .from(deviceBackups)
        .where(
          and(
            eq(deviceBackups.id, backupId),
            eq(deviceBackups.deviceFk, req.opsDevice.devicePk),
          ),
        )
        .limit(1);

      if (current.length === 0) {
        res.status(404).json({ error: 'BACKUP_NOT_FOUND' });
        return;
      }

      const status = parseBackupStatus(success);
      const now = new Date();

      await db
        .update(deviceBackups)
        .set({
          status,
          sizeBytes: typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) ? Math.trunc(sizeBytes) : null,
          sha256: typeof sha256 === 'string' ? sha256.trim() : null,
          errorMessage: status === 'FAILED' ? (typeof errorMessage === 'string' ? errorMessage.trim() : 'upload_failed') : null,
          completedAt: now,
        })
        .where(eq(deviceBackups.id, backupId));

      if (status === 'FAILED') {
        await options.alertService.sendAlert({
          tenantId: req.opsDevice.tenantId,
          deviceFk: req.opsDevice.devicePk,
          alertType: 'BACKUP_FAILED',
          dedupKey: `backup-failed:${backupId}`,
          payload: {
            backupId,
            deviceId: req.opsDevice.deviceId,
            errorMessage: typeof errorMessage === 'string' ? errorMessage : 'upload_failed',
          },
        });
      }

      res.json({ ok: true, status });
    } catch (error) {
      console.error('POST /v1/backups/complete error:', error);
      res.status(500).json({ error: 'BACKUP_COMPLETE_ERROR' });
    }
  });

  router.get('/admin/overview', requireAdminToken(options.config), async (_req: Request, res: Response) => {
    try {
      const countsResult = await db.execute(sql`
        select
          (select count(1)::int from public.tenants) as total_tenants,
          (select count(1)::int from public.tenant_devices where revoked_at is null) as total_devices,
          (select count(1)::int from public.tenant_devices where revoked_at is null and last_seen_at >= now() - interval '15 minutes') as online_devices,
          (select count(1)::int from public.device_backups where status = 'FAILED' and created_at >= now() - interval '24 hours') as failed_backups_24h,
          (select count(1)::int from public.device_backups where status = 'UPLOADED' and created_at >= now() - interval '24 hours') as uploaded_backups_24h
      `);
      const counts = (countsResult.rows[0] ?? {}) as Record<string, unknown>;

      const runtime = options.jobRunner.getState();

      res.json({
        counts: {
          totalTenants: Number(counts.total_tenants ?? 0),
          totalDevices: Number(counts.total_devices ?? 0),
          onlineDevices: Number(counts.online_devices ?? 0),
          failedBackups24h: Number(counts.failed_backups_24h ?? 0),
          uploadedBackups24h: Number(counts.uploaded_backups_24h ?? 0),
        },
        jobs: runtime,
        lastAlertAtUtc: options.alertService.lastAlertAtUtc?.toISOString() ?? null,
      });
    } catch (error) {
      console.error('GET /v1/admin/overview error:', error);
      res.status(500).json({ error: 'ADMIN_OVERVIEW_ERROR' });
    }
  });

  router.get('/admin/devices', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const limitRaw = Number(req.query.limit ?? 200);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, Math.trunc(limitRaw))) : 200;

      const rows = await db.execute(sql`
        select
          td.id,
          td.tenant_id,
          coalesce(t.name, '') as tenant_name,
          td.device_id,
          coalesce(td.device_name, '') as device_name,
          coalesce(td.app_version, '') as app_version,
          td.last_seen_at,
          coalesce(td.last_status, '') as last_status,
          (case when td.last_seen_at is not null and td.last_seen_at >= now() - interval '15 minutes' then true else false end) as is_online,
          td.created_at,
          td.updated_at
        from public.tenant_devices td
        left join public.tenants t on t.id = td.tenant_id
        where td.revoked_at is null
        order by td.last_seen_at desc nulls last
        limit ${limit}
      `);

      res.json({ devices: rows.rows });
    } catch (error) {
      console.error('GET /v1/admin/devices error:', error);
      res.status(500).json({ error: 'ADMIN_DEVICES_ERROR' });
    }
  });

  router.get('/admin/backups', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const limitRaw = Number(req.query.limit ?? 200);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, Math.trunc(limitRaw))) : 200;

      const rows = await db.execute(sql`
        select
          b.id,
          b.tenant_id,
          coalesce(t.name, '') as tenant_name,
          b.device_fk,
          td.device_id,
          coalesce(td.device_name, '') as device_name,
          b.backup_type,
          b.session_guid,
          b.object_key,
          b.file_name,
          b.size_bytes,
          b.sha256,
          b.status,
          b.error_message,
          b.created_at,
          b.completed_at
        from public.device_backups b
        left join public.tenant_devices td on td.id = b.device_fk
        left join public.tenants t on t.id = b.tenant_id
        order by b.created_at desc
        limit ${limit}
      `);

      res.json({ backups: rows.rows });
    } catch (error) {
      console.error('GET /v1/admin/backups error:', error);
      res.status(500).json({ error: 'ADMIN_BACKUPS_ERROR' });
    }
  });

  router.get('/admin/tenants', requireAdminToken(options.config), async (_req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        select
          t.id,
          t.name,
          t.license_key,
          t.is_active,
          t.valid_until,
          t.subdomain,
          count(td.id)::int as total_devices,
          count(case when td.last_seen_at >= now() - interval '15 minutes' then 1 end)::int as online_devices,
          max(td.last_seen_at) as last_seen_at,
          max(b.created_at) as last_backup_at
        from public.tenants t
        left join public.tenant_devices td on td.tenant_id = t.id and td.revoked_at is null
        left join public.device_backups b on b.tenant_id = t.id
        group by t.id, t.name, t.license_key, t.is_active, t.valid_until, t.subdomain
        order by t.name asc
      `);

      res.json({ tenants: rows.rows });
    } catch (error) {
      console.error('GET /v1/admin/tenants error:', error);
      res.status(500).json({ error: 'ADMIN_TENANTS_ERROR' });
    }
  });

  router.patch('/admin/tenants/:id', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { subdomain, is_active, valid_until } = req.body as {
        subdomain?: string;
        is_active?: boolean;
        valid_until?: string;
      };

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase admin credentials not configured on noc-api server');
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const updates: Record<string, unknown> = {};
      if (subdomain !== undefined) {
        updates.subdomain = subdomain || null;
      }
      if (is_active !== undefined) {
        updates.is_active = is_active;
      }
      if (valid_until !== undefined) {
        updates.valid_until = valid_until || null;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const { error } = await supabaseAdmin.from('tenants').update(updates).eq('id', id);
      if (error) {
        throw new Error(`Failed to update tenant: ${error.message}`);
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('PATCH /v1/admin/tenants/:id error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_UPDATE_ERROR' });
    }
  });

  router.post('/admin/tenants/provision', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const { name, subdomain, tenantType, adminEmail, adminPassword } = req.body;

      if (!name || !adminEmail || !adminPassword) {
        res.status(400).json({ error: 'Missing required provision fields' });
        return;
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase admin credentials not configured on noc-api server');
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. Create Tenant Record in public.tenants
      const licenseKey = crypto.randomUUID().toUpperCase();
      const { data: tenant, error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: name.trim(),
          license_key: licenseKey,
          is_active: true,
          type: tenantType || 'empresa_ti',
        })
        .select('id')
        .single();

      if (tenantErr || !tenant) {
        throw new Error(`Failed to create tenant: ${tenantErr?.message}`);
      }

      const tenantId = tenant.id;

      // 2. Provision Admin User in Supabase Auth
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail.trim(),
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role: 'admin',
        },
      });

      if (authErr) {
        // Rollback tenant
        await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
        throw new Error(`Failed to create admin user: ${authErr.message}`);
      }

      // 3. Provision Subdomain via Cloudflare API
      const cfToken = process.env.CLOUDFLARE_API_TOKEN;
      const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
      const saasTargetIp = process.env.SAAS_TARGET_IP || '1.1.1.1'; // Example fallback

      let cloudflareSuccess = false;
      let cloudflareError = null;

      if (cfToken && cfZoneId && subdomain && subdomain.trim().length > 0) {
        try {
          const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cfToken}`,
            },
            body: JSON.stringify({
              type: 'A',
              name: subdomain.toLowerCase().trim(),
              content: saasTargetIp,
              ttl: 1,
              proxied: true,
            }),
          });

          if (!cfRes.ok) {
            const errData = await cfRes.json().catch(() => ({}));
            cloudflareError = errData.errors?.[0]?.message || 'Unknown CF error';
          } else {
            cloudflareSuccess = true;
          }
        } catch (err) {
          cloudflareError = err instanceof Error ? err.message : 'CF fetch error';
        }
      }

      res.json({
        ok: true,
        tenantId,
        userId: authData.user.id,
        subdomainStatus: cloudflareSuccess ? 'created' : 'skipped_or_failed',
        cloudflareError,
      });
    } catch (error) {
      console.error('POST /v1/admin/tenants/provision error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'PROVISION_ERROR' });
    }
  });

  router.post('/admin/devices/:id/revoke', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const devicePk = (req.params.id ?? '').trim();
      if (!devicePk) {
        res.status(400).json({ error: 'DEVICE_ID_REQUIRED' });
        return;
      }

      await db
        .update(tenantDevices)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantDevices.id, devicePk));

      await db
        .update(deviceApiTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(deviceApiTokens.deviceFk, devicePk),
            isNull(deviceApiTokens.revokedAt),
          ),
        );

      res.json({ ok: true, revokedDeviceId: devicePk });
    } catch (error) {
      console.error('POST /v1/admin/devices/:id/revoke error:', error);
      res.status(500).json({ error: 'ADMIN_REVOKE_DEVICE_ERROR' });
    }
  });

  // ─── Public Portal Route (no auth required) ───
  router.get('/portal/:slug', async (req: Request, res: Response) => {
    try {
      const slug = (req.params.slug ?? '').trim().toLowerCase();
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      // Look up tenant by name/slug match
      const rows = await db.execute(sql`
        select
          t.id,
          t.name,
          t.is_active,
          t.type,
          coalesce(
            (select count(*)::int from public.tenant_devices td
             where td.tenant_id = t.id and td.revoked_at is null), 0
          ) as device_count,
          coalesce(
            (select count(*)::int from public.tenant_devices td
             where td.tenant_id = t.id
               and td.revoked_at is null
               and td.last_seen_at > now() - interval '10 minutes'), 0
          ) as online_devices
        from public.tenants t
        where lower(replace(t.name, ' ', '-')) like ${`%${slug}%`}
          or lower(t.name) like ${`%${slug}%`}
        limit 1
      `);

      const tenant = (rows as any).rows?.[0] ?? (rows as any)[0];

      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      res.json({
        name: tenant.name,
        type: tenant.type || 'empresa_ti',
        isActive: tenant.is_active,
        isOnline: (tenant.online_devices ?? 0) > 0 || tenant.is_active,
        deviceCount: tenant.device_count ?? 0,
        onlineDevices: tenant.online_devices ?? 0,
      });
    } catch (error) {
      console.error('GET /v1/portal/:slug error:', error);
      res.status(500).json({ error: 'PORTAL_ERROR' });
    }
  });

  return router;
}

export async function getOpsHealth(options: {
  config: OpsConfig;
  r2Service: R2Service;
  jobRunner: OpsJobRunner;
}): Promise<Record<string, unknown>> {
  let supabaseStatus: Record<string, unknown> = { ok: false, message: 'not_configured' };

  if (options.config.supabaseUrl && options.config.supabaseAnonKey) {
    try {
      const response = await fetch(`${options.config.supabaseUrl}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          apikey: options.config.supabaseAnonKey,
        },
      });
      supabaseStatus = {
        ok: response.ok,
        statusCode: response.status,
      };
    } catch (error) {
      supabaseStatus = {
        ok: false,
        message: error instanceof Error ? error.message : 'supabase_check_error',
      };
    }
  }

  const r2Status = await options.r2Service.checkHealth();

  const activeTokens = await db
    .select({
      total: sql<number>`count(1)`.mapWith(Number),
    })
    .from(deviceApiTokens)
    .where(and(isNull(deviceApiTokens.revokedAt), gt(deviceApiTokens.expiresAt, new Date())));

  const pendingBackups = await db
    .select({
      total: sql<number>`count(1)`.mapWith(Number),
    })
    .from(deviceBackups)
    .where(inArray(deviceBackups.status, ['PENDING', 'FAILED']));

  const runtime = options.jobRunner.getState();

  return {
    supabase: supabaseStatus,
    r2: r2Status,
    jobs: runtime,
    activeDeviceTokens: activeTokens[0]?.total ?? 0,
    pendingOrFailedBackups: pendingBackups[0]?.total ?? 0,
    serverTimeUtc: new Date().toISOString(),
  };
}
