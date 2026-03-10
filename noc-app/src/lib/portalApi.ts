import { Env } from '@/lib/Env';

export type PortalTenantSummary = {
  adminUsers: number;
  tenantId: string;
  name: string;
  logoUrl: string | null;
  portalSlug: string;
  type: string;
  subdomain: string | null;
  isActive: boolean;
  isOnline: boolean;
  deviceCount: number;
  onlineDevices: number;
  lastSeenAt: string | null;
  lastBackupAt: string | null;
  lastReportSyncAt: string | null;
  licensedUsers: number;
  userCount: number;
  validUntil: string | null;
};

export type PortalOverviewResponse = {
  profile: {
    displayName: string;
    email: string;
    isAdmin: boolean;
    tenantId: string;
    tenantLogoUrl: string | null;
    tenantName: string;
    tenantPortalSlug: string;
    tenantValidUntil: string | null;
    userId: string;
    userValidUntil: string | null;
  };
  recentSessions: PortalSessionRow[];
  tenant: PortalTenantSummary;
};

export type PortalSessionRow = {
  createdBy: string;
  elapsedSeconds: number;
  endedAtUtc: string | null;
  finalStatus: string;
  plannedSeconds: number;
  sessionGuid: string;
  speakerName: string;
  startedAtUtc: string | null;
  syncedAt: string | null;
};

export type PortalSpeakerUsageRow = {
  averageElapsedSeconds: number;
  speakerName: string;
  totalElapsedSeconds: number;
  totalSessions: number;
};

export type PortalAuditLogRow = {
  details: string;
  elapsedSeconds: number;
  eventAtUtc: string | null;
  eventType: string;
  id: number;
  remainingSeconds: number;
};

export type PortalAuditLogsResponse = {
  logs: PortalAuditLogRow[];
  session: PortalSessionRow;
};

export type PortalTenantInfrastructureAsset = {
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

export type PortalTenantInfrastructureDoc = {
  label: string;
  url: string;
};

export type PortalTenantInfrastructure = {
  assets: PortalTenantInfrastructureAsset[];
  docs: PortalTenantInfrastructureDoc[];
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

export type PortalReportsResponse = {
  infrastructure: PortalTenantInfrastructure;
  infrastructureIsDefault: boolean;
  license: {
    accessStatus: 'active' | 'tenant_expired' | 'tenant_inactive' | 'user_expired';
    licensedUsers: number;
    tenantIsActive: boolean;
    tenantValidUntil: string | null;
    userValidUntil: string | null;
  };
  tenant: PortalTenantSummary;
  profile: {
    email: string;
    displayName: string;
    isAdmin: boolean;
    validUntil: string | null;
  };
  stats: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    uploadedBackups24h: number;
    failedBackups24h: number;
    lastSeenAt: string | null;
    lastBackupAt: string | null;
  };
  devices: Array<{
    id: string;
    deviceId: string;
    deviceName: string;
    appVersion: string;
    lastSeenAt: string | null;
    lastStatus: string;
    isOnline: boolean;
  }>;
  backups: Array<{
    id: string;
    fileName: string;
    backupType: string;
    status: string;
    sizeBytes: number | null;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
  alerts: Array<{
    id: number;
    alertType: string;
    delivered: boolean;
    createdAt: string;
    sentAt: string | null;
  }>;
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

export class PortalApiError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
  }
}

async function parseApiError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error || `Ops API error (${response.status})`;
}

/**
 * Fetches public tenant summary data for the customer portal.
 * @param slug - Tenant slug or mapped subdomain.
 * @returns Tenant summary or null when the tenant is not found.
 */
