'use server';

import { revalidatePath } from 'next/cache';

function getApiBaseUrl(): string {
  const base = process.env.OPS_API_URL ?? process.env.NEXT_PUBLIC_NOC_API_URL ?? '';
  return base.trim().replace(/\/$/, '');
}

function getAdminToken(): string {
  return (process.env.OPS_ADMIN_SERVICE_TOKEN ?? '').trim();
}

export async function provisionTenantAction(formData: FormData) {
  const name = formData.get('name') as string;
  const cnpj = formData.get('cnpj') as string;
  const subdomain = formData.get('subdomain') as string;
  const tenantType = formData.get('tenantType') as string;
  const adminEmail = formData.get('adminEmail') as string;
  const adminPassword = formData.get('adminPassword') as string;

  if (!name || !adminEmail || !adminPassword) {
    return { error: 'Preencha todos os campos obrigatórios.' };
  }

  const baseUrl = getApiBaseUrl();
  const token = getAdminToken();

  if (!baseUrl || !token) {
    return { error: 'Configuração de API NOC ausente no servidor.' };
  }

  try {
    const payload = {
      name,
      cnpj: cnpj || undefined,
      subdomain: subdomain ? subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '') : undefined,
      tenantType: tenantType || 'empresa_ti',
      adminEmail,
      adminPassword,
    };

    const response = await fetch(`${baseUrl}/v1/admin/tenants/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    // Success! Revalidate the tenants page to show the new one
    revalidatePath('/tenants');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro de conexão com API NOC' };
  }
}
