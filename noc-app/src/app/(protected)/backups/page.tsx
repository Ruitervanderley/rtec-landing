import { AlertCircle, DatabaseBackup } from 'lucide-react';
import { formatBytes, formatDateTime } from '@/lib/format';
import { getBackups } from '@/lib/ops-api';

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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DatabaseBackup size={26} color="var(--accent-primary)" />
          Storage Central de Backups
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Log de transferências automáticas e versionamento pós-sessão do LegislativoTimer.</p>
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
        <table className="base-table" style={{ minWidth: 1320 }}>
          <thead>
            <tr>
              {['Data/Hora Criação', 'Tenant', 'Dispositivo', 'Tipo', 'ID Sessão', 'Arquivo', 'Peso', 'Status', 'Hora Fim', 'Log de Erro'].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(backups) ? backups : []).map(backup => (
              <tr key={backup.id}>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(backup.created_at)}</td>
                <td style={{ fontWeight: 600 }}>{backup.tenant_name}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{backup.device_name || backup.device_id}</td>
                <td>
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                    {backup.backup_type}
                  </span>
                </td>
                <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{backup.session_guid || '--'}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{backup.file_name}</td>
                <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>{formatBytes(backup.size_bytes)}</td>
                <td>
                  <span className={`badge ${backup.status === 'COMPLETED' ? 'badge-success' : backup.status === 'FAILED' ? 'badge-error' : 'badge-warning'}`}>
                    {backup.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(backup.completed_at)}</td>
                <td style={{ color: backup.error_message ? '#dc2626' : 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={backup.error_message || ''}>
                  {backup.error_message || '--'}
                </td>
              </tr>
            ))}
            {!error && backups.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum Backup registrado no storage até o momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