export async function getPortalTenantSummary(slug: string) {
  const response = await fetch(`${Env.opsApiBaseUrl}/v1/portal/${slug}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new PortalApiError(await parseApiError(response), response.status);
  }

  return (await response.json()) as PortalTenantSummary;
}

/**
 * Fetches the authenticated portal overview for the current tenant.
 * @param props - Authenticated request options.
 * @param props.accessToken - Supabase access token.
 * @param props.slug - Tenant portal slug.
 * @returns Portal overview payload.
 */
export async function getPortalOverview(props: {
  accessToken: string;
  slug: string;
}) {
  const response = await fetch(`${Env.opsApiBaseUrl}/v1/portal/tenants/${props.slug}/overview`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${props.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PortalApiError(await parseApiError(response), response.status);
  }

  return (await response.json()) as PortalOverviewResponse;
}

/**
 * Fetches official sessions for the authenticated tenant portal.
 * @param props - Request options.
 * @param props.accessToken - Supabase access token.
 * @param props.from - Optional local date filter start.
 * @param props.limit - Optional result limit.
 * @param props.slug - Tenant portal slug.
 * @param props.status - Optional session status filter.
 * @param props.to - Optional local date filter end.
 * @returns Session rows ordered by newest first.
 */
export async function getPortalSessions(props: {
  accessToken: string;
  from?: string | null;
  limit?: number;
  slug: string;
  status?: string | null;
  to?: string | null;
}) {
  const params = new URLSearchParams();
  if (props.from) {
    params.set('from', props.from);
  }
  if (props.to) {
    params.set('to', props.to);
  }
  if (props.status) {
    params.set('status', props.status);
  }
  if (props.limit) {
    params.set('limit', String(props.limit));
  }

  const query = params.toString();
  const response = await fetch(`${Env.opsApiBaseUrl}/v1/portal/tenants/${props.slug}/sessions${query ? `?${query}` : ''}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${props.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PortalApiError(await parseApiError(response), response.status);
  }

  const payload = (await response.json()) as { sessions: PortalSessionRow[] };
  return payload.sessions ?? [];
}

/**
 * Fetches aggregated usage per speaker for the authenticated tenant portal.
 * @param props - Request options.
 * @param props.accessToken - Supabase access token.
 * @param props.from - Optional local date filter start.
 * @param props.slug - Tenant portal slug.
 * @param props.to - Optional local date filter end.
 * @returns Aggregated rows by speaker.
 */
export async function getPortalSpeakerUsage(props: {
  accessToken: string;
  from?: string | null;
  slug: string;
  to?: string | null;
}) {
  const params = new URLSearchParams();
  if (props.from) {
    params.set('from', props.from);
  }
  if (props.to) {
    params.set('to', props.to);
  }

  const query = params.toString();
  const response = await fetch(`${Env.opsApiBaseUrl}/v1/portal/tenants/${props.slug}/speaker-usage${query ? `?${query}` : ''}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${props.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PortalApiError(await parseApiError(response), response.status);
  }

  const payload = (await response.json()) as { speakers: PortalSpeakerUsageRow[] };
  return payload.speakers ?? [];
}

/**
 * Fetches audit logs for a specific official session.
 * @param props - Request options.
 * @param props.accessToken - Supabase access token.
 * @param props.sessionGuid - Official session guid.
 * @param props.slug - Tenant portal slug.
 * @returns Session detail with audit logs.
 */
export async function getPortalAuditLogs(props: {
  accessToken: string;
  sessionGuid: string;
  slug: string;
}) {
  const response = await fetch(`${Env.opsApiBaseUrl}/v1/portal/tenants/${props.slug}/sessions/${props.sessionGuid}/audit-logs`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${props.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PortalApiError(await parseApiError(response), response.status);
  }

  return (await response.json()) as PortalAuditLogsResponse;
}

/**
 * Fetches authenticated tenant report data for the customer portal.
 * @param props - Authenticated request options.
 * @param props.accessToken - Supabase access token.
 * @param props.slug - Tenant slug or mapped subdomain.
 * @returns Tenant report payload.
 */
export async function getPortalReports(props: {
  accessToken: string;
  slug: string;
}) {
  const response = await fetch(`${Env.opsApiBaseUrl}/v1/portal/${props.slug}/reports`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${props.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PortalApiError(await parseApiError(response), response.status);
  }

  return (await response.json()) as PortalReportsResponse;
}
