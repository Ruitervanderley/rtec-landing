'use client';

import type { BackupRow, DeviceRow, TenantOperationalAlert } from '@/lib/ops-api';
import { ArrowUpRight, BellRing, Clock3, ShieldAlert, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';

type TenantAlertsWorkspaceProps = {
  backups: BackupRow[];
  devices: DeviceRow[];
  tenantId: string;
  tenantName: string;
  alerts: TenantOperationalAlert[];
};

function getDerivedSignals(devices: DeviceRow[], backups: BackupRow[]) {
  const offline = devices.filter(device => !device.is_online);
  const staleHeartbeat = devices.filter(device => !device.last_seen_at || new Date(device.last_seen_at).getTime() < Date.now() - (30 * 60 * 1000));
  const failedBackups = backups.filter(backup => backup.status.trim().toUpperCase() === 'FAILED');

  return [
    ...offline.map(device => ({
      href: `/devices#tenant-${device.tenant_id}`,
      icon: WifiOff,
      key: `offline-${device.id}`,
      text: `${device.device_name || device.device_id} está offline.`,
      tone: 'danger' as const,
      when: formatDateTime(device.last_seen_at),
    })),
    ...staleHeartbeat.map(device => ({
      href: `/tenants/${device.tenant_id}/devices/${device.id}`,
      icon: Clock3,
      key: `stale-${device.id}`,
      text: `${device.device_name || device.device_id} está com heartbeat atrasado.`,
      tone: 'warning' as const,
      when: formatDateTime(device.last_seen_at),
    })),
    ...failedBackups.map(backup => ({
      href: `/tenants/${backup.tenant_id}?tab=backups`,
      icon: ShieldAlert,
      key: `backup-${backup.id}`,
      text: `Backup ${backup.file_name} falhou para ${backup.device_name || backup.device_id}.`,
      tone: 'danger' as const,
      when: formatDateTime(backup.created_at),
    })),
  ].slice(0, 12);
}

function getSignalCardClass(tone: 'danger' | 'warning' | 'success') {
  if (tone === 'danger') {
    return 'tenant-workspace-alert tenant-workspace-alert--danger';
  }

  if (tone === 'warning') {
    return 'tenant-workspace-alert tenant-workspace-alert--warning';
  }

  return 'tenant-workspace-alert tenant-workspace-alert--success';
}

export function TenantAlertsWorkspace(props: TenantAlertsWorkspaceProps) {
  const derivedSignals = getDerivedSignals(props.devices, props.backups);

  return (
    <section className="page-stack">
      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Leitura de incidentes</div>
            <h2 className="ops-section-card__title">Alertas da empresa</h2>
          </div>
          <Link className="inline-link" href={`/tenants/${props.tenantId}?tab=summary`}>
            Voltar ao resumo
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <p className="ops-copy-muted">
          Esta aba reúne o que exige ação imediata em
          {' '}
          <strong>{props.tenantName}</strong>
          : perdas de comunicação, heartbeat atrasado e falhas de backup.
        </p>
      </section>

      <div className="ops-layout-grid">
        <section className="card ops-section-card">
          <div className="ops-section-card__header">
            <div>
              <div className="page-hero__eyebrow">Alertas consolidados</div>
              <h2 className="ops-section-card__title">Sinais operacionais do tenant</h2>
            </div>
          </div>

          <div className="tenant-workspace-alerts">
            {props.alerts.map(alert => (
              <Link className={getSignalCardClass(alert.tone)} href={alert.href} key={`${alert.title}-${alert.href}`}>
                <strong>{alert.title}</strong>
                <span>{alert.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card ops-section-card">
          <div className="ops-section-card__header">
            <div>
              <div className="page-hero__eyebrow">Incidentes derivados</div>
              <h2 className="ops-section-card__title">Eventos da frota e dos backups</h2>
            </div>
          </div>

          {derivedSignals.length === 0
            ? (
                <div className="tenant-workspace-alert tenant-workspace-alert--success">
                  <strong>Sem incidentes ativos</strong>
                  <span>Não há falhas derivadas da frota ou do histórico de backup neste momento.</span>
                </div>
              )
            : (
                <div className="tenant-workspace-alerts">
                  {derivedSignals.map((signal) => {
                    const SignalIcon = signal.icon;

                    return (
                      <Link className={getSignalCardClass(signal.tone)} href={signal.href} key={signal.key}>
                        <strong>
                          <SignalIcon size={14} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
                          {signal.text}
                        </strong>
                        <span>{signal.when}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
        </section>
      </div>

      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Resposta sugerida</div>
            <h2 className="ops-section-card__title">Sequência operacional recomendada</h2>
          </div>
          <BellRing size={16} />
        </div>

        <div className="tenant-link-grid">
          <Link className="tenant-action-card" href={`/tenants/${props.tenantId}?tab=devices`}>
            <strong>Validar dispositivos</strong>
            <span>Revise as máquinas offline, sem heartbeat ou com recursos sob pressão.</span>
          </Link>
          <Link className="tenant-action-card" href={`/tenants/${props.tenantId}?tab=backups`}>
            <strong>Revisar backups</strong>
            <span>Confira falhas recentes, origem por dispositivo e lacunas de cobertura.</span>
          </Link>
          <Link className="tenant-action-card" href={`/tenants/${props.tenantId}?tab=agent`}>
            <strong>Conferir o NOC Agent</strong>
            <span>Rotacione token, confirme versão do agente e reimplante quando necessário.</span>
          </Link>
        </div>

        <div className="ops-note-card ops-note-card--green">
          <strong>Fechamento</strong>
          <span>
            Quando a empresa não tiver sinais ativos, esta aba deve se manter curta e funcionar só como confirmação de estabilidade.
          </span>
        </div>
      </section>
    </section>
  );
}
