import type { Request, Response } from 'express';
import type { OpsRequest } from '../ops/auth.js';
import type { OpsConfig } from '../ops/config.js';
import { sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { requirePortalUser } from '../ops/auth.js';

type PortalTenantSummary = {
  adminUsers: number;
  deviceCount: number;
  isActive: boolean;
  lastBackupAt: string | null;
  lastReportSyncAt: string | null;
  lastSeenAt: string | null;
  licensedUsers: number;
  logoUrl: string | null;
  name: string;
  onlineDevices: number;
  portalSlug: string;
  tenantId: string;
  type: string;
  userCount: number;
  validUntil: string | null;
};

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function getDateRange(props: {
  from: unknown;
  to: unknown;
}) {
  const from = typeof props.from === 'string' && props.from.trim()
    ? `${props.from.trim()}T00:00:00.000Z`
    : null;
  const to = typeof props.to === 'string' && props.to.trim()
    ? `${props.to.trim()}T23:59:59.999Z`
    : null;

  return { from, to };
}

async function getTenantBySlug(slug: string) {
  const rows = await db.execute(sql`
    select
      t.id::text as tenant_id,
      t.name,
      coalesce(t.type, 'empresa_ti') as type,
      nullif(coalesce(t.logo_url, ''), '') as logo_url,
      coalesce(t.portal_slug, t.subdomain, '') as portal_slug,
      coalesce(t.is_active, false) as is_active,
      t.valid_until::text as valid_until,
      coalesce(
        (
          select count(1)::int
          from public.tenant_devices td
          where td.tenant_id = t.id
            and td.revoked_at is null
        ),
        0
      ) as device_count,
      coalesce(
        (
          select count(1)::int
          from public.tenant_devices td
          where td.tenant_id = t.id
            and td.revoked_at is null
            and td.last_seen_at >= now() - interval '15 minutes'
        ),
        0
      ) as online_devices,
      (
        select max(td.last_seen_at)
        from public.tenant_devices td
        where td.tenant_id = t.id
          and td.revoked_at is null
      ) as last_seen_at,
      (
        select max(b.created_at)
        from public.device_backups b
        where b.tenant_id = t.id
      ) as last_backup_at,
      (
        select max(s.synced_at)
        from public.official_sessions s
        where s.tenant_id = t.id
      ) as last_report_sync_at,
      coalesce(
        (
          select count(1)::int
          from public.profiles p
          where p.tenant_id = t.id
        ),
        0
      ) as user_count,
      coalesce(
        (
          select count(1)::int
          from public.profiles p
          where p.tenant_id = t.id
            and (p.valid_until is null or p.valid_until::text >= current_date::text)
        ),
        0
      ) as licensed_users,
      coalesce(
        (
          select count(1)::int
          from public.profiles p
          where p.tenant_id = t.id
            and coalesce(p.is_admin, false) = true
        ),
        0
      ) as admin_users
    from public.tenants t
    where lower(coalesce(t.portal_slug, t.subdomain, '')) = ${slug}
    limit 1
  `);

  const row = (rows.rows[0] ?? null) as null | {
    admin_users: number | string;
    device_count: number | string;
    is_active: boolean;
    last_backup_at: Date | string | null;
    last_report_sync_at: Date | string | null;
    last_seen_at: Date | string | null;
    licensed_users: number | string;
    logo_url: string | null;
    name: string;
    online_devices: number | string;
    portal_slug: string;
    tenant_id: string;
    type: string;
    user_count: number | string;
    valid_until: string | null;
  };

  if (!row) {
    return null;
  }

  return {
    adminUsers: toNumber(row.admin_users),
    deviceCount: toNumber(row.device_count),
    isActive: row.is_active,
    lastBackupAt: toIsoString(row.last_backup_at),
    lastReportSyncAt: toIsoString(row.last_report_sync_at),
    lastSeenAt: toIsoString(row.last_seen_at),
    licensedUsers: toNumber(row.licensed_users),
    logoUrl: row.logo_url,
    name: row.name,
    onlineDevices: toNumber(row.online_devices),
    portalSlug: row.portal_slug,
    tenantId: row.tenant_id,
    type: row.type,
    userCount: toNumber(row.user_count),
    validUntil: row.valid_until,
  } satisfies PortalTenantSummary;
}

async function getRecentSessions(tenantId: string, limit: number) {
  const rows = await db.execute(sql`
    select
      s.session_guid,
      s.speaker_name,
      s.started_at_utc,
      s.ended_at_utc,
      s.planned_seconds,
      s.elapsed_seconds,
      s.final_status,
      s.created_by,
      s.synced_at
    from public.official_sessions s
    where s.tenant_id = ${tenantId}::uuid
    order by s.started_at_utc desc
    limit ${limit}
  `);

  return rows.rows.map(row => ({
    sessionGuid: String((row as { session_guid?: string }).session_guid ?? ''),
    speakerName: String((row as { speaker_name?: string }).speaker_name ?? ''),
    startedAtUtc: toIsoString((row as { started_at_utc?: Date | string | null }).started_at_utc),
    endedAtUtc: toIsoString((row as { ended_at_utc?: Date | string | null }).ended_at_utc),
    plannedSeconds: toNumber((row as { planned_seconds?: number | string }).planned_seconds),
    elapsedSeconds: toNumber((row as { elapsed_seconds?: number | string }).elapsed_seconds),
    finalStatus: String((row as { final_status?: string }).final_status ?? ''),
    createdBy: String((row as { created_by?: string }).created_by ?? ''),
    syncedAt: toIsoString((row as { synced_at?: Date | string | null }).synced_at),
  }));
}

async function getSpeakerUsage(props: {
  tenantId: string;
  from: string | null;
  to: string | null;
}) {
  const rows = await db.execute(sql`
    select
      s.speaker_name,
      count(1)::int as total_sessions,
      coalesce(sum(s.elapsed_seconds), 0)::int as total_elapsed_seconds,
      coalesce(avg(s.elapsed_seconds), 0)::numeric(10, 2) as average_elapsed_seconds
    from public.official_sessions s
    where s.tenant_id = ${props.tenantId}::uuid
      and (${props.from}::timestamptz is null or s.started_at_utc >= ${props.from}::timestamptz)
      and (${props.to}::timestamptz is null or s.started_at_utc <= ${props.to}::timestamptz)
    group by s.speaker_name
    order by total_elapsed_seconds desc, s.speaker_name asc
  `);

  return rows.rows.map(row => ({
    averageElapsedSeconds: Math.round(Number((row as { average_elapsed_seconds?: number | string }).average_elapsed_seconds ?? 0)),
    speakerName: String((row as { speaker_name?: string }).speaker_name ?? ''),
    totalElapsedSeconds: toNumber((row as { total_elapsed_seconds?: number | string }).total_elapsed_seconds),
    totalSessions: toNumber((row as { total_sessions?: number | string }).total_sessions),
  }));
}

function ensureTenantAccess(props: {
  req: OpsRequest;
  res: Response;
  slug: string;
  tenant: PortalTenantSummary | null;
}) {
  if (!props.tenant) {
    props.res.status(404).json({ error: 'TENANT_NOT_FOUND' });
    return false;
  }

  const portalUser = props.req.portalUser;
  if (!portalUser) {
    props.res.status(401).json({ error: 'UNAUTHORIZED' });
    return false;
  }

  if (portalUser.tenantId !== props.tenant.tenantId || normalizeSlug(props.tenant.portalSlug) !== props.slug) {
    props.res.status(403).json({ error: 'TENANT_MISMATCH' });
    return false;
  }

  return true;
}

export function createPortalV1Router(config: OpsConfig) {
  const router = Router();

  router.get('/me', requirePortalUser(config), async (req: OpsRequest, res: Response) => {
    const portalUser = req.portalUser;
    if (!portalUser) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    res.json({
      displayName: portalUser.displayName,
      email: portalUser.email,
      isAdmin: portalUser.isAdmin,
      tenantId: portalUser.tenantId,
      tenantLogoUrl: portalUser.tenantLogoUrl,
      tenantName: portalUser.tenantName,
      tenantPortalSlug: portalUser.tenantPortalSlug,
      tenantValidUntil: portalUser.tenantValidUntil,
      userId: portalUser.userId,
      userValidUntil: portalUser.userValidUntil,
    });
  });

  router.get('/tenants/:slug/overview', requirePortalUser(config), async (req: OpsRequest, res: Response) => {
    try {
      const slug = normalizeSlug(req.params.slug ?? '');
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      const tenant = await getTenantBySlug(slug);
      if (!ensureTenantAccess({ req, res, slug, tenant })) {
        return;
      }

      const currentTenant = tenant!;
      const recentSessions = await getRecentSessions(currentTenant.tenantId, 10);
      res.json({
        profile: req.portalUser,
        recentSessions,
        tenant: currentTenant,
      });
    } catch (error) {
      console.error('GET /v1/portal/tenants/:slug/overview error:', error);
      res.status(500).json({ error: 'PORTAL_OVERVIEW_ERROR' });
    }
  });

  router.get('/tenants/:slug/sessions', requirePortalUser(config), async (req: OpsRequest, res: Response) => {
    try {
      const slug = normalizeSlug(req.params.slug ?? '');
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      const tenant = await getTenantBySlug(slug);
      if (!ensureTenantAccess({ req, res, slug, tenant })) {
        return;
      }
      const currentTenant = tenant!;

      const { from, to } = getDateRange({
        from: req.query.from,
        to: req.query.to,
      });
      const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
      const status = typeof req.query.status === 'string' && req.query.status.trim()
        ? req.query.status.trim().toUpperCase()
        : null;

      const rows = await db.execute(sql`
        select
          s.session_guid,
          s.speaker_name,
          s.started_at_utc,
          s.ended_at_utc,
          s.planned_seconds,
          s.elapsed_seconds,
          s.final_status,
          s.created_by,
          s.synced_at
        from public.official_sessions s
        where s.tenant_id = ${currentTenant.tenantId}::uuid
          and (${from}::timestamptz is null or s.started_at_utc >= ${from}::timestamptz)
          and (${to}::timestamptz is null or s.started_at_utc <= ${to}::timestamptz)
          and (${status}::text is null or s.final_status = ${status}::text)
        order by s.started_at_utc desc
        limit ${limit}
      `);

      res.json({
        sessions: rows.rows.map(row => ({
          sessionGuid: String((row as { session_guid?: string }).session_guid ?? ''),
          speakerName: String((row as { speaker_name?: string }).speaker_name ?? ''),
          startedAtUtc: toIsoString((row as { started_at_utc?: Date | string | null }).started_at_utc),
          endedAtUtc: toIsoString((row as { ended_at_utc?: Date | string | null }).ended_at_utc),
          plannedSeconds: toNumber((row as { planned_seconds?: number | string }).planned_seconds),
          elapsedSeconds: toNumber((row as { elapsed_seconds?: number | string }).elapsed_seconds),
          finalStatus: String((row as { final_status?: string }).final_status ?? ''),
          createdBy: String((row as { created_by?: string }).created_by ?? ''),
          syncedAt: toIsoString((row as { synced_at?: Date | string | null }).synced_at),
        })),
      });
    } catch (error) {
      console.error('GET /v1/portal/tenants/:slug/sessions error:', error);
      res.status(500).json({ error: 'PORTAL_SESSIONS_ERROR' });
    }
  });

  router.get('/tenants/:slug/speaker-usage', requirePortalUser(config), async (req: OpsRequest, res: Response) => {
    try {
      const slug = normalizeSlug(req.params.slug ?? '');
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      const tenant = await getTenantBySlug(slug);
      if (!ensureTenantAccess({ req, res, slug, tenant })) {
        return;
      }
      const currentTenant = tenant!;

      const { from, to } = getDateRange({
        from: req.query.from,
        to: req.query.to,
      });
      const speakers = await getSpeakerUsage({
        tenantId: currentTenant.tenantId,
        from,
        to,
      });

      res.json({ speakers });
    } catch (error) {
      console.error('GET /v1/portal/tenants/:slug/speaker-usage error:', error);
      res.status(500).json({ error: 'PORTAL_SPEAKER_USAGE_ERROR' });
    }
  });

  router.get('/tenants/:slug/sessions/:sessionGuid/audit-logs', requirePortalUser(config), async (req: OpsRequest, res: Response) => {
    try {
      const slug = normalizeSlug(req.params.slug ?? '');
      const sessionGuid = String(req.params.sessionGuid ?? '').trim();
      if (!slug || !sessionGuid) {
        res.status(400).json({ error: 'INVALID_REQUEST' });
        return;
      }

      const tenant = await getTenantBySlug(slug);
      if (!ensureTenantAccess({ req, res, slug, tenant })) {
        return;
      }
      const currentTenant = tenant!;

      const sessionRows = await db.execute(sql`
        select
          s.session_guid,
          s.speaker_name,
          s.started_at_utc,
          s.ended_at_utc,
          s.planned_seconds,
          s.elapsed_seconds,
          s.final_status,
          s.created_by,
          s.synced_at
        from public.official_sessions s
        where s.tenant_id = ${currentTenant.tenantId}::uuid
          and s.session_guid = ${sessionGuid}
        limit 1
      `);

      const sessionRow = (sessionRows.rows[0] ?? null) as null | {
        created_by: string | null;
        elapsed_seconds: number | string;
        ended_at_utc: Date | string | null;
        final_status: string;
        planned_seconds: number | string;
        session_guid: string;
        speaker_name: string;
        started_at_utc: Date | string | null;
        synced_at: Date | string | null;
      };

      if (!sessionRow) {
        res.status(404).json({ error: 'SESSION_NOT_FOUND' });
        return;
      }

      const logRows = await db.execute(sql`
        select
          l.id,
          l.event_type,
          l.event_at_utc,
          l.remaining_seconds,
          l.elapsed_seconds,
          l.details
        from public.official_session_audit_logs l
        where l.tenant_id = ${currentTenant.tenantId}::uuid
          and l.session_guid = ${sessionGuid}
        order by l.event_at_utc asc, l.id asc
      `);

      res.json({
        logs: logRows.rows.map(row => ({
          details: String((row as { details?: string }).details ?? ''),
          elapsedSeconds: toNumber((row as { elapsed_seconds?: number | string }).elapsed_seconds),
          eventAtUtc: toIsoString((row as { event_at_utc?: Date | string | null }).event_at_utc),
          eventType: String((row as { event_type?: string }).event_type ?? ''),
          id: toNumber((row as { id?: number | string }).id),
          remainingSeconds: toNumber((row as { remaining_seconds?: number | string }).remaining_seconds),
        })),
        session: {
          createdBy: sessionRow.created_by ?? '',
          elapsedSeconds: toNumber(sessionRow.elapsed_seconds),
          endedAtUtc: toIsoString(sessionRow.ended_at_utc),
          finalStatus: sessionRow.final_status,
          plannedSeconds: toNumber(sessionRow.planned_seconds),
          sessionGuid: sessionRow.session_guid,
          speakerName: sessionRow.speaker_name,
          startedAtUtc: toIsoString(sessionRow.started_at_utc),
          syncedAt: toIsoString(sessionRow.synced_at),
        },
      });
    } catch (error) {
      console.error('GET /v1/portal/tenants/:slug/sessions/:sessionGuid/audit-logs error:', error);
      res.status(500).json({ error: 'PORTAL_AUDIT_LOGS_ERROR' });
    }
  });

  router.get('/:slug', async (req: Request, res: Response) => {
    try {
      const slug = normalizeSlug(req.params.slug ?? '');
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      const tenant = await getTenantBySlug(slug);
      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      res.json({
        ...tenant,
        isOnline: tenant.onlineDevices > 0,
      });
    } catch (error) {
      console.error('GET /v1/portal/:slug error:', error);
      res.status(500).json({ error: 'PORTAL_SUMMARY_ERROR' });
    }
  });

  return router;
}
