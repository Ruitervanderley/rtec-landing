import { AlertTriangle, ArrowRight, ArrowUpCircle, Clock, ServerCog, ShieldCheck, Users, Wifi, XCircle } from 'lucide-react';
import Link from 'next/link';
import { DashboardCharts } from '@/components/DashboardCharts';
import { formatDate, formatDateTime } from '@/lib/format';
import { getAdminHealth, getOverview } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

function getStatusMeta(status: 'healthy' | 'degraded' | 'critical') {
  if (status === 'critical') {
    return {
      badgeClass: 'badge-error',
      label: 'Critico',
    };
  }

  if (status === 'degraded') {
    return {
      badgeClass: 'badge-warning',
      label: 'Degradado',
    };
  }

  return {
    badgeClass: 'badge-success',
    label: 'Saudavel',
  };
}

function getPriorityCardClass(status: 'healthy' | 'degraded' | 'critical') {
  if (status === 'critical') {
    return 'tenant-priority-card tenant-priority-card--critical';
  }

  if (status === 'degraded') {
    return 'tenant-priority-card tenant-priority-card--degraded';
  }

  return 'tenant-priority-card';
}

function getTenantDeepLink(props: {
  hasOfflineDevices: boolean;
  hasStaleHeartbeat: boolean;
  pendingBackups: number;
  tenantId: string;
}) {
  if (props.hasOfflineDevices || props.hasStaleHeartbeat) {
    return `/tenants/${props.tenantId}?tab=devices`;
  }

  if (props.pendingBackups > 0) {
    return `/tenants/${props.tenantId}?tab=summary`;
  }

  return `/tenants/${props.tenantId}?tab=agent`;
}

function getTenantSignals(props: {
  failedBackups24h: number;
  hasBackupFailures: boolean;
  hasOfflineDevices: boolean;
  hasPendingBackups: boolean;
  hasStaleHeartbeat: boolean;
  isActive: boolean;
  isLicenseExpired: boolean;
  offlineDevices: number;
}) {
  const signals: string[] = [];

  if (!props.isActive) {
    signals.push('Tenant inativo');
  }
  if (props.isLicenseExpired) {
    signals.push('Licenca vencida');
  }
  if (props.hasOfflineDevices) {
    signals.push(`${props.offlineDevices} offline`);
  }
  if (props.hasBackupFailures) {
    signals.push(`${props.failedBackups24h} backup(s) com falha`);
  }
  if (props.hasPendingBackups) {
    signals.push('Backup pendente');
  }
  if (props.hasStaleHeartbeat) {
    signals.push('Heartbeat atrasado');
  }

  if (signals.length === 0) {
    signals.push('Operacao estavel');
  }

  return signals;
}

function getPriorityBuckets(tenants: Awaited<ReturnType<typeof getOverview>>['operationalTenants']) {
  return {
    backup: tenants.filter(tenant => tenant.hasBackupFailures || tenant.hasPendingBackups),
    heartbeat: tenants.filter(tenant => tenant.hasStaleHeartbeat),
    offline: tenants.filter(tenant => tenant.hasOfflineDevices),
  };
}

