import { AlertCircle, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, DatabaseBackup } from 'lucide-react';
import Link from 'next/link';
import { formatBytes, formatDateTime } from '@/lib/format';
import { getBackups } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

function isSuccessStatus(status: string) {
  return status === 'UPLOADED' || status === 'COMPLETED';
}

function getBackupTone(status: string) {
  const normalized = status.trim().toUpperCase();

  if (normalized === 'FAILED') {
    return {
      badgeClass: 'badge-error',
      label: 'Falhou',
    };
  }

  if (isSuccessStatus(normalized)) {
    return {
      badgeClass: 'badge-success',
      label: 'Concluído',
    };
  }

  return {
    badgeClass: 'badge-warning',
    label: 'Pendente',
  };
}

function groupBackupsByTenant(backups: Awaited<ReturnType<typeof getBackups>>) {
  const groups = new Map<string, {
    backups: Awaited<ReturnType<typeof getBackups>>;
    failed: number;
    lastBackupAt: string | null;
    pending: number;
    successful: number;
    tenantId: string;
    tenantName: string;
  }>();

  for (const backup of backups) {
    const current = groups.get(backup.tenant_id) ?? {
      backups: [],
      failed: 0,
      lastBackupAt: null,
      pending: 0,
      successful: 0,
      tenantId: backup.tenant_id,
      tenantName: backup.tenant_name,
    };
    const normalized = backup.status.trim().toUpperCase();

    current.backups.push(backup);
    current.lastBackupAt = current.lastBackupAt && current.lastBackupAt > backup.created_at
      ? current.lastBackupAt
      : backup.created_at;

    if (normalized === 'FAILED') {
      current.failed += 1;
    } else if (isSuccessStatus(normalized)) {
      current.successful += 1;
    } else {
      current.pending += 1;
    }

    groups.set(backup.tenant_id, current);
  }

  return [...groups.values()].sort((left, right) => {
    if (right.failed !== left.failed) {
      return right.failed - left.failed;
    }

    if (right.pending !== left.pending) {
      return right.pending - left.pending;
    }

    return (right.lastBackupAt ?? '').localeCompare(left.lastBackupAt ?? '');
  });
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
  const tenantGroups = groupBackupsByTenant(backups);
  const tenantsWithAttention = tenantGroups.filter(group => group.failed > 0 || group.pending > 0);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">Retenção e histórico</span>
          <h1 className="page-hero__title">
            <DatabaseBackup size={28} color="var(--accent-primary)" />
            Backups por empresa
          </h1>
          <p className="page-hero__description">
            A leitura principal agora é por tenant: falhas, pendências, última execução e histórico recente ficam
            separados por empresa antes da tabela cronológica.
          </p>
        </div>

        <div className="status-strip">
          <span className="status-chip status-chip--critical">
            {failedCount}
            {' falhas'}
          </span>
          <span className="status-chip status-chip--warning">
            {pendingCount}
            {' pendentes'}
          </span>
          <span className="status-chip status-chip--success">
            {successCount}
            {' concluídos'}
          </span>
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

      <div className="summary-strip">
        <article className="summary-card">
          <span className="summary-card__label">Eventos listados</span>
          <strong className="summary-card__value">{backups.length}</strong>
          <div className="summary-card__meta">Últimos registros retornados pela API.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Empresas cobertas</span>
          <strong className="summary-card__value">{tenantGroups.length}</strong>
          <div className="summary-card__meta">Tenants com atividade recente de backup.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Com atenção</span>
          <strong className="summary-card__value">{tenantsWithAttention.length}</strong>
          <div className="summary-card__meta">Empresas com falha ou pendência.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Última falha</span>
          <strong className="summary-card__value">
            {formatDateTime(backups.find(backup => backup.status === 'FAILED')?.created_at ?? null)}
          </strong>
          <div className="summary-card__meta">Referência rápida para troubleshooting.</div>
        </article>
      </div>

      {!error && backups.length === 0
        ? (
            <div className="empty-state">
              Nenhum backup registrado no storage até o momento.
            </div>
          )
        : null}

      {tenantGroups.length > 0
        ? (
            <section className="backup-tenant-grid">
              {tenantGroups.map((group) => {
                const latest = group.backups[0];
                const hasAttention = group.failed > 0 || group.pending > 0;

                return (
                  <article className={hasAttention ? 'backup-tenant-card backup-tenant-card--attention' : 'backup-tenant-card'} key={group.tenantId}>
                    <div className="backup-tenant-card__header">
                      <div>
                        <div className="page-hero__eyebrow">Empresa</div>
                        <strong>{group.tenantName}</strong>
                      </div>
                      <span className={`badge ${hasAttention ? 'badge-warning' : 'badge-success'}`}>
                        {hasAttention ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        {hasAttention ? 'Atenção' : 'Estável'}
                      </span>
                    </div>

                    <div className="backup-tenant-card__metrics">
                      <div>
                        <span>Falhas</span>
                        <strong>{group.failed}</strong>
                      </div>
                      <div>
                        <span>Pendentes</span>
                        <strong>{group.pending}</strong>
                      </div>
                      <div>
                        <span>Concluídos</span>
                        <strong>{group.successful}</strong>
                      </div>
                    </div>

                    <div className="ops-compact-list">
                      <div className="ops-compact-list__row">
                        <span>Último backup</span>
                        <strong>{formatDateTime(group.lastBackupAt)}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Último arquivo</span>
                        <strong>{latest?.file_name ?? '--'}</strong>
                      </div>
                    </div>

                    <div className="backup-tenant-card__footer">
                      <Link className="inline-link" href={`/tenants/${group.tenantId}?tab=backups`}>
                        Abrir backups da empresa
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </section>
          )
        : null}

      {backups.length > 0
        ? (
            <section className="card ops-section-card">
              <div className="ops-section-card__header">
                <div>
                  <div className="page-hero__eyebrow">Histórico bruto</div>
                  <h2 className="ops-section-card__title">Últimos eventos de backup</h2>
                </div>
                <Clock3 size={20} color="var(--accent-primary)" />
              </div>

              <div className="table-wrapper">
                <table className="base-table base-table--compact">
                  <thead>
                    <tr>
                      {['Criado em', 'Empresa', 'Dispositivo', 'Arquivo', 'Peso', 'Status', 'Erro'].map(header => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backups.slice(0, 120).map((backup) => {
                      const tone = getBackupTone(backup.status);

                      return (
                        <tr key={backup.id}>
                          <td>{formatDateTime(backup.created_at)}</td>
                          <td>
                            <strong>{backup.tenant_name}</strong>
                          </td>
                          <td>{backup.device_name || backup.device_id}</td>
                          <td className="ops-mono-text">{backup.file_name}</td>
                          <td>{formatBytes(backup.size_bytes)}</td>
                          <td>
                            <span className={`badge ${tone.badgeClass}`}>{tone.label}</span>
                          </td>
                          <td className={backup.error_message ? 'table-error-cell' : undefined}>
                            {backup.error_message || '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )
        : null}
    </section>
  );
}
