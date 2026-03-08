'use server';

import { redirect } from 'next/navigation';
import { getPortalReports, getPortalTenantSummary, PortalApiError } from '@/lib/portalApi';
import { getPortalPath } from '@/lib/portalRouting';
import {
  clearPortalSession,
  createPortalSessionFromPassword,
  PortalSessionError,
  writePortalSession,
} from '@/lib/portalSession';

export type PortalLoginActionState = {
  error: string | null;
};

export async function loginPortalAction(
  _previousState: PortalLoginActionState,
  formData: FormData,
): Promise<PortalLoginActionState> {
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!slug || !email || !password) {
    return { error: 'Preencha email e senha.' };
  }

  await clearPortalSession();

  try {
    const tenant = await getPortalTenantSummary(slug);
    if (!tenant) {
      return { error: 'Portal nao encontrado.' };
    }

    const portalSession = await createPortalSessionFromPassword({
      email,
      password,
      tenantId: tenant.tenantId,
      tenantSlug: slug,
    });

    await getPortalReports({
      accessToken: portalSession.accessToken,
      slug,
    });

    await writePortalSession(portalSession);
  } catch (error) {
    await clearPortalSession();

    if (error instanceof PortalSessionError) {
      if (error.status === 400 || error.status === 401) {
        return { error: 'Credenciais invalidas.' };
      }

      return { error: 'Falha ao autenticar no Supabase.' };
    }

    if (error instanceof PortalApiError) {
      if (error.status === 403) {
        return { error: 'Seu usuario nao tem acesso a este portal.' };
      }

      if (error.status === 404) {
        return { error: 'Portal nao encontrado.' };
      }

      return { error: 'Falha ao validar o acesso do tenant.' };
    }

    return { error: 'Falha ao autenticar no portal.' };
  }

  redirect(getPortalPath({ slug, path: '/relatorios' }));
}

export async function logoutPortalAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  await clearPortalSession();
  redirect(getPortalPath({ slug, path: '' }));
}
