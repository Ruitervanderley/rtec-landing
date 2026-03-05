import { AlertCircle, Building2 } from 'lucide-react';
import { CadastrarTenant } from '@/components/CadastrarTenant';
import { EditTenantModal } from '@/components/EditTenantModal';
import { formatDate, formatDateTime } from '@/lib/format';
import { getTenants } from '@/lib/ops-api';

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
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={26} color="var(--accent-primary)" />
            Tenants e Licenças
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Status de contratos, faturamento de licenças e capacidade ativa de notebooks legislativos.</p>
        </div>
        <CadastrarTenant />
      </div>

      {error
        ? (
            <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )
        : null}

      <div className="table-wrapper">
        <table className="base-table" style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              {[
                'Tenant',
                'Licença',
                'Portal',
                'Situação',
                'Validade',
                'Notebooks',
                'Online',
                'Último Heartbeat',
                'Último Backup',
                'Ações',
              ].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(tenants) ? tenants : []).map(tenant => (
              <tr key={tenant.id}>
                <td style={{ fontWeight: 600 }}>{tenant.name}</td>
                <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tenant.license_key}</td>
                <td>
                  {tenant.subdomain
                    ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <a
                            href={`https://${tenant.subdomain}.rtectecnologia.com.br/`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}
                          >
                            {tenant.subdomain}
                            .rtectecnologia.com.br
                          </a>
                          <a
                            href={`https://${tenant.subdomain}.rtectecnologia.com.br/relatorios`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                          >
                            Relatórios
                          </a>
                        </div>
                      )
                    : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          — sem portal —
                        </span>
                      )}
                </td>
                <td>
                  <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-error'}`}>
                    {tenant.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td>{formatDate(tenant.valid_until)}</td>
                <td style={{ fontWeight: 500 }}>{tenant.total_devices}</td>
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
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(tenant.last_seen_at)}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(tenant.last_backup_at)}</td>
                <td>
                  <EditTenantModal tenant={tenant} />
                </td>
              </tr>
            ))}
            {!error && tenants.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum Tenant encontrado no banco de dados ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
