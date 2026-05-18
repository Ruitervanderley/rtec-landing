import type { DeviceCommandRow, DeviceCommandType } from '@/lib/ops-api';
import { AlertCircle, ArrowLeft, Cpu, Laptop, RadioTower, RefreshCcw, ScanSearch, UserRound, Wallpaper, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { queueDeviceCommandAction } from '@/app/actions/tenant';
import { getDeviceOperationalStatus, getRamUsagePercent, toMetricNumber } from '@/lib/device-health';
import { formatDateTime, formatDurationSeconds } from '@/lib/format';
import { getDeviceCommands, getDevices, getTenantDetail } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

function formatRam(usedValue: string | number | null | undefined, totalValue: string | number | null | undefined) {
  const used = toMetricNumber(usedValue);
  const total = toMetricNumber(totalValue);

  if (used === null || total === null || total <= 0) {
    return '--';
  }

  return `${(used / 1024).toFixed(1)} GB / ${(total / 1024).toFixed(1)} GB`;
}

function getCommandLabel(commandType: DeviceCommandType) {
  const labels: Record<DeviceCommandType, string> = {
    APPLY_DESKTOP_INFO: 'Reaplicar card/wallpaper',
    COLLECT_DIAGNOSTIC: 'Coletar diagnóstico',
    FORCE_HEARTBEAT: 'Forçar heartbeat',
  };

  return labels[commandType] ?? commandType;
}

function getCommandStatusBadge(status: DeviceCommandRow['status']) {
  if (status === 'SUCCEEDED') {
    return 'badge-success';
  }

  if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELED') {
    return 'badge-error';
  }

  return 'badge-warning';
}

