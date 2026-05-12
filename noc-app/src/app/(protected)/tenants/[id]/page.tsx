import { AlertCircle, ArrowLeft, ExternalLink, Network, Server, ShieldCheck, Users } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TenantAgentManager } from '@/components/TenantAgentManager';
import { TenantAlertsWorkspace } from '@/components/TenantAlertsWorkspace';
import { TenantBackupWorkspace } from '@/components/TenantBackupWorkspace';
import { TenantDeviceWorkspace } from '@/components/TenantDeviceWorkspace';
import { TenantInfrastructureEditor } from '@/components/TenantInfrastructureEditor';
import { TenantUsersManager } from '@/components/TenantUsersManager';
import { Env } from '@/lib/Env';
import { formatDate, formatDateTime } from '@/lib/format';
import { getBackups, getDevices, getTenantDetail, revokeDevice } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

const tenantTabs = ['summary', 'agent', 'devices', 'backups', 'alerts', 'users', 'infra', 'cloudflare'] as const;

type TenantTab = (typeof tenantTabs)[number];

function normalizeTab(value: string | string[] | undefined): TenantTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate && tenantTabs.includes(candidate as TenantTab)) {
    return candidate as TenantTab;
  }

  return 'summary';
}

function getTenantStatus(
  detail: Awaited<ReturnType<typeof getTenantDetail>>,
  backups: Awaited<ReturnType<typeof getBackups>>,
) {
  const offlineDevices = Math.max(detail.tenant.deviceCount - detail.tenant.onlineDevices, 0);
  const isLicenseExpired = Boolean(detail.tenant.validUntil && new Date(detail.tenant.validUntil).getTime() < Date.now());
  const hasBackupHistory = backups.length > 0;
  const hasBackupGap = Boolean(
    hasBackupHistory
    && detail.tenant.deviceCount > 0
    && (!detail.tenant.lastBackupAt || new Date(detail.tenant.lastBackupAt).getTime() < Date.now() - (36 * 60 * 60 * 1000)),
  );
  const hasStaleHeartbeat = Boolean(
    detail.tenant.deviceCount > 0
    && (!detail.tenant.lastSeenAt || new Date(detail.tenant.lastSeenAt).getTime() < Date.now() - (30 * 60 * 1000)),
  );

  if (!detail.tenant.isActive || isLicenseExpired || offlineDevices > 0) {
    return {
      badgeClass: 'badge-error',
      description: 'Existe impacto direto na operacao desta empresa.',
      label: 'Critico',
      signals: [
        !detail.tenant.isActive ? 'Tenant inativo' : null,
        isLicenseExpired ? 'Licenca vencida' : null,
        offlineDevices > 0 ? `${offlineDevices} dispositivo(s) offline` : null,
        hasBackupGap ? 'Backup recente nao encontrado' : null,
      ].filter(Boolean) as string[],
    };
  }

  if (hasBackupGap || hasStaleHeartbeat || detail.agent.summary.provisionedDevices === 0) {
    return {
      badgeClass: 'badge-warning',
      description: 'A empresa precisa de ajuste, mas sem ruptura imediata.',
      label: 'Degradado',
      signals: [
        hasBackupGap ? 'Backup recente pendente' : null,
        hasStaleHeartbeat ? 'Heartbeat atrasado' : null,
        detail.agent.summary.provisionedDevices === 0 ? 'Agente nao provisionado' : null,
      ].filter(Boolean) as string[],
    };
  }

  return {
    badgeClass: 'badge-success',
    description: 'A empresa esta estavel e com a frota respondendo.',
    label: 'Saudavel',
    signals: ['Operacao dentro do esperado'],
  };
}

function buildTabHref(tenantId: string, tab: TenantTab) {
  return `/tenants/${tenantId}?tab=${tab}`;
}

