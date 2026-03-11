import type { Request, Response } from 'express';
import type { OpsAlertService } from '../ops/alerts.js';
import type { OpsRequest } from '../ops/auth.js';
import type { OpsConfig } from '../ops/config.js';
import type { OpsJobRunner } from '../ops/jobs.js';
import type { R2Service } from '../ops/r2Service.js';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db, pool } from '../db/index.js';
import {
  deviceApiTokens,
  deviceBackups,
  deviceHeartbeats,
  opsAlerts,
  tenantDevices,
  tenantInfraProfiles,
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
const PORTAL_PUBLIC_BASE_URL = (process.env.PANEL_PUBLIC_BASE_URL ?? 'https://painel.rtectecnologia.com.br')
  .trim()
  .replace(/\/$/, '');

type PortalTenantRow = {
  tenantId: string;
  name: string;
  type: string;
  portalSlug: string | null;
  subdomain: string | null;
  isActive: boolean;
  validUntil: string | null;
  deviceCount: number;
  onlineDevices: number;
  lastSeenAt: string | null;
  lastBackupAt: string | null;
  userCount: number;
  licensedUsers: number;
  adminUsers: number;
};

type TenantAdminRow = PortalTenantRow & {
  licenseKey: string;
  logoUrl: string | null;
};

type TenantUserAccessStatus = 'active' | 'tenant_expired' | 'tenant_inactive' | 'user_expired';

type TenantUserRow = {
  displayName: string;
  email: string;
  isAdmin: boolean;
  userId: string;
  validUntil: string | null;
};

type TenantUserWithAccess = TenantUserRow & {
  accessStatus: TenantUserAccessStatus;
  isBlocked: boolean;
};

type TenantInfrastructureAsset = {
  category: string;
  host: string | null;
  id: string;
  ipAddress: string | null;
  notes: string | null;
  platform: string | null;
  port: string | null;
  role: string;
  status: 'active' | 'maintenance' | 'planned';
  title: string;
};

type TenantInfrastructureDoc = {
  label: string;
  url: string;
};

type TenantInfrastructureProfile = {
  assets: TenantInfrastructureAsset[];
  docs: TenantInfrastructureDoc[];
  monitoring: {
    improvements: string[];
    stack: string[];
    summary: string;
  };
  network: {
    firewallLanIp: string;
    firewallName: string;
    gatewayIp: string;
    gatewayName: string;
    lanSubnet: string;
    switchName: string;
    topology: string[];
    wanSource: string;
  };
  notes: string;
  overview: string;
  responsibilities: string[];
  vpn: {
    derpDomain: string;
    domain: string;
    headscaleDomain: string;
    nodes: string[];
    provider: string;
    subnetRouting: boolean;
    tailnetIp: string;
  };
};

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

function sanitizeTenantSubdomain(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return normalized.length > 0 ? normalized : null;
}

function buildPortalRoutingInfo(portalSlug: string | null) {
  if (!portalSlug) {
    return {
      portalUrl: null,
      redirectSource: null,
      redirectTarget: null,
      cloudflareStatus: 'not_applicable' as const,
    };
  }

  const portalUrl = `${PORTAL_PUBLIC_BASE_URL}/portal/${portalSlug}`;
  return {
    portalUrl,
    redirectSource: null,
    redirectTarget: portalUrl,
    cloudflareStatus: 'not_applicable' as const,
  };
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

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDateOrNull(value: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return { ok: true, value: null };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { ok: false, error: 'INVALID_ISO_DATE' };
  }

  return { ok: true, value: raw };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function resolveUserAccessStatus(props: {
  tenantIsActive: boolean;
  tenantValidUntil: string | null;
  userValidUntil: string | null;
}) {
  const todayIso = getTodayIsoDate();

  if (!props.tenantIsActive) {
    return 'tenant_inactive' satisfies TenantUserAccessStatus;
  }

  if (props.tenantValidUntil && props.tenantValidUntil < todayIso) {
    return 'tenant_expired' satisfies TenantUserAccessStatus;
  }

  if (props.userValidUntil && props.userValidUntil < todayIso) {
    return 'user_expired' satisfies TenantUserAccessStatus;
  }

  return 'active' satisfies TenantUserAccessStatus;
}

function mapTenantUserWithAccess(props: {
  tenant: Pick<TenantAdminRow, 'isActive' | 'validUntil'>;
  user: TenantUserRow;
}) {
  const accessStatus = resolveUserAccessStatus({
    tenantIsActive: props.tenant.isActive,
    tenantValidUntil: props.tenant.validUntil,
    userValidUntil: props.user.validUntil,
  });

  return {
    ...props.user,
    accessStatus,
    isBlocked: accessStatus === 'user_expired',
  } satisfies TenantUserWithAccess;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials not configured on noc-api server');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getPortalTenantBySlug(slug: string) {
  const rows = await db.execute(sql`
    select
      t.id::text as tenant_id,
      t.name,
      coalesce(t.type, 'empresa_ti') as type,
      coalesce(t.portal_slug, t.subdomain) as portal_slug,
      t.subdomain,
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
      ) as last_backup_at
      ,
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
    tenant_id: string;
    name: string;
    type: string;
    portal_slug: string | null;
    subdomain: string | null;
    is_active: boolean;
    valid_until: string | null;
    device_count: number | string;
    online_devices: number | string;
    last_seen_at: Date | string | null;
    last_backup_at: Date | string | null;
    user_count: number | string;
    licensed_users: number | string;
    admin_users: number | string;
  };

  if (!row) {
    return null;
  }

  return {
    tenantId: row.tenant_id,
    name: row.name,
    type: row.type,
    portalSlug: row.portal_slug,
    subdomain: row.subdomain,
    isActive: row.is_active,
    validUntil: row.valid_until,
    deviceCount: toNumber(row.device_count),
    onlineDevices: toNumber(row.online_devices),
    lastSeenAt: toIsoString(row.last_seen_at),
    lastBackupAt: toIsoString(row.last_backup_at),
    userCount: toNumber(row.user_count),
    licensedUsers: toNumber(row.licensed_users),
    adminUsers: toNumber(row.admin_users),
  } satisfies PortalTenantRow;
}

async function getTenantAdminById(tenantId: string) {
  const rows = await db.execute(sql`
    select
      t.id::text as tenant_id,
      t.name,
      coalesce(t.type, 'empresa_ti') as type,
      coalesce(t.license_key, '') as license_key,
      nullif(coalesce(t.logo_url, ''), '') as logo_url,
      coalesce(t.portal_slug, t.subdomain) as portal_slug,
      t.subdomain,
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
    where t.id = ${tenantId}::uuid
    limit 1
  `);

  const row = (rows.rows[0] ?? null) as null | {
    admin_users: number | string;
    device_count: number | string;
    is_active: boolean;
    last_backup_at: Date | string | null;
    last_seen_at: Date | string | null;
    license_key: string;
    logo_url: string | null;
    licensed_users: number | string;
    name: string;
    online_devices: number | string;
    portal_slug: string | null;
    subdomain: string | null;
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
    lastSeenAt: toIsoString(row.last_seen_at),
    licenseKey: row.license_key,
    logoUrl: row.logo_url,
    licensedUsers: toNumber(row.licensed_users),
    name: row.name,
    onlineDevices: toNumber(row.online_devices),
    portalSlug: row.portal_slug,
    subdomain: row.subdomain,
    tenantId: row.tenant_id,
    type: row.type,
    userCount: toNumber(row.user_count),
    validUntil: row.valid_until,
  } satisfies TenantAdminRow;
}

async function getTenantUsers(tenantId: string) {
  const rows = await db.execute(sql`
    select
      p.id::text as user_id,
      coalesce(p.email, '') as email,
      coalesce(p.display_name, '') as display_name,
      coalesce(p.is_admin, false) as is_admin,
      p.valid_until::text as valid_until
    from public.profiles p
    where p.tenant_id = ${tenantId}::uuid
    order by coalesce(p.is_admin, false) desc, coalesce(p.display_name, p.email) asc
  `);

  return rows.rows.map(row => ({
    displayName: String((row as { display_name?: string }).display_name ?? ''),
    email: String((row as { email?: string }).email ?? ''),
    isAdmin: Boolean((row as { is_admin?: boolean }).is_admin),
    userId: String((row as { user_id?: string }).user_id ?? ''),
    validUntil: ((row as { valid_until?: string | null }).valid_until ?? null),
  })) satisfies TenantUserRow[];
}

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => toStringValue(entry))
    .filter(Boolean);
}

function toBooleanValue(value: unknown) {
  return value === true;
}

function sanitizeInfrastructureDocs(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as TenantInfrastructureDoc[];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const label = toStringValue((entry as { label?: unknown }).label);
      const url = toStringValue((entry as { url?: unknown }).url);
      if (!label || !url) {
        return null;
      }

      return {
        label,
        url,
      } satisfies TenantInfrastructureDoc;
    })
    .filter((entry): entry is TenantInfrastructureDoc => Boolean(entry));
}

function sanitizeInfrastructureAssets(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as TenantInfrastructureAsset[];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const title = toStringValue(raw.title);
      const role = toStringValue(raw.role);
      if (!title || !role) {
        return null;
      }

      const statusValue = toStringValue(raw.status);
      const status = statusValue === 'maintenance' || statusValue === 'planned'
        ? statusValue
        : 'active';

      return {
        category: toStringValue(raw.category) || 'asset',
        host: toStringValue(raw.host) || null,
        id: toStringValue(raw.id) || crypto.randomUUID(),
        ipAddress: toStringValue(raw.ipAddress) || null,
        notes: toStringValue(raw.notes) || null,
        platform: toStringValue(raw.platform) || null,
        port: toStringValue(raw.port) || null,
        role,
        status,
        title,
      } satisfies TenantInfrastructureAsset;
    })
    .filter((entry): entry is TenantInfrastructureAsset => Boolean(entry));
}

function sanitizeTenantInfrastructureProfile(value: unknown): TenantInfrastructureProfile {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const networkSource = source.network && typeof source.network === 'object'
    ? source.network as Record<string, unknown>
    : {};
  const monitoringSource = source.monitoring && typeof source.monitoring === 'object'
    ? source.monitoring as Record<string, unknown>
    : {};
  const vpnSource = source.vpn && typeof source.vpn === 'object'
    ? source.vpn as Record<string, unknown>
    : {};

  return {
    assets: sanitizeInfrastructureAssets(source.assets),
    docs: sanitizeInfrastructureDocs(source.docs),
    monitoring: {
      improvements: toStringArray(monitoringSource.improvements),
      stack: toStringArray(monitoringSource.stack),
      summary: toStringValue(monitoringSource.summary),
    },
    network: {
      firewallLanIp: toStringValue(networkSource.firewallLanIp),
      firewallName: toStringValue(networkSource.firewallName),
      gatewayIp: toStringValue(networkSource.gatewayIp),
      gatewayName: toStringValue(networkSource.gatewayName),
      lanSubnet: toStringValue(networkSource.lanSubnet),
      switchName: toStringValue(networkSource.switchName),
      topology: toStringArray(networkSource.topology),
      wanSource: toStringValue(networkSource.wanSource),
    },
    notes: toStringValue(source.notes),
    overview: toStringValue(source.overview),
    responsibilities: toStringArray(source.responsibilities),
    vpn: {
      derpDomain: toStringValue(vpnSource.derpDomain),
      domain: toStringValue(vpnSource.domain),
      headscaleDomain: toStringValue(vpnSource.headscaleDomain),
      nodes: toStringArray(vpnSource.nodes),
      provider: toStringValue(vpnSource.provider),
      subnetRouting: toBooleanValue(vpnSource.subnetRouting),
      tailnetIp: toStringValue(vpnSource.tailnetIp),
    },
  };
}

function buildArrudaInfrastructureProfile() {
  return sanitizeTenantInfrastructureProfile({
    assets: [
      {
        category: 'virtualization',
        host: 'proxmox-ve',
        id: 'arruda-proxmox',
        ipAddress: '192.168.0.7',
        notes: 'Virtualizacao da infraestrutura principal.',
        platform: 'Proxmox VE',
        port: '8006',
        role: 'Host principal de virtualizacao',
        status: 'active',
        title: 'Proxmox VE',
      },
      {
        category: 'firewall',
        host: 'pfsense-vm',
        id: 'arruda-pfsense',
        ipAddress: '192.168.1.1',
        notes: 'Firewall, roteador, DHCP e acesso remoto com Tailscale.',
        platform: 'pfSense VM',
        port: null,
        role: 'Borda de rede e seguranca',
        status: 'active',
        title: 'pfSense',
      },
      {
        category: 'storage',
        host: 'truenas',
        id: 'arruda-truenas',
        ipAddress: null,
        notes: 'Armazenamento central, SMB e backups.',
        platform: 'TrueNAS',
        port: null,
        role: 'Storage interno',
        status: 'active',
        title: 'TrueNAS',
      },
      {
        category: 'server',
        host: 'ubuntu-server',
        id: 'arruda-ubuntu',
        ipAddress: null,
        notes: 'Scripts, automacao e monitoramento em Python.',
        platform: 'Ubuntu Server',
        port: null,
        role: 'Automacao e monitoramento',
        status: 'active',
        title: 'Ubuntu Server',
      },
      {
        category: 'gateway',
        host: 'modem-parks',
        id: 'arruda-modem',
        ipAddress: '192.168.0.1',
        notes: 'Gateway do provedor de internet.',
        platform: 'Modem Parks',
        port: null,
        role: 'Conexao com internet',
        status: 'active',
        title: 'Modem Parks',
      },
      {
        category: 'switch',
        host: 'switch-24p',
        id: 'arruda-switch',
        ipAddress: null,
        notes: 'Switch central que conecta toda a rede interna.',
        platform: 'Switch 24 portas',
        port: null,
        role: 'Distribuicao da LAN',
        status: 'active',
        title: 'Switch 24 portas',
      },
      {
        category: 'vpn',
        host: 'mycloudfree',
        id: 'arruda-headscale',
        ipAddress: null,
        notes: 'Headscale e DERP proprio em implementacao.',
        platform: 'Headscale',
        port: null,
        role: 'Controle proprio da VPN',
        status: 'planned',
        title: 'Headscale',
      },
    ],
    docs: [
      { label: 'pfSense docs', url: 'https://docs.netgate.com/pfsense/en/latest/' },
      { label: 'Tailscale docs', url: 'https://tailscale.com/kb' },
      { label: 'TrueNAS docs', url: 'https://www.truenas.com/docs/' },
      { label: 'Telegram Bot API', url: 'https://core.telegram.org/bots/api' },
      { label: 'Tailscale install', url: 'https://tailscale.com/kb/1017/install/' },
      { label: 'Headscale', url: 'https://github.com/juanfont/headscale' },
      { label: 'Custom DERP', url: 'https://tailscale.com/kb/1118/custom-derp/' },
    ],
    monitoring: {
      improvements: [
        'Detectar dispositivo instavel',
        'Detectar quedas intermitentes',
        'Criar alertas inteligentes',
      ],
      stack: [
        'Python',
        'aiohttp',
        'smbclient',
        'Telegram Bot API',
      ],
      summary: 'Bot proprio de monitoramento para conectividade, checks SMB/ICMP e alertas via Telegram.',
    },
    network: {
      firewallLanIp: '192.168.1.1',
      firewallName: 'pfSense',
      gatewayIp: '192.168.0.1',
      gatewayName: 'Modem Parks',
      lanSubnet: '192.168.1.0/24',
      switchName: 'Switch 24 portas',
      topology: [
        'Internet',
        'Modem Parks',
        'pfSense',
        'Switch 24 portas',
        'Computadores / servidores / APs',
      ],
      wanSource: 'Rede do modem',
    },
    notes: 'Tenant piloto de empresa de TI com foco em infraestrutura, VPN, monitoramento e operacao de servidores.',
    overview: 'Infraestrutura empresarial baseada em Proxmox com pfSense virtualizado, storage interno, automacao em Ubuntu Server e acesso remoto por Tailscale.',
    responsibilities: [
      'Infraestrutura de rede',
      'Servidores',
      'Virtualizacao',
      'VPN',
      'Monitoramento',
      'Automacao',
      'Manutencao',
    ],
    vpn: {
      derpDomain: 'derp.arruda.tech',
      domain: 'vpn.arruda.tech',
      headscaleDomain: 'vpn.arruda.tech',
      nodes: [
        'pfsense 100.68.93.55',
        'arr-adm-ntb-01',
        'arr-adm-ntb-02',
        'arr-adm-pc-01',
        'arr-adm-pc-02',
        'servidorvideo',
        'omv-server',
        'mycloudfree',
      ],
      provider: 'Tailscale',
      subnetRouting: true,
      tailnetIp: '100.68.93.55',
    },
  });
}

function buildDefaultTenantInfrastructureProfile(tenant: Pick<TenantAdminRow, 'name' | 'subdomain' | 'type'>) {
  const tenantIdentity = `${tenant.name} ${tenant.subdomain ?? ''}`.toLowerCase();
  if (tenantIdentity.includes('arruda')) {
    return buildArrudaInfrastructureProfile();
  }

  if (tenant.type === 'camara') {
    return sanitizeTenantInfrastructureProfile({
      monitoring: {
        improvements: [
          'Mapear terminais do plenario',
          'Consolidar operacao do LegislativoTimer',
        ],
        stack: [
          'LegislativoTimer',
          'Supabase',
          'Backups',
          'Alertas operacionais',
        ],
        summary: 'Perfil orientado ao ambiente legislativo, usuarios e disponibilidade institucional.',
      },
      network: {
        firewallLanIp: '',
        firewallName: '',
        gatewayIp: '',
        gatewayName: '',
        lanSubnet: '',
        switchName: '',
        topology: [],
        wanSource: '',
      },
      notes: '',
      overview: 'Tenant institucional com foco em operacao do LegislativoTimer e suporte ao ambiente da camara.',
      responsibilities: [
        'Usuarios do LegislativoTimer',
        'Licencas',
        'Suporte institucional',
      ],
      vpn: {
        derpDomain: '',
        domain: '',
        headscaleDomain: '',
        nodes: [],
        provider: '',
        subnetRouting: false,
        tailnetIp: '',
      },
    });
  }

  return sanitizeTenantInfrastructureProfile({
    monitoring: {
      improvements: [],
      stack: [],
      summary: 'Perfil tecnico para operacao de rede, servidores, VPN e automacao do tenant.',
    },
    network: {
      firewallLanIp: '',
      firewallName: '',
      gatewayIp: '',
      gatewayName: '',
      lanSubnet: '',
      switchName: '',
      topology: [],
      wanSource: '',
    },
    notes: '',
    overview: 'Tenant empresarial com inventario de infraestrutura, rede, VPN e monitoramento.',
    responsibilities: [],
    vpn: {
      derpDomain: '',
      domain: '',
      headscaleDomain: '',
      nodes: [],
      provider: '',
      subnetRouting: false,
      tailnetIp: '',
    },
  });
}

async function getTenantInfrastructureProfile(tenant: Pick<TenantAdminRow, 'name' | 'subdomain' | 'tenantId' | 'type'>) {
  try {
    const rows = await db
      .select({
        profile: tenantInfraProfiles.profile,
      })
      .from(tenantInfraProfiles)
      .where(eq(tenantInfraProfiles.tenantId, tenant.tenantId))
      .limit(1);

    const existingProfile = rows[0]?.profile;
    if (!existingProfile) {
      return {
        isDefault: true,
        profile: buildDefaultTenantInfrastructureProfile(tenant),
      };
    }

    return {
      isDefault: false,
      profile: sanitizeTenantInfrastructureProfile(existingProfile),
    };
  } catch (error) {
    // Hard fallback: if the table doesn't exist in the target DB yet, keep the panel usable
    // and show a default profile. This avoids a 500 on /admin/tenants/:id/detail.
    const message = error instanceof Error ? error.message : String(error);
    const code = error && typeof error === 'object' ? String((error as { code?: unknown }).code ?? '') : '';
    if (code === '42P01' || message.toLowerCase().includes('tenant_infra_profiles')) {
      console.error('tenant_infra_profiles table missing. Returning default infra profile. Run migrations 0003_tenant_infra_profiles.sql.', message);
      return {
        isDefault: true,
        profile: buildDefaultTenantInfrastructureProfile(tenant),
      };
    }

    throw error;
  }
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
      const { appVersion, status, currentSessionGuid, lastSyncUsersAtUtc, lastKeepAliveAtUtc, meta: clientMeta } = req.body as {
        meta?: Record<string, unknown>;
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
        ...(clientMeta && typeof clientMeta === 'object' ? clientMeta : {}),
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

  router.post('/device/official-sessions/sync', requireDeviceToken(), async (req: OpsRequest, res: Response) => {
    if (!req.opsDevice) {
      res.status(401).json({ error: 'UNAUTHORIZED_DEVICE' });
      return;
    }

    if (!ensureRateLimit(`official-sync:${req.opsDevice.deviceId}`, 120, 60_000, res)) {
      return;
    }

    const body = req.body as {
      session?: {
        sessionGuid?: string;
        speakerName?: string;
        startedAtUtc?: string;
        endedAtUtc?: string | null;
        plannedSeconds?: number;
        elapsedSeconds?: number;
        finalStatus?: string;
        createdBy?: string | null;
      };
      auditLogs?: Array<{
        eventType?: string;
        eventAtUtc?: string;
        remainingSeconds?: number;
        elapsedSeconds?: number;
        details?: string | null;
      }>;
    };

    const session = body.session;
    if (!session?.sessionGuid || !session.startedAtUtc || !session.speakerName) {
      res.status(400).json({ error: 'INVALID_OFFICIAL_SESSION_PAYLOAD' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
          insert into public.official_sessions (
            session_guid,
            tenant_id,
            device_fk,
            speaker_name,
            started_at_utc,
            ended_at_utc,
            planned_seconds,
            elapsed_seconds,
            final_status,
            created_by,
            synced_at,
            created_at,
            updated_at
          )
          values ($1, $2::uuid, $3::uuid, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9, $10, now(), now(), now())
          on conflict (session_guid)
          do update set
            tenant_id = excluded.tenant_id,
            device_fk = excluded.device_fk,
            speaker_name = excluded.speaker_name,
            started_at_utc = excluded.started_at_utc,
            ended_at_utc = excluded.ended_at_utc,
            planned_seconds = excluded.planned_seconds,
            elapsed_seconds = excluded.elapsed_seconds,
            final_status = excluded.final_status,
            created_by = excluded.created_by,
            synced_at = now(),
            updated_at = now()
        `,
        [
          session.sessionGuid.trim(),
          req.opsDevice.tenantId,
          req.opsDevice.devicePk,
          session.speakerName.trim(),
          session.startedAtUtc,
          typeof session.endedAtUtc === 'string' && session.endedAtUtc.trim() ? session.endedAtUtc : null,
          Number.isFinite(session.plannedSeconds) ? Math.max(0, Math.trunc(session.plannedSeconds ?? 0)) : 0,
          Number.isFinite(session.elapsedSeconds) ? Math.max(0, Math.trunc(session.elapsedSeconds ?? 0)) : 0,
          typeof session.finalStatus === 'string' && session.finalStatus.trim() ? session.finalStatus.trim().toUpperCase() : 'FINISHED',
          typeof session.createdBy === 'string' && session.createdBy.trim() ? session.createdBy.trim() : null,
        ],
      );

      await client.query(
        `
          delete from public.official_session_audit_logs
          where tenant_id = $1::uuid
            and session_guid = $2
        `,
        [req.opsDevice.tenantId, session.sessionGuid.trim()],
      );

      const logs = Array.isArray(body.auditLogs) ? body.auditLogs : [];
      for (const log of logs) {
        if (!log?.eventType || !log.eventAtUtc) {
          continue;
        }

        await client.query(
          `
            insert into public.official_session_audit_logs (
              tenant_id,
              session_guid,
              event_type,
              event_at_utc,
              remaining_seconds,
              elapsed_seconds,
              details,
              created_at
            )
            values ($1::uuid, $2, $3, $4::timestamptz, $5, $6, $7, now())
          `,
          [
            req.opsDevice.tenantId,
            session.sessionGuid.trim(),
            log.eventType.trim().toUpperCase(),
            log.eventAtUtc,
            Number.isFinite(log.remainingSeconds) ? Math.max(0, Math.trunc(log.remainingSeconds ?? 0)) : 0,
            Number.isFinite(log.elapsedSeconds) ? Math.max(0, Math.trunc(log.elapsedSeconds ?? 0)) : 0,
            typeof log.details === 'string' && log.details.trim() ? log.details.trim() : null,
          ],
        );
      }

      await client.query('COMMIT');
      res.json({
        auditLogCount: Array.isArray(body.auditLogs) ? body.auditLogs.length : 0,
        ok: true,
        sessionGuid: session.sessionGuid.trim(),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('POST /v1/device/official-sessions/sync error:', error);
      res.status(500).json({ error: 'OFFICIAL_SESSION_SYNC_ERROR' });
    } finally {
      client.release();
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
          td.updated_at,
          latest_hb.meta->>'cpu_usage_percent' as cpu_usage_percent,
          latest_hb.meta->>'ram_used_mb' as ram_used_mb,
          latest_hb.meta->>'ram_total_mb' as ram_total_mb,
          latest_hb.meta->>'disk_c_free_percent' as disk_c_free_percent,
          latest_hb.meta->>'local_ip' as local_ip,
          latest_hb.meta->>'mac_address' as mac_address,
          latest_hb.meta->>'logged_in_user' as logged_in_user,
          (latest_hb.meta->>'uptime_seconds')::numeric as uptime_seconds
        from public.tenant_devices td
        left join public.tenants t on t.id = td.tenant_id
        left join lateral (
          select hb.meta 
          from public.device_heartbeats hb 
          where hb.device_fk = td.id 
          order by hb.heartbeat_at desc 
          limit 1
        ) latest_hb on true
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
          coalesce(t.type, 'empresa_ti') as type,
          t.license_key,
          nullif(coalesce(t.logo_url, ''), '') as logo_url,
          coalesce(t.portal_slug, t.subdomain) as portal_slug,
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
        group by t.id, t.name, t.type, t.license_key, t.logo_url, t.portal_slug, t.is_active, t.valid_until, t.subdomain
        order by t.name asc
      `);

      res.json({ tenants: rows.rows });
    } catch (error) {
      console.error('GET /v1/admin/tenants error:', error);
      res.status(500).json({ error: 'ADMIN_TENANTS_ERROR' });
    }
  });

  router.get('/admin/tenants/:id/detail', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const tenant = await getTenantAdminById((req.params.id ?? '').trim());
      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      const users = (await getTenantUsers(tenant.tenantId)).map(user => mapTenantUserWithAccess({
        tenant,
        user,
      }));
      const infrastructure = await getTenantInfrastructureProfile(tenant);
      const routingInfo = buildPortalRoutingInfo(tenant.portalSlug);

      res.json({
        infrastructure: infrastructure.profile,
        infrastructureIsDefault: infrastructure.isDefault,
        license: {
          isActive: tenant.isActive,
          licensedUsers: tenant.licensedUsers,
          tenantValidUntil: tenant.validUntil,
        },
        tenant: {
          ...tenant,
          portalUrl: routingInfo.portalUrl,
          redirectSource: routingInfo.redirectSource,
          redirectTarget: routingInfo.redirectTarget,
        },
        users,
      });
    } catch (error) {
      console.error('GET /v1/admin/tenants/:id/detail error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_DETAIL_ERROR' });
    }
  });

  router.post('/admin/tenants/:id/users', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const tenantId = String(req.params.id ?? '').trim();
      if (!tenantId) {
        res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
        return;
      }

      if (!isUuid(tenantId)) {
        res.status(400).json({ error: 'INVALID_TENANT_ID' });
        return;
      }

      const { email, password, display_name, is_admin, valid_until } = req.body as {
        email?: unknown;
        password?: unknown;
        display_name?: unknown;
        is_admin?: unknown;
        valid_until?: unknown;
      };

      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        res.status(400).json({ error: 'EMAIL_REQUIRED' });
        return;
      }

      const rawPassword = typeof password === 'string' ? password : '';
      if (!rawPassword || rawPassword.length < 8) {
        res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
        return;
      }

      const displayName = typeof display_name === 'string' && display_name.trim().length > 0
        ? display_name.trim()
        : normalizedEmail;
      const isAdmin = is_admin === true;
      const validUntil = parseIsoDateOrNull(valid_until);
      if (!validUntil.ok) {
        res.status(400).json({ error: validUntil.error });
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      const { data: tenant, error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .maybeSingle();

      if (tenantErr) {
        throw new Error(`Failed to check tenant: ${tenantErr.message}`);
      }

      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: rawPassword,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role: isAdmin ? 'admin' : 'user',
        },
      });

      if (authErr || !authData.user) {
        const message = authErr?.message ?? '';
        if (authErr?.status === 422 || /already/i.test(message)) {
          res.status(409).json({ error: 'USER_EMAIL_ALREADY_EXISTS' });
          return;
        }

        console.error('POST /v1/admin/tenants/:id/users createUser error:', authErr);
        res.status(500).json({ error: 'SUPABASE_AUTH_CREATE_USER_ERROR' });
        return;
      }

      const userId = authData.user.id;

      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        tenant_id: tenantId,
        email: normalizedEmail,
        display_name: displayName,
        is_admin: isAdmin,
        valid_until: validUntil.value,
      }, {
        onConflict: 'id',
      });

      if (profileErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to upsert profile: ${profileErr.message}`);
      }

      res.json({ ok: true, userId });
    } catch (error) {
      console.error('POST /v1/admin/tenants/:id/users error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_USER_CREATE_ERROR' });
    }
  });

  router.patch('/admin/tenants/:id/users/:userId', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const tenantId = String(req.params.id ?? '').trim();
      const userId = String(req.params.userId ?? '').trim();

      if (!tenantId || !userId) {
        res.status(400).json({ error: 'TENANT_USER_REQUIRED' });
        return;
      }

      if (!isUuid(tenantId)) {
        res.status(400).json({ error: 'INVALID_TENANT_ID' });
        return;
      }

      if (!isUuid(userId)) {
        res.status(400).json({ error: 'INVALID_USER_ID' });
        return;
      }

      const { display_name, is_admin, valid_until } = req.body as {
        display_name?: unknown;
        is_admin?: unknown;
        valid_until?: unknown;
      };

      const updates: Record<string, unknown> = {};
      if (display_name !== undefined) {
        updates.display_name = typeof display_name === 'string' ? display_name.trim() : '';
      }
      if (is_admin !== undefined) {
        updates.is_admin = is_admin === true;
      }
      if (valid_until !== undefined) {
        const parsed = parseIsoDateOrNull(valid_until);
        if (!parsed.ok) {
          res.status(400).json({ error: parsed.error });
          return;
        }

        updates.valid_until = parsed.value;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'NO_USER_FIELDS' });
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      const { data: existingProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        throw new Error(`Failed to load profile: ${profileErr.message}`);
      }

      if (!existingProfile) {
        res.status(404).json({ error: 'USER_NOT_FOUND' });
        return;
      }

      const profileTenantId = String((existingProfile as { tenant_id?: string | null }).tenant_id ?? '');
      if (profileTenantId !== tenantId) {
        res.status(403).json({ error: 'TENANT_MISMATCH' });
        return;
      }

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .eq('tenant_id', tenantId);

      if (updateErr) {
        throw new Error(`Failed to update profile: ${updateErr.message}`);
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('PATCH /v1/admin/tenants/:id/users/:userId error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_USER_UPDATE_ERROR' });
    }
  });

  router.post('/admin/tenants/:id/users/:userId/reset-password', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const tenantId = String(req.params.id ?? '').trim();
      const userId = String(req.params.userId ?? '').trim();

      if (!tenantId || !userId) {
        res.status(400).json({ error: 'TENANT_USER_REQUIRED' });
        return;
      }

      if (!isUuid(tenantId)) {
        res.status(400).json({ error: 'INVALID_TENANT_ID' });
        return;
      }

      if (!isUuid(userId)) {
        res.status(400).json({ error: 'INVALID_USER_ID' });
        return;
      }

      const { password } = req.body as { password?: unknown };
      const rawPassword = typeof password === 'string' ? password : '';

      if (!rawPassword || rawPassword.length < 8) {
        res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      const { data: existingProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        throw new Error(`Failed to load profile: ${profileErr.message}`);
      }

      if (!existingProfile) {
        res.status(404).json({ error: 'USER_NOT_FOUND' });
        return;
      }

      const profileTenantId = String((existingProfile as { tenant_id?: string | null }).tenant_id ?? '');
      if (profileTenantId !== tenantId) {
        res.status(403).json({ error: 'TENANT_MISMATCH' });
        return;
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: rawPassword,
      });

      if (resetErr) {
        console.error('POST /v1/admin/tenants/:id/users/:userId/reset-password updateUserById error:', resetErr);
        res.status(500).json({ error: 'SUPABASE_AUTH_RESET_PASSWORD_ERROR' });
        return;
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('POST /v1/admin/tenants/:id/users/:userId/reset-password error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_USER_RESET_PASSWORD_ERROR' });
    }
  });

  router.delete('/admin/tenants/:id/users/:userId', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const tenantId = String(req.params.id ?? '').trim();
      const userId = String(req.params.userId ?? '').trim();

      if (!tenantId || !userId) {
        res.status(400).json({ error: 'TENANT_USER_REQUIRED' });
        return;
      }

      if (!isUuid(tenantId)) {
        res.status(400).json({ error: 'INVALID_TENANT_ID' });
        return;
      }

      if (!isUuid(userId)) {
        res.status(400).json({ error: 'INVALID_USER_ID' });
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      const { data: existingProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        throw new Error(`Failed to load profile: ${profileErr.message}`);
      }

      if (!existingProfile) {
        res.status(404).json({ error: 'USER_NOT_FOUND' });
        return;
      }

      const profileTenantId = String((existingProfile as { tenant_id?: string | null }).tenant_id ?? '');
      if (profileTenantId !== tenantId) {
        res.status(403).json({ error: 'TENANT_MISMATCH' });
        return;
      }

      const { error: deleteProfileErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)
        .eq('tenant_id', tenantId);

      if (deleteProfileErr) {
        throw new Error(`Failed to delete profile: ${deleteProfileErr.message}`);
      }

      const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteAuthErr) {
        console.warn('DELETE /v1/admin/tenants/:id/users/:userId deleteUser warning:', deleteAuthErr);
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('DELETE /v1/admin/tenants/:id/users/:userId error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_USER_DELETE_ERROR' });
    }
  });

  router.patch('/admin/tenants/:id', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type, portal_slug, subdomain, is_active, valid_until, license_key, logo_url } = req.body as {
        name?: string;
        type?: string;
        portal_slug?: string;
        subdomain?: string;
        is_active?: boolean;
        valid_until?: string;
        license_key?: string;
        logo_url?: string;
      };
      const supabaseAdmin = getSupabaseAdminClient();

      const updates: Record<string, unknown> = {};
      if (name !== undefined) {
        updates.name = String(name).trim();
      }
      if (type !== undefined) {
        updates.type = String(type).trim() || 'empresa_ti';
      }
      if (portal_slug !== undefined) {
        const normalizedPortalSlug = sanitizeTenantSubdomain(portal_slug);
        if (String(portal_slug).trim().length > 0 && !normalizedPortalSlug) {
          res.status(400).json({ error: 'INVALID_PORTAL_SLUG' });
          return;
        }

        updates.portal_slug = normalizedPortalSlug;
      }
      if (subdomain !== undefined) {
        const normalizedSubdomain = sanitizeTenantSubdomain(subdomain);
        if (String(subdomain).trim().length > 0 && !normalizedSubdomain) {
          res.status(400).json({ error: 'INVALID_SUBDOMAIN' });
          return;
        }

        updates.subdomain = normalizedSubdomain;
      }
      if (is_active !== undefined) {
        updates.is_active = is_active;
      }
      if (valid_until !== undefined) {
        updates.valid_until = valid_until || null;
      }
      if (license_key !== undefined) {
        updates.license_key = String(license_key).trim() || null;
      }
      if (logo_url !== undefined) {
        updates.logo_url = String(logo_url).trim() || null;
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

  router.post('/admin/tenants', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const { name, type, portal_slug, is_active, valid_until, license_key, logo_url } = req.body as {
        name?: string;
        type?: string;
        portal_slug?: string;
        is_active?: boolean;
        valid_until?: string;
        license_key?: string;
        logo_url?: string;
      };

      const normalizedName = String(name ?? '').trim();
      if (!normalizedName) {
        res.status(400).json({ error: 'TENANT_NAME_REQUIRED' });
        return;
      }

      const normalizedPortalSlug = sanitizeTenantSubdomain(String(portal_slug ?? ''));
      if (String(portal_slug ?? '').trim().length > 0 && !normalizedPortalSlug) {
        res.status(400).json({ error: 'INVALID_PORTAL_SLUG' });
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .insert({
          is_active: is_active ?? true,
          license_key: String(license_key ?? '').trim() || crypto.randomUUID().toUpperCase(),
          logo_url: String(logo_url ?? '').trim() || null,
          name: normalizedName,
          portal_slug: normalizedPortalSlug || null,
          type: String(type ?? '').trim() || 'empresa_ti',
          valid_until: String(valid_until ?? '').trim() || null,
        })
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(`Failed to create tenant: ${error?.message}`);
      }

      res.json({ ok: true, tenantId: data.id });
    } catch (error) {
      console.error('POST /v1/admin/tenants error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_CREATE_ERROR' });
    }
  });

  router.patch('/admin/tenants/:id/infrastructure', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const tenant = await getTenantAdminById((req.params.id ?? '').trim());
      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      const profile = sanitizeTenantInfrastructureProfile((req.body as { profile?: unknown }).profile);

      await db.execute(sql`
        insert into public.tenant_infra_profiles (
          tenant_id,
          profile,
          created_at,
          updated_at
        )
        values (
          ${tenant.tenantId}::uuid,
          ${JSON.stringify(profile)}::jsonb,
          now(),
          now()
        )
        on conflict (tenant_id)
        do update set
          profile = excluded.profile,
          updated_at = now()
      `);

      res.json({
        ok: true,
        profile,
      });
    } catch (error) {
      console.error('PATCH /v1/admin/tenants/:id/infrastructure error:', error);
      res.status(500).json({ error: 'ADMIN_TENANT_INFRA_UPDATE_ERROR' });
    }
  });

  router.post('/admin/tenants/provision', requireAdminToken(options.config), async (req: Request, res: Response) => {
    try {
      const { name, portal_slug, subdomain, tenantType, adminEmail, adminPassword, logo_url } = req.body;

      if (!name || !adminEmail || !adminPassword) {
        res.status(400).json({ error: 'Missing required provision fields' });
        return;
      }

      const normalizedPortalSlug = sanitizeTenantSubdomain(portal_slug ?? subdomain);
      if ((typeof portal_slug === 'string' && portal_slug.trim().length > 0 && !normalizedPortalSlug)
        || (typeof subdomain === 'string' && subdomain.trim().length > 0 && !normalizedPortalSlug)) {
        res.status(400).json({ error: 'INVALID_SUBDOMAIN' });
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();

      const licenseKey = crypto.randomUUID().toUpperCase();
      const { data: tenant, error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: name.trim(),
          license_key: licenseKey,
          is_active: true,
          portal_slug: normalizedPortalSlug,
          subdomain: normalizedPortalSlug,
          logo_url: typeof logo_url === 'string' && logo_url.trim().length > 0 ? logo_url.trim() : null,
          type: tenantType || 'empresa_ti',
        })
        .select('id')
        .single();

      if (tenantErr || !tenant) {
        throw new Error(`Failed to create tenant: ${tenantErr?.message}`);
      }

      const tenantId = tenant.id;

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
        await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
        throw new Error(`Failed to create admin user: ${authErr.message}`);
      }

      const userId = authData.user.id;
      const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        tenant_id: tenantId,
        email: adminEmail.trim(),
        display_name: adminEmail.trim(),
        is_admin: true,
        valid_until: null,
      }, {
        onConflict: 'id',
      });

      if (profileErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
        throw new Error(`Failed to upsert admin profile: ${profileErr.message}`);
      }

      const routingInfo = buildPortalRoutingInfo(normalizedPortalSlug);

      res.json({
        ok: true,
        tenantId,
        userId,
        portalSlug: normalizedPortalSlug,
        subdomain: normalizedPortalSlug,
        portalUrl: routingInfo.portalUrl,
        redirectSource: routingInfo.redirectSource,
        redirectTarget: routingInfo.redirectTarget,
        cloudflareStatus: routingInfo.cloudflareStatus,
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
  router.get('/portal/:slug/reports', async (req: Request, res: Response) => {
    try {
      const slug = (req.params.slug ?? '').trim().toLowerCase();
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      const accessToken = parseBearerToken(req);
      if (!accessToken) {
        res.status(401).json({ error: 'MISSING_SUPABASE_TOKEN' });
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

      if (!profile.isAdmin) {
        res.status(403).json({ error: 'ADMIN_REQUIRED' });
        return;
      }

      const tenant = await getPortalTenantBySlug(slug);
      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      if (tenant.tenantId !== profile.tenantId) {
        res.status(403).json({ error: 'TENANT_MISMATCH' });
        return;
      }

      const tenantUsers = (await getTenantUsers(tenant.tenantId)).map(user => mapTenantUserWithAccess({
        tenant,
        user,
      }));
      const infrastructure = await getTenantInfrastructureProfile({
        name: tenant.name,
        subdomain: tenant.subdomain,
        tenantId: tenant.tenantId,
        type: tenant.type,
      });

      const statsResult = await db.execute(sql`
        select
          count(1)::int as total_devices,
          count(case when td.last_seen_at >= now() - interval '15 minutes' then 1 end)::int as online_devices,
          max(td.last_seen_at) as last_seen_at,
          (
            select count(1)::int
            from public.device_backups b
            where b.tenant_id = ${tenant.tenantId}::uuid
              and b.status = 'UPLOADED'
              and b.created_at >= now() - interval '24 hours'
          ) as uploaded_backups_24h,
          (
            select count(1)::int
            from public.device_backups b
            where b.tenant_id = ${tenant.tenantId}::uuid
              and b.status = 'FAILED'
              and b.created_at >= now() - interval '24 hours'
          ) as failed_backups_24h,
          (
            select max(b.created_at)
            from public.device_backups b
            where b.tenant_id = ${tenant.tenantId}::uuid
          ) as last_backup_at
        from public.tenant_devices td
        where td.tenant_id = ${tenant.tenantId}::uuid
          and td.revoked_at is null
      `);

      const statsRow = (statsResult.rows[0] ?? {}) as {
        total_devices?: number | string;
        online_devices?: number | string;
        last_seen_at?: Date | string | null;
        uploaded_backups_24h?: number | string;
        failed_backups_24h?: number | string;
        last_backup_at?: Date | string | null;
      };

      const devices = await db
        .select({
          id: tenantDevices.id,
          deviceId: tenantDevices.deviceId,
          deviceName: tenantDevices.deviceName,
          appVersion: tenantDevices.appVersion,
          lastSeenAt: tenantDevices.lastSeenAt,
          lastStatus: tenantDevices.lastStatus,
        })
        .from(tenantDevices)
        .where(and(eq(tenantDevices.tenantId, tenant.tenantId), isNull(tenantDevices.revokedAt)))
        .orderBy(desc(tenantDevices.lastSeenAt))
        .limit(50);

      const backups = await db
        .select({
          id: deviceBackups.id,
          fileName: deviceBackups.fileName,
          backupType: deviceBackups.backupType,
          status: deviceBackups.status,
          sizeBytes: deviceBackups.sizeBytes,
          createdAt: deviceBackups.createdAt,
          completedAt: deviceBackups.completedAt,
          errorMessage: deviceBackups.errorMessage,
        })
        .from(deviceBackups)
        .where(eq(deviceBackups.tenantId, tenant.tenantId))
        .orderBy(desc(deviceBackups.createdAt))
        .limit(25);

      const alerts = await db
        .select({
          id: opsAlerts.id,
          alertType: opsAlerts.alertType,
          delivered: opsAlerts.delivered,
          createdAt: opsAlerts.createdAt,
          sentAt: opsAlerts.sentAt,
        })
        .from(opsAlerts)
        .where(eq(opsAlerts.tenantId, tenant.tenantId))
        .orderBy(desc(opsAlerts.createdAt))
        .limit(25);

      const totalDevices = toNumber(statsRow.total_devices);
      const onlineDevices = toNumber(statsRow.online_devices);
      const onlineThreshold = Date.now() - 15 * 60 * 1000;

      res.json({
        tenant: {
          ...tenant,
          isOnline: tenant.onlineDevices > 0,
        },
        profile: {
          email: profile.email,
          displayName: profile.displayName,
          isAdmin: profile.isAdmin,
          validUntil: profile.userValidUntil,
        },
        infrastructure: infrastructure.profile,
        infrastructureIsDefault: infrastructure.isDefault,
        license: {
          accessStatus: resolveUserAccessStatus({
            tenantIsActive: tenant.isActive,
            tenantValidUntil: tenant.validUntil,
            userValidUntil: profile.userValidUntil,
          }),
          licensedUsers: tenant.licensedUsers,
          tenantIsActive: tenant.isActive,
          tenantValidUntil: tenant.validUntil,
          userValidUntil: profile.userValidUntil,
        },
        stats: {
          totalDevices,
          onlineDevices,
          offlineDevices: Math.max(totalDevices - onlineDevices, 0),
          uploadedBackups24h: toNumber(statsRow.uploaded_backups_24h),
          failedBackups24h: toNumber(statsRow.failed_backups_24h),
          lastSeenAt: toIsoString(statsRow.last_seen_at),
          lastBackupAt: toIsoString(statsRow.last_backup_at),
        },
        devices: devices.map(device => ({
          id: device.id,
          deviceId: device.deviceId,
          deviceName: device.deviceName ?? device.deviceId,
          appVersion: device.appVersion ?? '',
          lastSeenAt: toIsoString(device.lastSeenAt),
          lastStatus: device.lastStatus ?? '',
          isOnline: device.lastSeenAt ? device.lastSeenAt.getTime() >= onlineThreshold : false,
        })),
        backups: backups.map(backup => ({
          id: backup.id,
          fileName: backup.fileName,
          backupType: backup.backupType,
          status: backup.status,
          sizeBytes: backup.sizeBytes,
          createdAt: backup.createdAt.toISOString(),
          completedAt: toIsoString(backup.completedAt),
          errorMessage: backup.errorMessage,
        })),
        alerts: alerts.map(alert => ({
          id: alert.id,
          alertType: alert.alertType,
          delivered: alert.delivered,
          createdAt: alert.createdAt.toISOString(),
          sentAt: toIsoString(alert.sentAt),
        })),
        users: tenantUsers,
      });
    } catch (error) {
      console.error('GET /v1/portal/:slug/reports error:', error);
      res.status(500).json({ error: 'PORTAL_REPORTS_ERROR' });
    }
  });

  router.get('/portal/:slug', async (req: Request, res: Response) => {
    try {
      const slug = (req.params.slug ?? '').trim().toLowerCase();
      if (!slug) {
        res.status(400).json({ error: 'SLUG_REQUIRED' });
        return;
      }

      const tenant = await getPortalTenantBySlug(slug);
      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      res.json({
        tenantId: tenant.tenantId,
        name: tenant.name,
        type: tenant.type,
        subdomain: tenant.subdomain,
        isActive: tenant.isActive,
        isOnline: tenant.onlineDevices > 0,
        deviceCount: tenant.deviceCount,
        onlineDevices: tenant.onlineDevices,
        lastSeenAt: tenant.lastSeenAt,
        lastBackupAt: tenant.lastBackupAt,
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
