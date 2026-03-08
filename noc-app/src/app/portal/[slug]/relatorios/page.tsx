import { notFound } from 'next/navigation';
import { PortalReportsContent } from '@/components/PortalReportsContent';
import { getPortalTenantSummary, PortalApiError } from '@/lib/portalApi';
import { readPortalSession } from '@/lib/portalSession';

export default async function PortalReportsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  let tenant: Awaited<ReturnType<typeof getPortalTenantSummary>> = null;
  let apiError: string | null = null;

  try {
    tenant = await getPortalTenantSummary(slug);
  } catch (error) {
    if (error instanceof PortalApiError) {
      apiError = error.message;
    } else {
      apiError = 'Falha ao carregar o tenant.';
    }
  }

  if (!tenant && !apiError) {
    notFound();
  }

  if (!tenant) {
    return (
      <main
        style={{
          alignItems: 'center',
          background: '#0b1121',
          color: '#fff',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: '24px',
            maxWidth: '560px',
            padding: '2rem',
            width: '100%',
          }}
        >
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
            Portal indisponivel
          </h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1rem' }}>
            Nao foi possivel validar este tenant no momento.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{apiError}</p>
        </div>
      </main>
    );
  }

  const portalSession = await readPortalSession();

  return (
    <PortalReportsContent
      hasSession={portalSession?.tenantSlug === slug}
      slug={slug}
      tenantName={tenant.name}
    />
  );
}