function getWorkspaceAlertClass(tone: 'danger' | 'warning' | 'success') {
  if (tone === 'danger') {
    return 'tenant-workspace-alert tenant-workspace-alert--danger';
  }

  if (tone === 'warning') {
    return 'tenant-workspace-alert tenant-workspace-alert--warning';
  }

  return 'tenant-workspace-alert tenant-workspace-alert--success';
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTenantOperationalAlerts(detail: Awaited<ReturnType<typeof getTenantDetail>>, devices: Awaited<ReturnType<typeof getDevices>>) {
  const alerts: Array<{ href: string; tone: 'danger' | 'warning' | 'success'; title: string; description: string }> = [];
  const offlineDevices = devices.filter(device => !device.is_online);
  const staleDevices = devices.filter(device => !device.last_seen_at || new Date(device.last_seen_at).getTime() < Date.now() - (30 * 60 * 1000));
  const stressedDevices = devices.filter((device) => {
    const cpu = toNumber(device.cpu_usage_percent);
    const diskFree = toNumber(device.disk_c_free_percent);
    const ramUsed = toNumber(device.ram_used_mb);
    const ramTotal = toNumber(device.ram_total_mb);
    const ramRatio = ramUsed !== null && ramTotal !== null && ramTotal > 0 ? (ramUsed / ramTotal) * 100 : null;

    return (cpu !== null && cpu >= 90) || (diskFree !== null && diskFree < 10) || (ramRatio !== null && ramRatio >= 90);
  });

  if (!detail.tenant.isActive) {
    alerts.push({
      description: 'A empresa esta inativa e requer revisão de licença antes da operação normal.',
      href: buildTabHref(detail.tenant.tenantId, 'summary'),
      title: 'Tenant inativo',
      tone: 'danger',
    });
  }

  if (offlineDevices.length > 0) {
    alerts.push({
      description: `${offlineDevices.length} maquina(s) sem comunicação ativa com o NOC Agent.`,
      href: buildTabHref(detail.tenant.tenantId, 'devices'),
      title: 'Dispositivos offline',
      tone: 'danger',
    });
  }

  if (staleDevices.length > 0) {
    alerts.push({
      description: `${staleDevices.length} maquina(s) com heartbeat atrasado para esta empresa.`,
      href: buildTabHref(detail.tenant.tenantId, 'devices'),
      title: 'Heartbeat atrasado',
      tone: 'warning',
    });
  }

  if (stressedDevices.length > 0) {
    alerts.push({
      description: `${stressedDevices.length} maquina(s) com CPU, RAM ou disco sob pressão.`,
      href: buildTabHref(detail.tenant.tenantId, 'devices'),
      title: 'Recursos em atenção',
      tone: 'warning',
    });
  }

  if (detail.agent.summary.provisionedDevices === 0) {
    alerts.push({
      description: 'Nenhuma máquina provisionada ainda para esta empresa.',
      href: buildTabHref(detail.tenant.tenantId, 'agent'),
      title: 'Agente não implantado',
      tone: 'warning',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      description: 'Licença, agente e frota respondem dentro do esperado neste momento.',
      href: buildTabHref(detail.tenant.tenantId, 'summary'),
      title: 'Empresa estável',
      tone: 'success',
    });
  }

  return alerts;
}

function getTenantDeviceSpotlight(devices: Awaited<ReturnType<typeof getDevices>>) {
  return [...devices]
    .sort((left, right) => {
      const leftPriority = left.is_online ? 1 : 0;
      const rightPriority = right.is_online ? 1 : 0;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return (right.last_seen_at ?? '').localeCompare(left.last_seen_at ?? '');
    })
    .slice(0, 4);
}

function renderCloudflareChecklist(detail: Awaited<ReturnType<typeof getTenantDetail>>) {
  if (detail.tenant.cloudflareStatus === 'manual_redirect_required') {
    return (
      <div className="page-stack">
        <p className="ops-copy-muted">
          Este tenant ainda usa o modelo atual de redirect manual. Publique a regra no Cloudflare com os valores abaixo
          e valide o portal canonico antes de testar o subdominio.
        </p>

        <div className="tenant-link-grid">
          <div className="ops-note-card ops-note-card--blue">
            <strong>Origem</strong>
            <span className="ops-mono-text">{detail.tenant.redirectSource}</span>
          </div>

          <div className="ops-note-card ops-note-card--green">
            <strong>Destino</strong>
            <span className="ops-mono-text">{detail.tenant.redirectTarget}</span>
          </div>
        </div>

        <ol className="ops-number-list">
          <li>Confirme o slug salvo neste tenant.</li>
          <li>Crie a Redirect Rule no Cloudflare com a origem e o destino acima.</li>
          <li>
            Teste primeiro o portal canonico em
            {' '}
            <strong>{detail.tenant.portalUrl}</strong>
            .
          </li>
          <li>Depois valide o atalho do subdominio e o login do portal.</li>
        </ol>

        <div className="ops-note-card">
          <strong>Observacao</strong>
          <span>O modelo atual descarta rotas profundas no subdominio do cliente e redireciona para a raiz canonica do portal.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-empty-note">
      Defina um slug ou subdominio valido para este tenant antes de preparar a regra manual do Cloudflare.
    </div>
  );
}

export default async function TenantDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const activeTab = normalizeTab(searchParams.tab);

  let detail: Awaited<ReturnType<typeof getTenantDetail>> | null = null;
  let devices: Awaited<ReturnType<typeof getDevices>> = [];
  let backups: Awaited<ReturnType<typeof getBackups>> = [];
  let errorMsg: string | null = null;
  let deviceErrorMsg: string | null = null;
  let backupErrorMsg: string | null = null;

  try {
    detail = await getTenantDetail(id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      notFound();
    }

    errorMsg = error instanceof Error ? error.message : 'Erro ao carregar tenant';
  }

  if (detail) {
    try {
      devices = await getDevices(500, id);
    } catch (error) {
      deviceErrorMsg = error instanceof Error ? error.message : 'Erro ao carregar dispositivos do tenant';
    }

    try {
      backups = await getBackups(300, id);
    } catch (error) {
      backupErrorMsg = error instanceof Error ? error.message : 'Erro ao carregar backups do tenant';
    }
  }

  async function revokeDeviceAction(formData: FormData) {
    'use server';
    const devicePk = String(formData.get('devicePk') ?? '').trim();
    if (!devicePk) {
      return;
    }

    await revokeDevice(devicePk);
    revalidatePath(`/tenants/${id}`);
  }

  if (!detail && !errorMsg) {
    notFound();
  }

  if (!detail) {
    return (
      <section className="card alert-panel alert-panel--error">
        <AlertCircle size={20} />
        {errorMsg}
      </section>
    );
  }

  const tenantStatus = getTenantStatus(detail, backups);
  const operationalAlerts = getTenantOperationalAlerts(detail, devices);
  const spotlightDevices = getTenantDeviceSpotlight(devices);
  const summaryCards = [
    {
      icon: ShieldCheck,
      label: 'Licenca',
      meta: `Vence em ${formatDate(detail.tenant.validUntil)}`,
      value: detail.license.isActive ? 'Ativa' : 'Inativa',
    },
    {
      icon: Users,
      label: 'Usuarios',
      meta: `${detail.tenant.adminUsers} admin(s) · ${detail.tenant.licensedUsers} validos`,
      value: String(detail.tenant.userCount),
    },
    {
      icon: Server,
      label: 'Dispositivos',
      meta: `${Math.max(detail.tenant.deviceCount - detail.tenant.onlineDevices, 0)} offline · ultimo heartbeat ${formatDateTime(detail.tenant.lastSeenAt)}`,
      value: `${detail.tenant.onlineDevices}/${detail.tenant.deviceCount}`,
    },
    {
      icon: Network,
      label: 'Roteamento',
      meta: detail.tenant.portalUrl || '--',
      value: detail.tenant.portalSlug || detail.tenant.subdomain || '--',
    },
  ];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <Link className="inline-link inline-link--muted" href="/tenants">
            <ArrowLeft size={16} />
            Voltar para tenants
          </Link>
          <div className="page-hero__eyebrow">Empresa monitorada</div>
          <h1 className="page-hero__title">{detail.tenant.name}</h1>
          <p className="page-hero__description">
            Tenant do tipo
            {' '}
            {detail.tenant.type}
            {' '}
            com operacao segmentada por abas para frota, agente, usuarios, infraestrutura e Cloudflare.
          </p>
        </div>

        <div className="page-hero__actions">
          <div className="status-strip">
            <span className={`badge ${tenantStatus.badgeClass}`}>{tenantStatus.label}</span>
          </div>

          {detail.tenant.portalUrl
            ? (
                <a className="inline-link" href={detail.tenant.portalUrl} rel="noreferrer" target="_blank">
                  Abrir portal canonico
                  <ExternalLink size={16} />
                </a>
              )
            : null}
        </div>
      </div>

      <div className="tenant-alert-block">
        <div>
          <strong>Status consolidado</strong>
          <p>{tenantStatus.description}</p>
        </div>

        <div className="tenant-alert-block__signals">
          {tenantStatus.signals.map(signal => (
            <span className="tenant-alert-block__signal" key={signal}>{signal}</span>
          ))}
        </div>
      </div>

      <nav className="ops-tab-nav" aria-label="Navegacao do tenant">
        {tenantTabs.map(tab => (
          <Link
            className={`ops-tab-nav__link ${activeTab === tab ? 'is-active' : ''}`}
            href={buildTabHref(detail.tenant.tenantId, tab)}
            key={tab}
          >
            {tab === 'summary'
              ? 'Resumo'
              : tab === 'agent'
                ? 'Agente'
                : tab === 'devices'
                  ? 'Dispositivos'
                  : tab === 'backups'
                    ? 'Backups'
                    : tab === 'alerts'
                      ? 'Alertas'
                      : tab === 'users'
                        ? 'Usuarios'
                        : tab === 'infra'
                          ? 'Infra'
                          : 'Cloudflare'}
          </Link>
        ))}
      </nav>

      {activeTab === 'summary'
        ? (
            <div className="page-stack">
              <div className="summary-strip">
                {summaryCards.map(item => (
                  <article className="summary-card" key={item.label}>
                    <div className="summary-card__header">
                      <span className="summary-card__label">{item.label}</span>
                      <item.icon size={16} />
                    </div>
                    <strong className="summary-card__value">{item.value}</strong>
                    <div className="summary-card__meta">{item.meta}</div>
                  </article>
                ))}
              </div>

              <div className="ops-layout-grid">
                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Resumo executivo</div>
                      <h2 className="ops-section-card__title">Contexto operacional</h2>
                    </div>
                  </div>

                  <div className="ops-copy-stack">
                    <p>{detail.infrastructure.overview}</p>
                    <p>{detail.infrastructure.monitoring.summary}</p>
                  </div>

                  <div className="tenant-link-grid">
                    <Link className="tenant-action-card" href={buildTabHref(detail.tenant.tenantId, 'agent')}>
                      <strong>Agente da empresa</strong>
                      <span>
                        {detail.agent.summary.provisionedDevices}
                        {' provisionado(s) · '}
                        {detail.agent.summary.onlineDevices}
                        {' online'}
                      </span>
                    </Link>

                    <Link className="tenant-action-card" href={buildTabHref(detail.tenant.tenantId, 'devices')}>
                      <strong>Frota conectada</strong>
                      <span>
                        {detail.tenant.onlineDevices}
                        {' online de '}
                        {detail.tenant.deviceCount}
                        {' dispositivos'}
                      </span>
                    </Link>

                    <Link className="tenant-action-card" href={buildTabHref(detail.tenant.tenantId, 'backups')}>
                      <strong>Backups da empresa</strong>
                      <span>
                        {backups.length}
                        {' registro(s) · ultimo backup '}
                        {formatDateTime(detail.tenant.lastBackupAt)}
                      </span>
                    </Link>

                    <Link className="tenant-action-card" href={buildTabHref(detail.tenant.tenantId, 'users')}>
                      <strong>Usuarios e acessos</strong>
                      <span>
                        {detail.users.length}
                        {' vinculado(s) · '}
                        {detail.tenant.adminUsers}
                        {' admin(s)'}
                      </span>
                    </Link>

                    <Link className="tenant-action-card" href={buildTabHref(detail.tenant.tenantId, 'alerts')}>
                      <strong>Alertas da empresa</strong>
                      <span>
                        {operationalAlerts.length}
                        {' sinal(is) operacional(is) aberto(s)'}
                      </span>
                    </Link>

                    <Link className="tenant-action-card" href={buildTabHref(detail.tenant.tenantId, 'cloudflare')}>
                      <strong>Roteamento externo</strong>
                      <span>
                        {detail.tenant.cloudflareStatus === 'manual_redirect_required' ? 'Redirect manual pendente' : 'Sem redirect elegivel'}
                      </span>
                    </Link>
                  </div>
                </section>

                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Sinais imediatos</div>
                      <h2 className="ops-section-card__title">Checklist rapido</h2>
                    </div>
                  </div>

                  <div className="ops-compact-list">
                    <div className="ops-compact-list__row">
                      <span>Ultimo heartbeat</span>
                      <strong>{formatDateTime(detail.tenant.lastSeenAt)}</strong>
                    </div>
                    <div className="ops-compact-list__row">
                      <span>Ultimo backup</span>
                      <strong>{formatDateTime(detail.tenant.lastBackupAt)}</strong>
                    </div>
                    <div className="ops-compact-list__row">
                      <span>Portal</span>
                      <strong>{detail.tenant.portalUrl || '--'}</strong>
                    </div>
                    <div className="ops-compact-list__row">
                      <span>Responsabilidades</span>
                      <strong>{detail.infrastructure.responsibilities.length}</strong>
                    </div>
                    <div className="ops-compact-list__row">
                      <span>Stack monitorado</span>
                      <strong>{detail.infrastructure.monitoring.stack.length}</strong>
                    </div>
                  </div>

                  <div className="tenant-alert-block tenant-alert-block--soft">
                    <div>
                      <strong>Melhorias mapeadas</strong>
                      <p>
                        {detail.infrastructure.monitoring.improvements.length > 0
                          ? detail.infrastructure.monitoring.improvements.join(' · ')
                          : 'Nenhuma melhoria cadastrada no momento.'}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="ops-layout-grid">
                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Prioridades da empresa</div>
                      <h2 className="ops-section-card__title">O que tratar primeiro neste tenant</h2>
                    </div>
                  </div>

                  <div className="tenant-workspace-alerts">
                    {operationalAlerts.map(alert => (
                      <Link className={getWorkspaceAlertClass(alert.tone)} href={alert.href} key={`${alert.title}-${alert.href}`}>
                        <strong>{alert.title}</strong>
                        <span>{alert.description}</span>
                      </Link>
                    ))}
                  </div>
                </section>

                <section className="card ops-section-card">
                  <div className="ops-section-card__header">
                    <div>
                      <div className="page-hero__eyebrow">Frota em evidência</div>
                      <h2 className="ops-section-card__title">Máquinas que merecem revisão</h2>
                    </div>
                    <Link className="inline-link" href={buildTabHref(detail.tenant.tenantId, 'devices')}>
                      Abrir aba dispositivos
                      <ExternalLink size={14} />
                    </Link>
                  </div>

                  <div className="tenant-spotlight-list">
                    {spotlightDevices.map(device => (
                      <div className="tenant-spotlight-item" key={device.id}>
                        <div>
                          <strong>{device.device_name || device.device_id}</strong>
                          <span>
                            {device.logged_in_user || '--'}
                            {' · '}
                            {device.local_ip || '--'}
                          </span>
                        </div>
                        <div className="tenant-spotlight-item__meta">
                          <span className={`badge ${device.is_online ? 'badge-success' : 'badge-error'}`}>
                            {device.is_online ? 'Online' : 'Offline'}
                          </span>
                          <span>{formatDateTime(device.last_seen_at)}</span>
                        </div>
                      </div>
                    ))}

                    {spotlightDevices.length === 0
                      ? <div className="ops-empty-note">Nenhuma máquina provisionada para esta empresa ainda.</div>
                      : null}
                  </div>
                </section>
              </div>
            </div>
          )
        : null}

      {activeTab === 'agent'
        ? (
            <TenantAgentManager
              agent={detail.agent}
              devices={devices}
              officialPackage={{
                fileName: `RtecNocAgent-${Env.nocAgentPackageVersion}-win-x64.zip`,
                sha256: Env.nocAgentPackageSha256,
                updatedAt: Env.nocAgentPackageUpdatedAt,
                url: Env.nocAgentPackageUrl,
                version: Env.nocAgentPackageVersion,
              }}
              tenantId={detail.tenant.tenantId}
              tenantName={detail.tenant.name}
            />
          )
        : null}

      {activeTab === 'users'
        ? <TenantUsersManager tenantId={detail.tenant.tenantId} users={detail.users} />
        : null}

      {activeTab === 'infra'
        ? (
            <TenantInfrastructureEditor
              infrastructure={detail.infrastructure}
              infrastructureIsDefault={detail.infrastructureIsDefault}
              tenantId={detail.tenant.tenantId}
              tenantName={detail.tenant.name}
              tenantType={detail.tenant.type}
            />
          )
        : null}

      {activeTab === 'cloudflare'
        ? (
            <section className="card ops-section-card">
              <div className="ops-section-card__header">
                <div>
                  <div className="page-hero__eyebrow">Cloudflare manual</div>
                  <h2 className="ops-section-card__title">Checklist de publicacao do tenant</h2>
                </div>
              </div>
              {renderCloudflareChecklist(detail)}
            </section>
          )
        : null}

      {activeTab === 'devices'
        ? (
            <TenantDeviceWorkspace
              devices={devices}
              error={deviceErrorMsg}
              revokeDeviceAction={revokeDeviceAction}
              tenantId={detail.tenant.tenantId}
              tenantName={detail.tenant.name}
            />
          )
        : null}

      {activeTab === 'backups'
        ? (
            backupErrorMsg
              ? (
                  <section className="card alert-panel alert-panel--error">
                    <AlertCircle size={18} />
                    {backupErrorMsg}
                  </section>
                )
              : (
                  <TenantBackupWorkspace
                    backups={backups}
                    tenantId={detail.tenant.tenantId}
                    tenantName={detail.tenant.name}
                  />
                )
          )
        : null}

      {activeTab === 'alerts'
        ? (
            <TenantAlertsWorkspace
              alerts={operationalAlerts}
              backups={backups}
              devices={devices}
              tenantId={detail.tenant.tenantId}
              tenantName={detail.tenant.name}
            />
          )
        : null}
    </section>
  );
}
