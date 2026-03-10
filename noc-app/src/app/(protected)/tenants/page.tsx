import { AlertCircle, Building2 } from 'lucide-react';
import Link from 'next/link';
import { CadastrarTenant } from '@/components/CadastrarTenant';
import { EditTenantModal } from '@/components/EditTenantModal';
import { formatDate, formatDateTime } from '@/lib/format';
import { getTenants } from '@/lib/ops-api';
import { getPortalAbsoluteUrl } from '@/lib/portalRouting';

export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  let tenants = [] as Awaited<ReturnType<typeof getTenants>>;
  let error: string | null = null;

  try {
    tenants = await getTenants();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar tenants';
  }

  return (
    <section>
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              alignItems: 'center',
              color: 'var(--text-primary)',
              display: 'flex',
              fontSize: '1.75rem',
              fontWeight: 700,
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <Building2 size={26} color="var(--accent-primary)" />
            Tenants e licencas
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Controle de tenants, links canonicos do portal e status operacional.
          </p>
        </div>
        <CadastrarTenant />
      </div>

      {error
        ? (
            <div
              className="card"
              style={{
                alignItems: 'center',
                backgroundColor: '#fef2f2',
                borderColor: '#fca5a5',
                color: '#991b1b',
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '2rem',
              }}
            >
              <AlertCircle size={20} />
              {error}
            </div>
          )
        : null}

      <div className="table-wrapper">
        <table className="base-table" style={{ minWidth: 1020 }}>
          <thead>
            <tr>
              {[
                'Tenant',
                'Tipo',
                'Licenca',
                'Portal canonico',
                'Slug',
                'Situacao',
                'Validade',
                'Dispositivos',
                'Online',
                'Ultimo heartbeat',
                'Ultimo backup',
                'Acoes',
              ].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(tenants) ? tenants : []).map((tenant) => {
              const portalSlug = tenant.portal_slug ?? tenant.subdomain ?? null;
              const portalUrl = portalSlug
                ? getPortalAbsoluteUrl({ slug: portalSlug })
                : null;
              const reportsUrl = portalSlug
                ? getPortalAbsoluteUrl({ slug: portalSlug, path: '/relatorios' })
                : null;

              return (
                <tr key={tenant.id}>
                  <td style={{ fontWeight: 600 }}>{tenant.name}</td>
                  <td>
                    <span className="badge badge-neutral">
                      {tenant.type === 'camara' ? 'CAMARA' : 'EMPRESA TI'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'Consolas, monospace', fontSize: '0.75rem' }}>
                    {tenant.license_key}
                  </td>
                  <td>
                    {portalUrl
                      ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <a
                              href={portalUrl}
                              rel="noreferrer"
                              style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', textDecoration: 'none' }}
                              target="_blank"
                            >
                              Abrir portal
                            </a>
                            <a
                              href={reportsUrl ?? portalUrl}
                              rel="noreferrer"
                              style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textDecoration: 'none' }}
                              target="_blank"
                            >
                              Abrir relatorios
                            </a>
                          </div>
                        )
                      : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            -- sem portal --
                          </span>
                        )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.75rem' }}>
                    {portalSlug || '--'}
                  </td>
                  <td>
                    <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-error'}`}>
                      {tenant.is_active ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td>{formatDate(tenant.valid_until)}</td>
                  <td style={{ fontWeight: 600 }}>{tenant.total_devices}</td>
                  <td>
                    {tenant.online_devices > 0
                      ? (
                          <span className="badge badge-success" style={{ padding: '0.15rem 0.5rem' }}>
                            {tenant.online_devices}
                          </span>
                        )
                      : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {formatDateTime(tenant.last_seen_at)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {formatDateTime(tenant.last_backup_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <Link
                        href={`/tenants/${tenant.id}`}
                        style={{
                          color: 'var(--accent-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Gerenciar tenant
                      </Link>
                      <EditTenantModal tenant={tenant} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {!error && tenants.length === 0
              ? (
                  <tr>
                    <td colSpan={12} style={{ color: 'var(--text-muted)', padding: '3rem', textAlign: 'center' }}>
                      Nenhum tenant encontrado.
                    </td>
                  </tr>
                )
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
