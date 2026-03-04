import { getBackups } from '@/lib/ops-api';
import { formatBytes, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function BackupsPage() {
  let backups = [] as Awaited<ReturnType<typeof getBackups>>;
  let error: string | null = null;

  try {
    backups = await getBackups(500);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar backups';
  }

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 6 }}>Backups centrais</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Backups automaticos (pos-sessao e diario) enviados para o storage central.
      </p>

      {error ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: 12, borderRadius: 10 }}>
          {error}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1320 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Criado', 'Tenant', 'Dispositivo', 'Tipo', 'Sessao', 'Arquivo', 'Tamanho', 'Status', 'Finalizado', 'Erro'].map((header) => (
                <th key={header} style={{ textAlign: 'left', fontSize: 12, color: '#334155', padding: '0.65rem 0.75rem', borderBottom: '1px solid #dbe2ea' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(backups) ? backups : []).map((backup) => (
              <tr key={backup.id} style={{ background: backup.status === 'FAILED' ? '#fff1f2' : '#f8fafc' }}>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDateTime(backup.created_at)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{backup.tenant_name}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{backup.device_name || backup.device_id}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{backup.backup_type}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontFamily: 'Consolas, monospace', fontSize: 12 }}>{backup.session_guid || '--'}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{backup.file_name}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatBytes(backup.size_bytes)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{backup.status}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDateTime(backup.completed_at)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', color: '#9f1239' }}>{backup.error_message || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