export default async function TenantDeviceDetailPage(props: {
  params: Promise<{ devicePk: string; id: string }>;
}) {
  const { devicePk, id } = await props.params;

  let detail: Awaited<ReturnType<typeof getTenantDetail>> | null = null;
  let devices: Awaited<ReturnType<typeof getDevices>> = [];
  let commands: Awaited<ReturnType<typeof getDeviceCommands>> = [];

  try {
    [detail, devices, commands] = await Promise.all([
      getTenantDetail(id),
      getDevices(500, id),
      getDeviceCommands(devicePk, 12),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      notFound();
    }

    return (
      <section className="card alert-panel alert-panel--error">
        <AlertCircle size={18} />
        {error instanceof Error ? error.message : 'Erro ao carregar dispositivo'}
      </section>
    );
  }

  const device = devices.find(item => item.id === devicePk);
  if (!detail || !device) {
    notFound();
  }
  const operationalStatus = getDeviceOperationalStatus(device);
  const cpu = toMetricNumber(device.cpu_usage_percent);
  const diskFree = toMetricNumber(device.disk_c_free_percent);
  const ramUsage = getRamUsagePercent(device);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <Link className="inline-link inline-link--muted" href={`/tenants/${id}?tab=devices`}>
            <ArrowLeft size={16} />
            Voltar para dispositivos da empresa
          </Link>
          <div className="page-hero__eyebrow">Dispositivo monitorado</div>
          <h1 className="page-hero__title">{device.device_name || device.device_id}</h1>
          <p className="page-hero__description">
            Máquina vinculada a
            {' '}
            <strong>{detail.tenant.name}</strong>
            {' '}
            com telemetria enviada pelo NOC Agent.
          </p>
        </div>

        <div className="page-hero__actions">
          <span className={`badge ${operationalStatus.badgeClass}`}>
            {device.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {operationalStatus.label}
          </span>
        </div>
      </div>

      {operationalStatus.signals.length > 0
        ? (
            <div className="alert-panel alert-panel--warning">
              <AlertCircle size={18} />
              {operationalStatus.signals.join(' · ')}
            </div>
          )
        : null}

      <div className="summary-strip">
        <article className="summary-card">
          <div className="summary-card__header">
            <span className="summary-card__label">Device ID</span>
            <Laptop size={16} />
          </div>
          <strong className="summary-card__value">{device.device_id}</strong>
          <div className="summary-card__meta">Identidade operacional da máquina.</div>
        </article>

        <article className="summary-card">
          <div className="summary-card__header">
            <span className="summary-card__label">Versão do agente</span>
            <Cpu size={16} />
          </div>
          <strong className="summary-card__value">{device.app_version || '--'}</strong>
          <div className="summary-card__meta">Versão reportada no último heartbeat.</div>
        </article>

        <article className="summary-card">
          <div className="summary-card__header">
            <span className="summary-card__label">Último heartbeat</span>
            <Wifi size={16} />
          </div>
          <strong className="summary-card__value">{formatDateTime(device.last_seen_at)}</strong>
          <div className="summary-card__meta">{device.last_status || '--'}</div>
        </article>

        <article className="summary-card">
          <div className="summary-card__header">
            <span className="summary-card__label">Responsável</span>
            <UserRound size={16} />
          </div>
          <strong className="summary-card__value">{device.owner_display_name || device.owner_email || '--'}</strong>
          <div className="summary-card__meta">Usuário base do provisionamento.</div>
        </article>
      </div>

      <div className="ops-layout-grid">
        <section className="card ops-section-card">
          <div className="ops-section-card__header">
            <div>
              <div className="page-hero__eyebrow">Métricas</div>
              <h2 className="ops-section-card__title">Uso de recursos</h2>
            </div>
          </div>

          <div className="tenant-device-card__metrics">
            <div className="tenant-device-metric">
              <span>CPU</span>
              <strong>{cpu !== null ? `${cpu.toFixed(1)}%` : '--'}</strong>
            </div>
            <div className="tenant-device-metric">
              <span>RAM</span>
              <strong>
                {formatRam(device.ram_used_mb, device.ram_total_mb)}
                {ramUsage !== null ? ` (${ramUsage.toFixed(1)}%)` : ''}
              </strong>
            </div>
            <div className="tenant-device-metric">
              <span>Disco C</span>
              <strong>{diskFree !== null ? `${diskFree.toFixed(1)}% livre` : '--'}</strong>
            </div>
            <div className="tenant-device-metric">
              <span>Uptime</span>
              <strong>{formatDurationSeconds(toMetricNumber(device.uptime_seconds) ?? null)}</strong>
            </div>
          </div>
        </section>

        <section className="card ops-section-card">
          <div className="ops-section-card__header">
            <div>
              <div className="page-hero__eyebrow">Identidade de rede</div>
              <h2 className="ops-section-card__title">Dados reportados</h2>
            </div>
          </div>

          <div className="ops-compact-list">
            <div className="ops-compact-list__row">
              <span>IP local</span>
              <strong>{device.local_ip || '--'}</strong>
            </div>
            <div className="ops-compact-list__row">
              <span>MAC</span>
              <strong>{device.mac_address || '--'}</strong>
            </div>
            <div className="ops-compact-list__row">
              <span>Usuário logado</span>
              <strong>{device.logged_in_user || '--'}</strong>
            </div>
            <div className="ops-compact-list__row">
              <span>Token expira</span>
              <strong>{formatDateTime(device.active_token_expires_at ?? null)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Comandos seguros</div>
            <h2 className="ops-section-card__title">Ações remotas do NOC Agent</h2>
          </div>
          <RadioTower size={20} color="var(--accent-primary)" />
        </div>

        <p className="ops-copy-muted">
          Estes comandos são enfileirados para o agente buscar no próximo ciclo. Não há execução arbitrária de script.
        </p>

        <div className="agent-command-grid">
          {([
            { commandType: 'FORCE_HEARTBEAT' as const, icon: RefreshCcw, text: 'Solicita uma comunicação imediata para atualizar status e métricas.' },
            { commandType: 'APPLY_DESKTOP_INFO' as const, icon: Wallpaper, text: 'Reaplica o card visual do NOC no plano de fundo da estação.' },
            { commandType: 'COLLECT_DIAGNOSTIC' as const, icon: ScanSearch, text: 'Coleta diagnóstico básico de CPU, RAM, disco, IP e usuário.' },
          ]).map((command) => {
            const Icon = command.icon;

            return (
              <form action={queueDeviceCommandAction} className="agent-command-card" key={command.commandType}>
                <input name="tenant_id" type="hidden" value={id} />
                <input name="device_pk" type="hidden" value={devicePk} />
                <input name="command_type" type="hidden" value={command.commandType} />
                <div className="agent-command-card__icon">
                  <Icon size={18} />
                </div>
                <div>
                  <strong>{getCommandLabel(command.commandType)}</strong>
                  <span>{command.text}</span>
                </div>
                <button className="agent-secondary-button" type="submit">Enfileirar</button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Auditoria</div>
            <h2 className="ops-section-card__title">Últimos comandos</h2>
          </div>
        </div>

        {commands.length === 0
          ? (
              <div className="empty-state empty-state--compact">
                Nenhum comando enfileirado para este dispositivo.
              </div>
            )
          : (
              <div className="agent-command-history">
                {commands.map(command => (
                  <article className="agent-command-history__item" key={command.id}>
                    <div>
                      <strong>{getCommandLabel(command.commandType)}</strong>
                      <span>
                        Solicitado em
                        {' '}
                        {formatDateTime(command.requestedAt)}
                      </span>
                    </div>
                    <span className={`badge ${getCommandStatusBadge(command.status)}`}>{command.status}</span>
                    <div className="ops-compact-list">
                      <div className="ops-compact-list__row">
                        <span>Coletado</span>
                        <strong>{formatDateTime(command.claimedAt)}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Finalizado</span>
                        <strong>{formatDateTime(command.completedAt)}</strong>
                      </div>
                    </div>
                    {command.errorMessage
                      ? (
                          <div className="tenant-device-card__alert">
                            <AlertCircle size={14} />
                            {command.errorMessage}
                          </div>
                        )
                      : null}
                  </article>
                ))}
              </div>
            )}
      </section>

      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Atalhos</div>
            <h2 className="ops-section-card__title">Fluxos relacionados</h2>
          </div>
        </div>

        <div className="tenant-link-grid">
          <Link className="tenant-action-card" href={`/tenants/${id}?tab=agent`}>
            <strong>NOC Agent</strong>
            <span>Rotacionar token, revisar cobertura e reprovisionar o agente.</span>
          </Link>
          <Link className="tenant-action-card" href={`/tenants/${id}?tab=backups`}>
            <strong>Backups desta empresa</strong>
            <span>Verificar se esta máquina está gerando backup e se houve falhas recentes.</span>
          </Link>
          <Link className="tenant-action-card" href={`/tenants/${id}?tab=alerts`}>
            <strong>Alertas</strong>
            <span>Entender se este dispositivo participa de algum incidente ativo do tenant.</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
