import { getTenants } from '@/lib/ops-api';
import { formatDate, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

function getRowBg(isActive: boolean) {
  return isActive ? '#f8fafc' : '#fff1f2';
}

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
      <h1 style={{ marginTop: 0, marginBottom: 6 }}>Tenants e licencas</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Situacao de contrato/licenca e quantidade de notebooks por tenant.
      </p>

      {error ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: 12, borderRadius: 10 }}>
          {error}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Tenant', 'Licenca', 'Status', 'Validade', 'Dispositivos', 'Online', 'Ultimo heartbeat', 'Ultimo backup'].map((header) => (
                <th key={header} style={{ textAlign: 'left', fontSize: 12, color: '#334155', padding: '0.65rem 0.75rem', borderBottom: '1px solid #dbe2ea' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(tenants) ? tenants : []).map((tenant) => (
              <tr key={tenant.id} style={{ background: getRowBg(tenant.is_active) }}>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{tenant.name}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontFamily: 'Consolas, monospace', fontSize: 12 }}>{tenant.license_key}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{tenant.is_active ? 'Ativo' : 'Inativo'}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDate(tenant.valid_until)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{tenant.total_devices}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{tenant.online_devices}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDateTime(tenant.last_seen_at)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDateTime(tenant.last_backup_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
