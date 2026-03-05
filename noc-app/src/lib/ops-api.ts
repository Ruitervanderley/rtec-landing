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
  license_key: string;
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

export async function getOverview(): Promise<OpsOverview> {
  return fetchAdmin<OpsOverview>('/admin/overview');
}

export async function getTenants(): Promise<TenantRow[]> {
  const response = await fetchAdmin<{ tenants: TenantRow[] }>('/admin/tenants');
  return response.tenants ?? [];
}

export async function getDevices(limit = 300): Promise<DeviceRow[]> {
  const response = await fetchAdmin<{ devices: DeviceRow[] }>(`/admin/devices?limit=${limit}`);
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