export default async function DashboardPage() {
  let overview: Awaited<ReturnType<typeof getOverview>> | null = null;
  let adminHealth: Awaited<ReturnType<typeof getAdminHealth>> | null = null;
  let overviewError: string | null = null;
  let healthError: string | null = null;

  const [overviewResult, healthResult] = await Promise.allSettled([
    getOverview(),
    getAdminHealth(),
  ]);

  if (overviewResult.status === 'fulfilled') {
    overview = overviewResult.value;
  } else {
    overviewError = overviewResult.reason instanceof Error ? overviewResult.reason.message : 'Erro ao carregar dashboard';
  }

  if (healthResult.status === 'fulfilled') {
    adminHealth = healthResult.value;
  } else {
    healthError = healthResult.reason instanceof Error ? healthResult.reason.message : 'Erro ao carregar health administrativo';
  }

  const criticalTenants = overview?.operationalTenants.filter(tenant => tenant.status === 'critical') ?? [];
  const degradedTenants = overview?.operationalTenants.filter(tenant => tenant.status === 'degraded') ?? [];
  const healthyTenants = overview?.operationalTenants.filter(tenant => tenant.status === 'healthy') ?? [];
  const actionableTenants = overview?.operationalTenants.filter(tenant => tenant.status !== 'healthy') ?? [];
  const priorityBuckets = overview
    ? getPriorityBuckets(overview.operationalTenants)
    : {
        backup: [],
        heartbeat: [],
        offline: [],
      };

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <div className="page-hero__eyebrow">Centro operacional</div>
          <h1 className="page-hero__title">Empresas que exigem acao agora</h1>
          <p className="page-hero__description">
            O dashboard agora prioriza tenants com offline, falha de backup, heartbeat atrasado e degradacao operacional.
            A saude do stack continua disponivel, mas deixou de ocupar a primeira dobra.
          </p>
        </div>

        {overview
          ? (
              <div className="status-strip">
                <span className="status-chip status-chip--critical">
                  {criticalTenants.length}
                  {' criticos'}
                </span>
                <span className="status-chip status-chip--warning">
                  {degradedTenants.length}
                  {' degradados'}
                </span>
                <span className="status-chip status-chip--success">
                  {healthyTenants.length}
                  {' saudaveis'}
                </span>
              </div>
            )
          : null}
      </div>

      {overviewError
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertTriangle size={20} />
              {overviewError}
            </div>
          )
        : null}

      {healthError
        ? (
            <div className="alert-panel alert-panel--warning">
              <AlertTriangle size={20} />
              {healthError}
            </div>
          )
        : null}

      {overview
        ? (
            <>
              <div className="ops-kpi-grid">
                <article className="ops-stat-card">
                  <div className="ops-stat-card__icon ops-stat-card__icon--blue">
                    <Users size={24} />
                  </div>
                  <div className="ops-stat-card__copy">
                    <span className="ops-stat-card__label">Tenants monitorados</span>
                    <strong className="ops-stat-card__value">{overview.counts.totalTenants}</strong>
                    <span className="ops-stat-card__meta">Base total acompanhada pelo NOC.</span>
                  </div>
                </article>

                <article className="ops-stat-card">
                  <div className="ops-stat-card__icon ops-stat-card__icon--green">
                    <Wifi size={24} />
                  </div>
                  <div className="ops-stat-card__copy">
                    <span className="ops-stat-card__label">Dispositivos online</span>
                    <strong className="ops-stat-card__value">{overview.counts.onlineDevices}</strong>
                    <span className="ops-stat-card__meta">
                      {overview.counts.totalDevices - overview.counts.onlineDevices}
                      {' fora do ar ou sem heartbeat recente.'}
                    </span>
                  </div>
                </article>

                <article className="ops-stat-card">
                  <div className="ops-stat-card__icon ops-stat-card__icon--violet">
                    <ArrowUpCircle size={24} />
                  </div>
                  <div className="ops-stat-card__copy">
                    <span className="ops-stat-card__label">Backups enviados</span>
                    <strong className="ops-stat-card__value">{overview.counts.uploadedBackups24h}</strong>
                    <span className="ops-stat-card__meta">Ultimas 24 horas.</span>
                  </div>
                </article>

                <article className="ops-stat-card">
                  <div className="ops-stat-card__icon ops-stat-card__icon--red">
                    <XCircle size={24} />
                  </div>
                  <div className="ops-stat-card__copy">
                    <span className="ops-stat-card__label">Falhas de backup</span>
                    <strong className="ops-stat-card__value">{overview.counts.failedBackups24h}</strong>
                    <span className="ops-stat-card__meta">Ultimas 24 horas.</span>
                  </div>
                </article>
              </div>

              <div className="tenant-alert-grid">
                <article className="tenant-alert-block">
                  <div>
                    <div className="page-hero__eyebrow">Ação imediata</div>
                    <strong>Empresas com dispositivos offline</strong>
                    <p>
                      {priorityBuckets.offline.length === 0
                        ? 'Nenhuma empresa com perda de conectividade agora.'
                        : `${priorityBuckets.offline.length} empresa(s) exigem revisão da frota e do heartbeat.`}
                    </p>
                  </div>
                  <div className="tenant-alert-block__signals">
                    {priorityBuckets.offline.slice(0, 4).map(tenant => (
                      <Link className="tenant-alert-block__signal" href={`/tenants/${tenant.tenantId}?tab=devices`} key={`offline-${tenant.tenantId}`}>
                        {tenant.name}
                      </Link>
                    ))}
                  </div>
                </article>

                <article className="tenant-alert-block tenant-alert-block--soft">
                  <div>
                    <div className="page-hero__eyebrow">Backups</div>
                    <strong>Empresas com pendencia ou falha</strong>
                    <p>
                      {priorityBuckets.backup.length === 0
                        ? 'Nenhuma pendencia de backup aberta no momento.'
                        : `${priorityBuckets.backup.length} empresa(s) precisam de revisão na rotina de backup.`}
                    </p>
                  </div>
                  <div className="tenant-alert-block__signals">
                    {priorityBuckets.backup.slice(0, 4).map(tenant => (
                      <Link className="tenant-alert-block__signal" href={`/tenants/${tenant.tenantId}?tab=summary`} key={`backup-${tenant.tenantId}`}>
                        {tenant.name}
                      </Link>
                    ))}
                  </div>
                </article>

                <article className="tenant-alert-block tenant-alert-block--soft">
                  <div>
                    <div className="page-hero__eyebrow">Heartbeat</div>
                    <strong>Empresas sem atualização recente</strong>
                    <p>
                      {priorityBuckets.heartbeat.length === 0
                        ? 'Nenhum tenant com heartbeat atrasado agora.'
                        : `${priorityBuckets.heartbeat.length} empresa(s) exigem validação do agente ou da rede.`}
                    </p>
                  </div>
                  <div className="tenant-alert-block__signals">
                    {priorityBuckets.heartbeat.slice(0, 4).map(tenant => (
                      <Link className="tenant-alert-block__signal" href={`/tenants/${tenant.tenantId}?tab=agent`} key={`heartbeat-${tenant.tenantId}`}>
                        {tenant.name}
                      </Link>
                    ))}
                  </div>
                </article>
              </div>

              <div className="ops-layout-grid">
                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Fila de prioridade</div>
                      <h2 className="ops-section-card__title">Empresas com atencao imediata</h2>
                    </div>
                  </div>

                  <div className="tenant-priority-grid">
                    {actionableTenants.map((tenant) => {
                      const statusMeta = getStatusMeta(tenant.status);
                      const deepLink = getTenantDeepLink({
                        hasOfflineDevices: tenant.hasOfflineDevices,
                        hasStaleHeartbeat: tenant.hasStaleHeartbeat,
                        pendingBackups: tenant.pendingBackups,
                        tenantId: tenant.tenantId,
                      });

                      return (
                        <article className={getPriorityCardClass(tenant.status)} key={tenant.tenantId}>
                          <div className="tenant-priority-card__topline">
                            <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                            <span className="tenant-priority-card__type">{tenant.type}</span>
                          </div>

                          <div className="tenant-priority-card__header">
                            <div>
                              <h3 className="tenant-priority-card__title">{tenant.name}</h3>
                              <p className="tenant-priority-card__description">
                                {tenant.onlineDevices}
                                {' online de '}
                                {tenant.deviceCount}
                                {' dispositivos · '}
                                {tenant.userCount}
                                {' usuarios'}
                              </p>
                            </div>

                            <Link className="inline-link" href={deepLink}>
                              Abrir
                              <ArrowRight size={14} />
                            </Link>
                          </div>

                          <div className="tenant-priority-card__signals">
                            {getTenantSignals(tenant).map(signal => (
                              <span className="tenant-priority-card__signal" key={`${tenant.tenantId}-${signal}`}>
                                {signal}
                              </span>
                            ))}
                          </div>

                          <div className="tenant-priority-card__footer">
                            <span>
                              {'Ultimo heartbeat: '}
                              {formatDateTime(tenant.lastSeenAt)}
                            </span>
                            <span>
                              {'Ultimo backup: '}
                              {formatDateTime(tenant.lastBackupAt)}
                            </span>
                            <span>
                              {'Validade: '}
                              {formatDate(tenant.validUntil)}
                            </span>
                          </div>
                        </article>
                      );
                    })}

                    {actionableTenants.length === 0
                      ? <div className="ops-empty-note">Nenhuma empresa critica ou degradada neste momento.</div>
                      : null}
                  </div>
                </section>

                <div className="ops-stack-column">
                  <section className="card ops-section-card">
                    <div className="ops-section-card__header">
                      <div>
                        <div className="page-hero__eyebrow">Stack e jobs</div>
                        <h2 className="ops-section-card__title">Saude do backend do NOC</h2>
                      </div>
                      {adminHealth
                        ? (
                            <span className={`badge ${adminHealth.status === 'ok' ? 'badge-success' : 'badge-warning'}`}>
                              {adminHealth.status === 'ok' ? 'Saudavel' : 'Degradado'}
                            </span>
                          )
                        : null}
                    </div>

                    {adminHealth
                      ? (
                          <div className="ops-compact-list">
                            <div className="ops-compact-list__row">
                              <span>Banco</span>
                              <strong>{adminHealth.dependencies.database.message}</strong>
                            </div>
                            <div className="ops-compact-list__row">
                              <span>Supabase</span>
                              <strong>{adminHealth.dependencies.supabase.message}</strong>
                            </div>
                            <div className="ops-compact-list__row">
                              <span>R2</span>
                              <strong>{adminHealth.dependencies.r2.message}</strong>
                            </div>
                            <div className="ops-compact-list__row">
                              <span>Release</span>
                              <strong>{adminHealth.deployment.releaseVersion}</strong>
                            </div>
                            <div className="ops-compact-list__row">
                              <span>Tokens ativos</span>
                              <strong>{adminHealth.metrics.activeDeviceTokens}</strong>
                            </div>
                            <div className="ops-compact-list__row">
                              <span>Pendentes ou falhos</span>
                              <strong>{adminHealth.metrics.pendingOrFailedBackups}</strong>
                            </div>
                          </div>
                        )
                      : (
                          <div className="ops-empty-note">Health administrativo indisponivel no momento.</div>
                        )}
                  </section>

                  <section className="card ops-section-card">
                    <div className="ops-section-card__header">
                      <div>
                        <div className="page-hero__eyebrow">Runtime</div>
                        <h2 className="ops-section-card__title">Processamento automatico</h2>
                      </div>
                      <Clock size={18} />
                    </div>

                    <div className="ops-compact-list">
                      <div className="ops-compact-list__row">
                        <span>Ultima varredura offline</span>
                        <strong>{formatDateTime(overview.jobs.lastOfflineScanAtUtc)}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Candidatos desconectados</span>
                        <strong>{overview.jobs.lastOfflineCandidates}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Ultima retencao</span>
                        <strong>{formatDateTime(overview.jobs.lastRetentionRunAtUtc)}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Arquivos limpos</span>
                        <strong>{overview.jobs.lastRetentionDeletedCount}</strong>
                      </div>
                      <div className="ops-compact-list__row">
                        <span>Ultimo alerta Telegram</span>
                        <strong>{formatDateTime(overview.lastAlertAtUtc)}</strong>
                      </div>
                    </div>

                    <div className="ops-note-card">
                      <strong>Ultimo erro conhecido</strong>
                      {overview.jobs.lastError
                        ? <pre className="ops-pre">{overview.jobs.lastError}</pre>
                        : <span>Nenhum erro registrado.</span>}
                    </div>
                  </section>
                </div>
              </div>

              <div className="ops-layout-grid ops-layout-grid--secondary">
                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Mapa rapido</div>
                      <h2 className="ops-section-card__title">Distribuicao operacional</h2>
                    </div>
                    <ServerCog size={18} />
                  </div>
                  <DashboardCharts
                    backupsFailed={overview.counts.failedBackups24h}
                    backupsSuccess={overview.counts.uploadedBackups24h}
                    offline={overview.counts.totalDevices - overview.counts.onlineDevices}
                    online={overview.counts.onlineDevices}
                  />
                </section>

                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Estabilidade</div>
                      <h2 className="ops-section-card__title">Tenants saudaveis</h2>
                    </div>
                    <ShieldCheck size={18} />
                  </div>

                  <div className="healthy-tenant-list">
                    {healthyTenants.slice(0, 8).map(tenant => (
                      <Link className="healthy-tenant-list__item" href={`/tenants/${tenant.tenantId}?tab=summary`} key={tenant.tenantId}>
                        <div>
                          <strong>{tenant.name}</strong>
                          <span>
                            {tenant.onlineDevices}
                            {' online · '}
                            {formatDateTime(tenant.lastSeenAt)}
                          </span>
                        </div>
                        <span className="badge badge-success">Saudavel</span>
                      </Link>
                    ))}

                    {healthyTenants.length === 0
                      ? <div className="ops-empty-note">Nenhum tenant totalmente estavel agora.</div>
                      : null}
                  </div>
                </section>
              </div>
            </>
          )
        : null}
    </section>
  );
}
