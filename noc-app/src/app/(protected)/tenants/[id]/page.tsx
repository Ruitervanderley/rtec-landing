import { AlertCircle, ArrowLeft, ExternalLink, Network, Server, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TenantInfrastructureEditor } from '@/components/TenantInfrastructureEditor';
import { TenantUsersManager } from '@/components/TenantUsersManager';
import { formatDate, formatDateTime } from '@/lib/format';
import { getTenantDetail } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let detail: Awaited<ReturnType<typeof getTenantDetail>> | null = null;
  let errorMsg: string | null = null;

  try {
    detail = await getTenantDetail(id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      notFound();
    }

    errorMsg = error instanceof Error ? error.message : 'Erro ao carregar tenant';
  }

  if (!detail && !errorMsg) {
    notFound();
  }

  if (!detail) {
    return (
      <section className="card" style={{ color: '#991b1b' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          {errorMsg}
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/tenants" style={{ alignItems: 'center', color: 'var(--text-secondary)', display: 'inline-flex', gap: '0.4rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            Voltar para tenants
          </Link>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
            {detail.tenant.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Tenant do tipo
            {' '}
            {detail.tenant.type}
            {' '}
            com inventario tecnico, licenca e usuarios.
          </p>
        </div>

        {detail.tenant.portalUrl
          ? (
              <a
                href={detail.tenant.portalUrl}
                rel="noreferrer"
                style={{ alignItems: 'center', color: 'var(--accent-primary)', display: 'inline-flex', fontWeight: 700, gap: '0.45rem', textDecoration: 'none' }}
                target="_blank"
              >
                Abrir portal canonico
                <ExternalLink size={16} />
              </a>
            )
          : null}
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <div style={{ alignItems: 'center', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={16} />
            Licenca
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800 }}>
            {detail.license.isActive ? 'Ativa' : 'Inativa'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Vence em
            {' '}
            {formatDate(detail.license.tenantValidUntil)}
          </div>
        </div>

        <div className="card">
          <div style={{ alignItems: 'center', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={16} />
            Usuarios
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800 }}>
            {detail.tenant.userCount}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            {detail.tenant.adminUsers}
            {' '}
            admin(s) /
            {detail.tenant.licensedUsers}
            {' '}
            com licenca valida
          </div>
        </div>

        <div className="card">
          <div style={{ alignItems: 'center', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Server size={16} />
            Dispositivos
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800 }}>
            {detail.tenant.onlineDevices}
            {' '}
            online
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            {detail.tenant.deviceCount}
            {' '}
            total / ultimo heartbeat
            {formatDateTime(detail.tenant.lastSeenAt)}
          </div>
        </div>

        <div className="card">
          <div style={{ alignItems: 'center', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Network size={16} />
            Roteamento
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800 }}>
            {detail.tenant.portalSlug || detail.tenant.subdomain || '--'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Portal:
            {' '}
            {detail.tenant.portalUrl || '--'}
          </div>
        </div>
      </div>

      <TenantUsersManager tenantId={detail.tenant.tenantId} users={detail.users} />

      <TenantInfrastructureEditor
        infrastructure={detail.infrastructure}
        infrastructureIsDefault={detail.infrastructureIsDefault}
        tenantId={detail.tenant.tenantId}
        tenantName={detail.tenant.name}
        tenantType={detail.tenant.type}
      />
    </section>
  );
}
