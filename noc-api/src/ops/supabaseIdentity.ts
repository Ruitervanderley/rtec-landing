import type { OpsConfig } from './config.js';
import { pool } from '../db/index.js';

export type SupabaseIdentity = {
  userId: string;
  email: string;
};

export type ProfileAccessInfo = {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  userValidUntil: string | null;
  tenantName: string;
  tenantPortalSlug: string;
  tenantLogoUrl: string | null;
  tenantIsActive: boolean;
  tenantValidUntil: string | null;
};

export async function getSupabaseIdentity(accessToken: string, config: OpsConfig): Promise<SupabaseIdentity | null> {
  if (!accessToken || !config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: string; email?: string };
  if (!payload.id || !payload.email) {
    return null;
  }

  return {
    userId: payload.id,
    email: payload.email,
  };
}

export async function getProfileAccessInfo(userId: string): Promise<ProfileAccessInfo | null> {
  const query = `
    select
      p.id::text as user_id,
      p.tenant_id::text as tenant_id,
      coalesce(p.email, '') as email,
      coalesce(p.display_name, '') as display_name,
      coalesce(p.is_admin, false) as is_admin,
      p.valid_until::text as user_valid_until,
      coalesce(t.name, '') as tenant_name,
      coalesce(t.portal_slug, t.subdomain, '') as tenant_portal_slug,
      nullif(coalesce(t.logo_url, ''), '') as tenant_logo_url,
      coalesce(t.is_active, false) as tenant_is_active,
      t.valid_until::text as tenant_valid_until
    from public.profiles p
    left join public.tenants t on t.id = p.tenant_id
    where p.id = $1::uuid
    limit 1;
  `;

  const { rows } = await pool.query(query, [userId]);
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as {
    user_id: string;
    tenant_id: string;
    email: string;
    display_name: string;
    is_admin: boolean;
    user_valid_until: string | null;
    tenant_name: string;
    tenant_portal_slug: string;
    tenant_logo_url: string | null;
    tenant_is_active: boolean;
    tenant_valid_until: string | null;
  };

  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    userValidUntil: row.user_valid_until,
    tenantName: row.tenant_name,
    tenantPortalSlug: row.tenant_portal_slug,
    tenantLogoUrl: row.tenant_logo_url,
    tenantIsActive: row.tenant_is_active,
    tenantValidUntil: row.tenant_valid_until,
  };
}

export function isAccessAllowed(profile: ProfileAccessInfo): { canAccess: boolean; reason: string } {
  if (!profile.tenantId) {
    return { canAccess: false, reason: 'TENANT_NOT_FOUND' };
  }
  if (!profile.tenantIsActive) {
    return { canAccess: false, reason: 'TENANT_INACTIVE' };
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  if (profile.tenantValidUntil && profile.tenantValidUntil < todayIso) {
    return { canAccess: false, reason: 'TENANT_EXPIRED' };
  }

  if (profile.userValidUntil && profile.userValidUntil < todayIso) {
    return { canAccess: false, reason: 'USER_EXPIRED' };
  }

  return { canAccess: true, reason: 'OK' };
}
