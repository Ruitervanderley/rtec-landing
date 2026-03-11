import 'server-only';

export type OpsOverview = {
  counts: {
    totalTenants: number;
    totalDevices: number;
    onlineDevices: number;
    failedBackups24h: number;
    uploadedBackups24h: number;
  };
  jobs: {
    startedAtUtc: string;
    lastOfflineScanAtUtc: string | null;
    lastOfflineCandidates: number;
    lastRetentionRunAtUtc: string | null;
    lastRetentionDeletedCount: number;
    lastError: string | null;
  };
  lastAlertAtUtc: string | null;
};

export type TenantRow = {
  id: string;
  name: string;
  type: string;
  license_key: string;
  logo_url?: string | null;
  portal_slug: string | null;
  is_active: boolean;
  valid_until: string | null;
  subdomain?: string | null;
  total_devices: number;
  online_devices: number;
  last_seen_at: string | null;
  last_backup_at: string | null;
};

export type DeviceRow = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  device_id: string;
  device_name: string;
  app_version: string;
  last_seen_at: string | null;
  last_status: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  cpu_usage_percent?: string;
  ram_used_mb?: string;
  ram_total_mb?: string;
  disk_c_free_percent?: string;
  local_ip?: string;
  mac_address?: string;
  logged_in_user?: string;
  uptime_seconds?: number | string;
};

export type BackupRow = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  device_fk: string;
  device_id: string;
  device_name: string;
  backup_type: string;
  session_guid: string | null;
  object_key: string;
  file_name: string;
  size_bytes: number | null;
  sha256: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type TenantInfrastructureAsset = {
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

export type TenantInfrastructureDoc = {
  label: string;
  url: string;
};

export type TenantInfrastructureProfile = {
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

export type TenantDetail = {
  infrastructure: TenantInfrastructureProfile;
  infrastructureIsDefault: boolean;
  license: {
    isActive: boolean;
    licensedUsers: number;
    tenantValidUntil: string | null;
  };
  tenant: {
    adminUsers: number;
    deviceCount: number;
    isActive: boolean;
    lastBackupAt: string | null;
    lastSeenAt: string | null;
    licenseKey: string;
    licensedUsers: number;
    name: string;
    onlineDevices: number;
    portalUrl: string | null;
    portalSlug: string | null;
    redirectSource: string | null;
    redirectTarget: string | null;
    subdomain: string | null;
    tenantId: string;
    type: string;
    userCount: number;
    validUntil: string | null;
  };
  users: Array<{
    accessStatus: 'active' | 'tenant_expired' | 'tenant_inactive' | 'user_expired';
    displayName: string;
    email: string;
    isAdmin: boolean;
    isBlocked: boolean;
    userId: string;
    validUntil: string | null;
  }>;
};

function getApiBaseUrl(): string {
  const base = process.env.OPS_API_URL ?? process.env.NEXT_PUBLIC_NOC_API_URL ?? '';
  return base.trim().replace(/\/$/, '');
}

function getAdminToken(): string {
  return (process.env.OPS_ADMIN_SERVICE_TOKEN ?? '').trim();
}

async function fetchAdmin<T>(path: string): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('OPS_API_URL not configured');
  }

  const token = getAdminToken();
  if (!token) {
    throw new Error('OPS_ADMIN_SERVICE_TOKEN not configured');
  }

  const response = await fetch(`${baseUrl}/v1${path}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ops API ${path} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function postAdmin<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('OPS_API_URL not configured');
  }

  const token = getAdminToken();
  if (!token) {
    throw new Error('OPS_ADMIN_SERVICE_TOKEN not configured');
  }

  const response = await fetch(`${baseUrl}/v1${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Ops API POST ${path} failed (${response.status}): ${raw}`);
  }

  return (await response.json()) as T;
}

async function patchAdmin<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('OPS_API_URL not configured');
  }

  const token = getAdminToken();
  if (!token) {
    throw new Error('OPS_ADMIN_SERVICE_TOKEN not configured');
  }

  const response = await fetch(`${baseUrl}/v1${path}`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Ops API PATCH ${path} failed (${response.status}): ${raw}`);
  }

  return (await response.json()) as T;
}

export async function getOverview(): Promise<OpsOverview> {
  return fetchAdmin<OpsOverview>('/admin/overview');
}

export async function getTenants(): Promise<TenantRow[]> {
  const response = await fetchAdmin<{ tenants: TenantRow[] }>('/admin/tenants');
  return response.tenants ?? [];
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail> {
  return fetchAdmin<TenantDetail>(`/admin/tenants/${tenantId}/detail`);
}

export async function getDevices(limit = 300, tenantId?: string): Promise<DeviceRow[]> {
  const url = tenantId
    ? `/admin/devices?limit=${limit}&tenantId=${tenantId}`
    : `/admin/devices?limit=${limit}`;
  const response = await fetchAdmin<{ devices: DeviceRow[] }>(url);
  return response.devices ?? [];
}

export async function getBackups(limit = 300): Promise<BackupRow[]> {
  const response = await fetchAdmin<{ backups: BackupRow[] }>(`/admin/backups?limit=${limit}`);
  return response.backups ?? [];
}

export async function revokeDevice(devicePk: string): Promise<void> {
  if (!devicePk) {
    throw new Error('devicePk is required');
  }

  await postAdmin<{ ok: boolean }>(`/admin/devices/${devicePk}/revoke`, {});
}

export async function createTenant(props: {
  isActive?: boolean;
  licenseKey?: string;
  logoUrl?: string | null;
  name: string;
  portalSlug?: string | null;
  type?: string;
  validUntil?: string | null;
}) {
  return postAdmin<{ ok: boolean; tenantId: string }>('/admin/tenants', {
    is_active: props.isActive ?? true,
    license_key: props.licenseKey ?? '',
    logo_url: props.logoUrl ?? null,
    name: props.name,
    portal_slug: props.portalSlug ?? '',
    type: props.type ?? 'empresa_ti',
    valid_until: props.validUntil ?? null,
  });
}

export async function updateTenant(props: {
  id: string;
  isActive?: boolean;
  licenseKey?: string;
  logoUrl?: string | null;
  name?: string;
  portalSlug?: string | null;
  subdomain?: string | null;
  type?: string;
  validUntil?: string | null;
}) {
  return patchAdmin<{ ok: boolean }>(`/admin/tenants/${props.id}`, {
    is_active: props.isActive,
    license_key: props.licenseKey,
    logo_url: props.logoUrl,
    name: props.name,
    portal_slug: props.portalSlug,
    subdomain: props.subdomain,
    type: props.type,
    valid_until: props.validUntil,
  });
}
