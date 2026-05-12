'use client';

import type { BackupRow } from '@/lib/ops-api';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, DatabaseBackup, HardDriveDownload } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';

type TenantBackupWorkspaceProps = {
  backups: BackupRow[];
  tenantId: string;
  tenantName: string;
};

function getBackupTone(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'FAILED') {
    return {
      badgeClass: 'badge-error',
      icon: AlertTriangle,
      label: 'Falhou',
    };
  }

  if (normalized === 'UPLOADED' || normalized === 'COMPLETED') {
    return {
      badgeClass: 'badge-success',
      icon: CheckCircle2,
      label: 'Concluido',
    };
  }

  return {
    badgeClass: 'badge-warning',
    icon: Clock3,
    label: 'Pendente',
  };
}

export function TenantBackupWorkspace(props: TenantBackupWorkspaceProps) {
  const failedBackups = props.backups.filter(backup => backup.status.trim().toUpperCase() === 'FAILED');
  const completedBackups = props.backups.filter((backup) => {
    const normalized = backup.status.trim().toUpperCase();
    return normalized === 'UPLOADED' || normalized === 'COMPLETED';
  });
  const pendingBackups = props.backups.filter((backup) => {
    const normalized = backup.status.trim().toUpperCase();
    return normalized !== 'UPLOADED' && normalized !== 'COMPLETED' && normalized !== 'FAILED';
  });

  return (
    <section className="page-stack">
      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Cobertura e retenção</div>
            <h2 className="ops-section-card__title">Backups da empresa</h2>
          </div>
          <Link className="inline-link" href="/backups">
            Abrir histórico global
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <p className="ops-copy-muted">
          Aqui você acompanha apenas os backups de
          {' '}
          <strong>{props.tenantName}</strong>
          , com foco em falhas, cobertura recente e dispositivo de origem.
        </p>

        <div className="summary-strip">
          <div className="summary-card">
            <span className="summary-card__label">Total no recorte</span>
            <strong className="summary-card__value">{props.backups.length}</strong>
            <div className="summary-card__meta">Histórico recente retornado para esta empresa.</div>
          </div>
          <div className="summary-card">
            <span className="summary-card__label">Falhas</span>
            <strong className="summary-card__value">{failedBackups.length}</strong>
            <div className="summary-card__meta">Backups que precisam de intervenção.</div>
          </div>
          <div className="summary-card">
            <span className="summary-card__label">Concluídos</span>
            <strong className="summary-card__value">{completedBackups.length}</strong>
            <div className="summary-card__meta">Uploads finalizados com sucesso.</div>
          </div>
          <div className="summary-card">
            <span className="summary-card__label">Pendentes</span>
            <strong className="summary-card__value">{pendingBackups.length}</strong>
            <div className="summary-card__meta">Itens aguardando processamento ou envio.</div>
          </div>
        </div>
      </section>

      {props.backups.length === 0
        ? (
            <div className="empty-state">
              Nenhum backup recente retornado para esta empresa.
            </div>
          )
        : (
            <div className="tenant-backup-grid">
              {props.backups.map((backup) => {
                const tone = getBackupTone(backup.status);
                const ToneIcon = tone.icon;

                return (
                  <article className="tenant-backup-card" key={backup.id}>
                    <div className="tenant-backup-card__header">
                      <div>
                        <strong className="tenant-backup-card__title">{backup.file_name}</strong>
                        <div className="tenant-backup-card__subtitle">
                          {backup.device_name || backup.device_id || 'Dispositivo sem nome'}
                        </div>
                      </div>

                      <span className={`badge ${tone.badgeClass}`}>
                        <ToneIcon size={12} />
                        {tone.label}
                      </span>
                    </div>

                    <div className="tenant-backup-card__meta">
                      <div>
                        <DatabaseBackup size={14} />
                        <span>{backup.backup_type}</span>
                      </div>
                      <div>
                        <HardDriveDownload size={14} />
                        <span>{formatDateTime(backup.created_at)}</span>
                      </div>
                    </div>

                    <div className="ops-compact-list">
                      <div className="ops-compact-list__row">
                        <span>Status bruto</span>
                        <strong>{backup.status}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Concluído em</span>
                        <strong>{formatDateTime(backup.completed_at)}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Object key</span>
                        <strong className="ops-mono-text">{backup.object_key}</strong>
                      </div>
                    </div>

                    {backup.error_message
                      ? (
                          <div className="tenant-device-card__alert">
                            <AlertTriangle size={14} />
                            {backup.error_message}
                          </div>
                        )
                      : null}

                    {backup.device_fk
                      ? (
                          <Link className="inline-link" href={`/tenants/${props.tenantId}/devices/${backup.device_fk}`}>
                            Abrir dispositivo
                            <ArrowUpRight size={14} />
                          </Link>
                        )
                      : null}
                  </article>
                );
              })}
            </div>
          )}
    </section>
  );
}
