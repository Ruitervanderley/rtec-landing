'use server';

import { revalidatePath } from 'next/cache';
import { Env } from '@/lib/Env';

type ActionError = {
  error: string;
};

export async function createTenantUserAction(formData: FormData): Promise<ActionError | { success: true; userId: string }> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const isAdmin = formData.get('is_admin') === 'true';
  const validUntil = String(formData.get('valid_until') ?? '').trim();

  if (!tenantId || !email || !password) {
    return { error: 'Preencha tenant, e-mail e senha.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({
        email,
        password,
        display_name: displayName || undefined,
        is_admin: isAdmin,
        valid_until: validUntil || null,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    const payload = (await response.json()) as { ok?: boolean; userId?: string };

    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);

    return { success: true, userId: String(payload.userId ?? '') };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro de conexao com API NOC' };
  }
}

export async function updateTenantUserAction(formData: FormData): Promise<ActionError | { success: true }> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const userId = String(formData.get('user_id') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const isAdmin = formData.get('is_admin') === 'true';
  const validUntil = String(formData.get('valid_until') ?? '').trim();

  if (!tenantId || !userId) {
    return { error: 'Tenant e usuario sao obrigatorios.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${tenantId}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({
        display_name: displayName,
        is_admin: isAdmin,
        valid_until: validUntil || null,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro de conexao com API NOC' };
  }
}

export async function resetTenantUserPasswordAction(formData: FormData): Promise<ActionError | { success: true }> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const userId = String(formData.get('user_id') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!tenantId || !userId || !password) {
    return { error: 'Tenant, usuario e senha sao obrigatorios.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${tenantId}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Env.opsAdminServiceToken}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath(`/tenants/${tenantId}`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro de conexao com API NOC' };
  }
}

export async function deleteTenantUserAction(formData: FormData): Promise<ActionError | { success: true }> {
  const tenantId = String(formData.get('tenant_id') ?? '').trim();
  const userId = String(formData.get('user_id') ?? '').trim();

  if (!tenantId || !userId) {
    return { error: 'Tenant e usuario sao obrigatorios.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/v1/admin/tenants/${tenantId}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${Env.opsAdminServiceToken}`,
      },
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath('/tenants');
    revalidatePath(`/tenants/${tenantId}`);

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro de conexao com API NOC' };
  }
}
