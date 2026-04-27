import { AlertCircle, DatabaseBackup } from 'lucide-react';
import { formatBytes, formatDateTime } from '@/lib/format';
import { getBackups } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

function isSuccessStatus(status: string) {
  return status === 'UPLOADED' || status === 'COMPLETED';
}

export default async function BackupsPage() {
  let backups = [] as Awaited<ReturnType<typeof getBackups>>;
  let error: string | null = null;

  try {
    backups = await getBackups(500);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar backups';
  }

  const successCount = backups.filter(backup => isSuccessStatus(backup.status)).length;
  const failedCount = backups.filter(backup => backup.status === 'FAILED').length;
  const pendingCount = backups.filter(backup => !isSuccessStatus(backup.status) && backup.status !== 'FAILED').length;
  const tenantsCovered = new Set(backups.map(backup => backup.tenant_id)).size;

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">Retencao e historico</span>
          <h1 className="page-hero__title">
            <DatabaseBackup size={28} color="var(--accent-primary)" />
            Trilhas de backup por tenant
          </h1>
          <p className="page-hero__description">
            Historico central de upload, falha e finalizacao dos backups. A leitura aqui continua cronologica, mas com hierarquia visual melhor para identificar volume, excecao e cobertura entre empresas.
          </p>
        </div>
      </div>

      {error
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertCircle size={20} />
              {error}
            </div>
          )
        : null}

      {!error && backups.length > 0
        ? (
            <div className="summary-strip">
              <div className="summary-card">
                <span className="summary-card__label">Eventos listados</span>
                <strong className="summary-card__value">{backups.length}</strong>
                <div className="summary-card__meta">Ultimos registros retornados pela API.</div>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Concluidos</span>
                <strong className="summary-card__value">{successCount}</strong>
                <div className="summary-card__meta">
                  {failedCount}
                  {' falhos e '}
                  {pendingCount}
                  {' pendentes.'}
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Empresas cobertas</span>
                <strong className="summary-card__value">{tenantsCovered}</strong>
                <div className="summary-card__meta">Tenants com atividade recente no storage.</div>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Ultima falha</span>
                <strong className="summary-card__value">
                  {formatDateTime(backups.find(backup => backup.status === 'FAILED')?.created_at ?? null)}
                </strong>
                <div className="summary-card__meta">Referencia visual rapida para troubleshooting.</div>
              </div>
            </div>
          )
        : null}

      <div className="table-wrapper">
        <table className="base-table" style={{ minWidth: 1280 }}>
          <thead>
            <tr>
              {[
                'Criado em',
                'Empresa',
                'Dispositivo',
                'Tipo',
                'Sessao',
                'Arquivo',
                'Peso',
                'Status',
                'Concluido em',
                'Erro',
              ].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(backups) ? backups : []).map((backup) => {
              const badgeClass = isSuccessStatus(backup.status)
                ? 'badge-success'
                : backup.status === 'FAILED'
                  ? 'badge-error'
                  : 'badge-warning';

              return (
                <tr key={backup.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{formatDateTime(backup.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>{backup.tenant_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{backup.device_name || backup.device_id}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {backup.backup_type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'Consolas, monospace', fontSize: '0.75rem' }}>{backup.session_guid || '--'}</td>
                  <td style={{ color: 'var(--accent-primary)', fontSize: '0.84rem' }}>{backup.file_name}</td>
                  <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>{formatBytes(backup.size_bytes)}</td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{backup.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{formatDateTime(backup.completed_at)}</td>
                  <td
                    style={{
                      color: backup.error_message ? '#b91c1c' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={backup.error_message || ''}
                  >
                    {backup.error_message || '--'}
                  </td>
                </tr>
              );
            })}

            {!error && backups.length === 0
              ? (
                  <tr>
                    <td colSpan={10} style={{ color: 'var(--text-muted)', padding: '3rem', textAlign: 'center' }}>
                      Nenhum backup registrado no storage ate o momento.
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
