'use server';

import type { DeviceCommandType, TenantAgentProvisionResult } from '@/lib/ops-api';
import { revalidatePath } from 'next/cache';
import { Env } from '@/lib/Env';

export type ProvisionTenantSuccess = {
  cloudflareStatus: 'manual_redirect_required' | 'not_applicable';
  portalUrl: string | null;
  portalSlug: string | null;
  redirectSource: string | null;
  redirectTarget: string | null;
  subdomain: string | null;
  success: true;
  tenantId: string;
  userId: string;
};

type ActionError = {
  error: string;
};

function sanitizeSubdomain(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return normalized;
}

export async function provisionTenantAction(formData: FormData): Promise<ActionError | ProvisionTenantSuccess> {
  const name = String(formData.get('name') ?? '').trim();
  const cnpj = String(formData.get('cnpj') ?? '').trim();
  const portalSlug = sanitizeSubdomain(String(formData.get('portal_slug') ?? formData.get('subdomain') ?? ''));
  const tenantType = String(formData.get('tenantType') ?? '').trim();
  const adminEmail = String(formData.get('adminEmail') ?? '').trim();
  const adminPassword = String(formData.get('adminPassword') ?? '');

  if (!name || !adminEmail || !adminPassword) {
    return { error: 'Preencha todos os campos obrigatorios.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({
        adminEmail,
        adminPassword,
        cnpj: cnpj || undefined,
        name,
        portal_slug: portalSlug || undefined,
        tenantType: tenantType || 'empresa_ti',
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    const payload = (await response.json()) as ProvisionTenantSuccess;
    revalidatePath('/tenants');
    return payload;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro de conexao com API NOC',
    };
  }
}

export async function updateTenantAction(formData: FormData): Promise<ActionError | { success: true }> {
  const id = String(formData.get('id') ?? '').trim();
  const portalSlug = sanitizeSubdomain(String(formData.get('portal_slug') ?? formData.get('subdomain') ?? ''));
  const isActive = formData.get('is_active') === 'true';
  const validUntil = String(formData.get('valid_until') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const licenseKey = String(formData.get('license_key') ?? '').trim();
  const logoUrl = String(formData.get('logo_url') ?? '').trim();

  if (!id) {
    return { error: 'ID do tenant e obrigatorio.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({
        is_active: isActive,
        license_key: licenseKey || '',
        logo_url: logoUrl || '',
        name: name || undefined,
        portal_slug: portalSlug || '',
        subdomain: portalSlug || '',
        type: type || undefined,
        valid_until: validUntil || '',
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath('/tenants');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro de conexao com API NOC',
    };
  }
}

export async function updateTenantInfrastructureAction(formData: FormData): Promise<ActionError | { success: true }> {
  const id = String(formData.get('id') ?? '').trim();
  const profileRaw = String(formData.get('profile') ?? '').trim();

  if (!id) {
    return { error: 'ID do tenant e obrigatorio.' };
  }

  if (!profileRaw) {
    return { error: 'Perfil de infraestrutura vazio.' };
  }

  try {
    const profile = JSON.parse(profileRaw) as Record<string, unknown>;

    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${id}/infrastructure`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({ profile }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath('/tenants');
    revalidatePath(`/tenants/${id}`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro ao salvar infraestrutura do tenant',
    };
  }
}

export async function provisionTenantAgentAction(formData: FormData): Promise<ActionError | TenantAgentProvisionResult> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const deviceId = String(formData.get('device_id') ?? '').trim();
  const deviceName = String(formData.get('device_name') ?? '').trim();
  const appVersion = String(formData.get('app_version') ?? '').trim();

  if (!tenantId) {
    return { error: 'Tenant e obrigatorio.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${tenantId}/agent/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({
        app_version: appVersion || undefined,
        device_id: deviceId || undefined,
        device_name: deviceName || undefined,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    const payload = (await response.json()) as TenantAgentProvisionResult;
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath('/devices');
    return payload;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro de conexao com API NOC',
    };
  }
}

export async function rotateTenantAgentTokenAction(formData: FormData): Promise<ActionError | TenantAgentProvisionResult> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const devicePk = String(formData.get('device_pk') ?? '').trim();

  if (!tenantId || !devicePk) {
    return { error: 'Tenant e dispositivo sao obrigatorios.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/devices/${devicePk}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Env.opsAdminServiceToken}`,
      },
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    const payload = (await response.json()) as TenantAgentProvisionResult;
    revalidatePath('/devices');
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);
    return payload;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro de conexao com API NOC',
    };
  }
}

export async function revokeTenantAgentAction(formData: FormData): Promise<ActionError | { success: true }> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const devicePk = String(formData.get('device_pk') ?? '').trim();

  if (!tenantId || !devicePk) {
    return { error: 'Tenant e dispositivo sao obrigatorios.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/devices/${devicePk}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Env.opsAdminServiceToken}`,
      },
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath('/devices');
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro de conexao com API NOC',
    };
  }
}

export async function queueDeviceCommandAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const devicePk = String(formData.get('device_pk') ?? '').trim();
  const commandType = String(formData.get('command_type') ?? '').trim().toUpperCase() as DeviceCommandType;
  const allowedCommands: DeviceCommandType[] = ['FORCE_HEARTBEAT', 'APPLY_DESKTOP_INFO', 'COLLECT_DIAGNOSTIC'];

  if (!tenantId || !devicePk) {
    throw new Error('Tenant e dispositivo são obrigatórios.');
  }

  if (!allowedCommands.includes(commandType)) {
    throw new Error('Comando inválido.');
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/devices/${devicePk}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({
        command_type: commandType,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Falha na API: ${response.status}`);
    }

    revalidatePath('/devices');
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath(`/tenants/${tenantId}/devices/${devicePk}`);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Erro ao enfileirar comando do agente');
  }
}
