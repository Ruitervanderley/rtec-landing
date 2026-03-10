import { Lock } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PortalReportsLoginForm } from '@/components/PortalReportsLoginForm';
import { getPortalTenantSummary, PortalApiError } from '@/lib/portalApi';
import { getPortalPath } from '@/lib/portalRouting';
import { getPortalSession } from '@/lib/portalSession';

type PortalLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    slug?: string;
  }>;
};

export default async function PortalLoginPage(props: PortalLoginPageProps) {
  const searchParams = await props.searchParams;
  const slug = String(searchParams.slug ?? '').trim().toLowerCase();
  const errorMessage = String(searchParams.error ?? '').trim();

  if (!slug) {
    redirect('/');
  }

  const session = await getPortalSession({ tenantSlug: slug });
  if (session) {
    redirect(getPortalPath({ slug, path: '/relatorios' }));
  }

  let tenantName = slug;

  try {
    const tenant = await getPortalTenantSummary(slug);
    if (!tenant) {
      redirect(getPortalPath({ slug }));
    }

    tenantName = tenant.name;
  } catch (error) {
    if (error instanceof PortalApiError && error.status === 404) {
      redirect(getPortalPath({ slug }));
    }
  }

  return (
    <main style={{ alignItems: 'center', background: '#0b1121', color: '#fff', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(148, 163, 184, 0.14)', borderRadius: '24px', maxWidth: '460px', padding: '2rem', width: '100%' }}>
        <div style={{ alignItems: 'center', background: 'rgba(77, 184, 255, 0.12)', borderRadius: '16px', display: 'inline-flex', height: '56px', justifyContent: 'center', marginBottom: '1.25rem', width: '56px' }}>
          <Lock color="#4db8ff" size={28} />
        </div>
        <p style={{ color: '#4db8ff', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Portal autenticado</p>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 900, margin: '0 0 0.75rem' }}>
          Relatorios de
          {' '}
          {tenantName}
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
          Entre com o mesmo email e senha cadastrados no Supabase para este tenant.
        </p>
        {errorMessage
          ? <div style={{ border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.9rem 1rem' }}>{errorMessage}</div>
          : null}
        <PortalReportsLoginForm slug={slug} />
      </div>
    </main>
  );
}
