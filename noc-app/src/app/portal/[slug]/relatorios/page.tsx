import { AlertTriangle, Database, FileClock, LockKeyhole, Monitor, Shield, Users, Wifi } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { logoutPortalAction } from '@/app/actions/portal';
import { formatDate, formatDateTime, formatDurationSeconds } from '@/lib/format';
import {
  getPortalAuditLogs,
  getPortalOverview,
  getPortalReports,
  getPortalSessions,
  getPortalSpeakerUsage,
  getPortalTenantSummary,
  PortalApiError,
} from '@/lib/portalApi';
import { getPortalPath } from '@/lib/portalRouting';
import { getPortalSession, shouldRefreshPortalSession } from '@/lib/portalSession';

type PortalReportsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    from?: string;
    sessao?: string;
    status?: string;
    to?: string;
  }>;
};

function PortalFailure(props: {
  message: string;
  slug: string;
}) {
  return (
    <main className="portal-shell">
      <section className="portal-state-shell">
        <div className="portal-state-card portal-state-card--error">
          <div className="portal-state-card__icon">
            <AlertTriangle size={28} />
          </div>
          <h1 className="portal-state-card__title">Relatorios temporariamente indisponiveis</h1>
          <p className="portal-state-card__copy">
            Nao foi possivel carregar os dados deste tenant no momento.
          </p>
          <p className="portal-state-card__meta">{props.message}</p>
          <div className="portal-action-row">
            <Link className="portal-button portal-button--primary" href={getPortalPath({ slug: props.slug })}>
              Voltar ao portal
            </Link>
            <Link className="portal-button portal-button--ghost" href={`/portal/login?slug=${encodeURIComponent(props.slug)}`}>
              Ir para login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
}) {
  return (
    <article className="portal-kpi-card">
      <span className="portal-kpi-card__label">{props.label}</span>
      <strong className="portal-kpi-card__value">{props.value}</strong>
    </article>
  );
}

function SectionCard(props: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
}) {
  return (
    <section className="portal-section-card">
      <div className="portal-section-card__header">
        {props.eyebrow
          ? <div className="portal-chip">{props.eyebrow}</div>
          : null}
        <h2 className="portal-section-card__title">{props.title}</h2>
      </div>
      {props.children}
    </section>
  );
}

function StatusChip(props: {
  label: string;
  tone: 'danger' | 'good' | 'neutral';
}) {
  const toneClass = props.tone === 'good'
    ? 'portal-status-badge portal-status-badge--success'
    : props.tone === 'danger'
      ? 'portal-status-badge portal-status-badge--danger'
      : 'portal-status-badge portal-status-badge--neutral';

  return <span className={toneClass}>{props.label}</span>;
}

function getOperationalHighlights(props: {
  failedBackups24h: number;
  offlineDevices: number;
  onlineDevices: number;
  sessions: number;
}) {
  const highlights: Array<{ tone: 'danger' | 'good' | 'neutral'; text: string }> = [];

  if (props.offlineDevices > 0) {
    highlights.push({
      text: `${props.offlineDevices} dispositivo(s) offline exigem verificação.`,
      tone: 'danger',
    });
  }

  if (props.failedBackups24h > 0) {
    highlights.push({
      text: `${props.failedBackups24h} backup(s) falharam nas últimas 24h.`,
      tone: 'danger',
    });
  }

  if (props.onlineDevices > 0) {
    highlights.push({
      text: `${props.onlineDevices} dispositivo(s) seguem reportando normalmente.`,
      tone: 'good',
    });
  }

  if (props.sessions === 0) {
    highlights.push({
      text: 'Ainda não há histórico sincronizado para o filtro atual.',
      tone: 'neutral',
    });
  }

  return highlights;
}

function getStatusTone(status: string) {
  if (status === 'TIME_ELAPSED' || status === 'FINISHED') {
    return 'good' as const;
  }

  if (status === 'RESET' || status === 'STOP') {
    return 'neutral' as const;
  }

  return 'danger' as const;
}

async function handlePortalError(error: unknown, slug: string) {
  if (error instanceof PortalApiError && (error.status === 401 || error.status === 403)) {
    redirect(`/portal/login?slug=${encodeURIComponent(slug)}&error=${encodeURIComponent('Sua sessao expirou ou nao pertence a este tenant.')}`);
  }

  if (error instanceof PortalApiError && error.status === 404) {
    notFound();
  }

  throw error;
}

function buildSessionDetailHref(props: {
  from: string | null;
  sessionGuid: string;
  slug: string;
  status: string | null;
  to: string | null;
}) {
  return `${getPortalPath({ slug: props.slug, path: '/relatorios' })}?${new URLSearchParams({
    ...(props.from ? { from: props.from } : {}),
    ...(props.status ? { status: props.status } : {}),
    ...(props.to ? { to: props.to } : {}),
    sessao: props.sessionGuid,
  }).toString()}`;
}

export default async function PortalReportsPage(props: PortalReportsPageProps) {
  const { slug: rawSlug } = await props.params;
  const searchParams = await props.searchParams;
  const slug = rawSlug.trim().toLowerCase();

  const from = typeof searchParams.from === 'string' && searchParams.from.trim() ? searchParams.from.trim() : null;
  const to = typeof searchParams.to === 'string' && searchParams.to.trim() ? searchParams.to.trim() : null;
  const status = typeof searchParams.status === 'string' && searchParams.status.trim() ? searchParams.status.trim().toUpperCase() : null;
  const selectedSessionGuid = typeof searchParams.sessao === 'string' && searchParams.sessao.trim() ? searchParams.sessao.trim() : null;
  const reportsPath = getPortalPath({ slug, path: '/relatorios' });
  const returnToQuery = new URLSearchParams();
  if (from) {
    returnToQuery.set('from', from);
  }
  if (to) {
    returnToQuery.set('to', to);
  }
  if (status) {
    returnToQuery.set('status', status);
  }
  if (selectedSessionGuid) {
    returnToQuery.set('sessao', selectedSessionGuid);
  }
  const returnTo = returnToQuery.size > 0 ? `${reportsPath}?${returnToQuery.toString()}` : reportsPath;

  let tenantSummary = null;
  try {
    tenantSummary = await getPortalTenantSummary(slug);
  } catch (error) {
    if (error instanceof PortalApiError && error.status === 404) {
      notFound();
    }

    return (
      <PortalFailure
        message={error instanceof PortalApiError ? error.message : 'Falha ao carregar o portal.'}
        slug={slug}
      />
    );
  }

  if (!tenantSummary) {
    notFound();
  }

  const session = await getPortalSession({ tenantSlug: slug });
  if (!session) {
    redirect(`/portal/login?slug=${encodeURIComponent(slug)}`);
  }

  if (shouldRefreshPortalSession(session)) {
    if (session.refreshToken) {
      redirect(`/portal/auth/refresh?slug=${encodeURIComponent(slug)}&returnTo=${encodeURIComponent(returnTo)}`);
    }

    redirect(`/portal/login?slug=${encodeURIComponent(slug)}&error=${encodeURIComponent('Sua sessao expirou. Entre novamente.')}`);
  }

  let overview: Awaited<ReturnType<typeof getPortalOverview>> | null = null;
  let sessions: Awaited<ReturnType<typeof getPortalSessions>> = [];
  let speakerUsage: Awaited<ReturnType<typeof getPortalSpeakerUsage>> = [];
  let reportsData: Awaited<ReturnType<typeof getPortalReports>> | null = null;

  try {
    [overview, sessions, speakerUsage, reportsData] = await Promise.all([
      getPortalOverview({
        accessToken: session.accessToken,
        slug,
      }),
      getPortalSessions({
        accessToken: session.accessToken,
        from,
        limit: 150,
        slug,
        status,
        to,
      }),
      getPortalSpeakerUsage({
        accessToken: session.accessToken,
        from,
        slug,
        to,
      }),
      getPortalReports({
        accessToken: session.accessToken,
        slug,
      }),
    ]);
  } catch (error) {
    if (error instanceof PortalApiError && error.status >= 500) {
      return <PortalFailure message={error.message} slug={slug} />;
    }

    await handlePortalError(error, slug);
  }

  let auditDetail = null;
  if (selectedSessionGuid) {
    try {
      auditDetail = await getPortalAuditLogs({
        accessToken: session.accessToken,
        sessionGuid: selectedSessionGuid,
        slug,
      });
    } catch (error) {
      if (!(error instanceof PortalApiError && error.status >= 500)) {
        await handlePortalError(error, slug);
      }
    }
  }

  if (!overview || !reportsData) {
    return <PortalFailure message="Nao foi possivel carregar o resumo do tenant." slug={slug} />;
  }

  const isCamara = overview.tenant.type === 'camara';
  const metrics = [
    { label: 'Usuarios ativos', value: String(overview.tenant.licensedUsers) },
    { label: 'Dispositivos online', value: String(reportsData.stats.onlineDevices) },
    { label: 'Dispositivos offline', value: String(reportsData.stats.offlineDevices) },
    { label: 'Backups enviados 24h', value: String(reportsData.stats.uploadedBackups24h) },
    { label: 'Backups com falha', value: String(reportsData.stats.failedBackups24h) },
    { label: isCamara ? 'Sessoes no periodo' : 'Registros no periodo', value: String(sessions.length) },
  ];
  const operationalHighlights = getOperationalHighlights({
    failedBackups24h: reportsData.stats.failedBackups24h,
    offlineDevices: reportsData.stats.offlineDevices,
    onlineDevices: reportsData.stats.onlineDevices,
    sessions: sessions.length,
  });

  return (
    <main className="portal-shell">
      <section className="portal-page portal-page--wide">
        <header className="portal-report-header">
          <div className="portal-report-header__content">
            <div className="portal-chip">{isCamara ? 'Portal da camara' : 'Portal de TI'}</div>
            <h1 className="portal-report-header__title">{overview.tenant.name}</h1>
            <p className="portal-report-header__description">
              Logado como
              {' '}
              <strong>{overview.profile.displayName || overview.profile.email}</strong>
              {' · '}
              visão consolidada de operação, histórico e auditoria do tenant.
            </p>

            <div className="portal-status-row">
              <StatusChip label={overview.tenant.isActive ? 'Licenca ativa' : 'Licenca inativa'} tone={overview.tenant.isActive ? 'good' : 'danger'} />
              <StatusChip label={reportsData.stats.onlineDevices > 0 ? 'Frota respondendo' : 'Sem dispositivos online'} tone={reportsData.stats.onlineDevices > 0 ? 'good' : 'neutral'} />
            </div>
          </div>

          <div className="portal-action-row">
            <Link className="portal-button portal-button--ghost" href={getPortalPath({ slug })}>
              Portal publico
            </Link>
            <Link className="portal-button portal-button--ghost" href={`/portal/login?slug=${encodeURIComponent(slug)}`}>
              Trocar usuario
            </Link>
            <form action={logoutPortalAction}>
              <input name="slug" type="hidden" value={slug} />
              <button className="portal-button portal-button--danger" type="submit">
                Sair
              </button>
            </form>
          </div>
        </header>

        <section className="portal-kpi-grid">
          {metrics.map(metric => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
        </section>

        <section className="portal-report-grid">
          <SectionCard eyebrow="Leitura rápida" title="O que merece atenção agora">
            <div className="portal-entity-list">
              {operationalHighlights.map(highlight => (
                <div className="portal-note portal-note--dense" key={highlight.text}>
                  <StatusChip
                    label={highlight.tone === 'danger' ? 'Atenção' : highlight.tone === 'good' ? 'Estável' : 'Contexto'}
                    tone={highlight.tone}
                  />
                  <span>{highlight.text}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Próximos passos" title="Como usar este relatório">
            <div className="portal-entity-list">
              <div className="portal-note portal-note--dense">
                <strong>1. Use os filtros acima</strong>
                <span>Refine por período e status para localizar sessões e eventos específicos.</span>
              </div>
              <div className="portal-note portal-note--dense">
                <strong>2. Abra a trilha auditável</strong>
                <span>Selecione um registro na tabela para visualizar início, pausas, retomadas e encerramento.</span>
              </div>
              <div className="portal-note portal-note--dense">
                <strong>3. Revise ambiente e backups</strong>
                <span>Quando não houver histórico recente, use os blocos de frota, alertas e backup para validar a operação.</span>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="portal-report-grid">
          <SectionCard eyebrow="Filtros" title={isCamara ? 'Filtrar sessoes oficiais' : 'Filtrar atividade'}>
            <form className="portal-filter-form" method="get">
              <label className="portal-form__field">
                <span className="portal-form__label">Data inicial</span>
                <input className="portal-form__input" defaultValue={from ?? ''} name="from" type="date" />
              </label>
              <label className="portal-form__field">
                <span className="portal-form__label">Data final</span>
                <input className="portal-form__input" defaultValue={to ?? ''} name="to" type="date" />
              </label>
              <label className="portal-form__field">
                <span className="portal-form__label">Status final</span>
                <select className="portal-form__input" defaultValue={status ?? ''} name="status">
                  <option value="">Todos</option>
                  <option value="TIME_ELAPSED">Tempo esgotado</option>
                  <option value="STOP">Parada manual</option>
                  <option value="RESET">Reset</option>
                </select>
              </label>
              <div className="portal-filter-form__actions">
                <button className="portal-button portal-button--primary" type="submit">
                  Atualizar
                </button>
                <Link className="portal-inline-link portal-inline-link--muted" href={getPortalPath({ slug, path: '/relatorios' })}>
                  Limpar
                </Link>
              </div>
            </form>
          </SectionCard>

          <SectionCard eyebrow="Saude do tenant" title="Contexto operacional">
            <div className="portal-stack-list">
              <div className="portal-stack-list__item">
                <Users size={18} />
                <span>
                  Usuarios vinculados:
                  {' '}
                  <strong>{overview.tenant.userCount}</strong>
                </span>
              </div>
              <div className="portal-stack-list__item">
                <Monitor size={18} />
                <span>
                  Dispositivos monitorados:
                  {' '}
                  <strong>{reportsData.stats.totalDevices}</strong>
                </span>
              </div>
              <div className="portal-stack-list__item">
                <Database size={18} />
                <span>
                  Ultimo backup:
                  {' '}
                  <strong>{formatDateTime(reportsData.stats.lastBackupAt)}</strong>
                </span>
              </div>
              <div className="portal-stack-list__item">
                <FileClock size={18} />
                <span>
                  Ultimo sync:
                  {' '}
                  <strong>{formatDateTime(overview.tenant.lastReportSyncAt)}</strong>
                </span>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="portal-report-grid portal-report-grid--main">
          <SectionCard eyebrow="Historico" title={isCamara ? 'Sessoes oficiais no periodo' : 'Registros sincronizados no periodo'}>
            {sessions.length === 0
              ? (
                  <div className="portal-empty-state">
                    {isCamara
                      ? 'Nenhuma sessao oficial encontrada para o filtro atual.'
                      : 'Nenhum registro encontrado para o filtro atual.'}
                  </div>
                )
              : (
                  <div className="portal-table-wrap">
                    <table className="portal-table">
                      <thead>
                        <tr>
                          {[isCamara ? 'Vereador' : 'Responsavel', 'Inicio', 'Fim', 'Planejado', 'Realizado', 'Status', 'Detalhe'].map(header => (
                            <th key={header}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(sessionRow => (
                          <tr key={sessionRow.sessionGuid}>
                            <td>{sessionRow.speakerName}</td>
                            <td>{formatDateTime(sessionRow.startedAtUtc)}</td>
                            <td>{formatDateTime(sessionRow.endedAtUtc)}</td>
                            <td>{formatDurationSeconds(sessionRow.plannedSeconds)}</td>
                            <td>{formatDurationSeconds(sessionRow.elapsedSeconds)}</td>
                            <td>
                              <StatusChip label={sessionRow.finalStatus} tone={getStatusTone(sessionRow.finalStatus)} />
                            </td>
                            <td>
                              <Link
                                className="portal-inline-link"
                                href={buildSessionDetailHref({
                                  from,
                                  sessionGuid: sessionRow.sessionGuid,
                                  slug,
                                  status,
                                  to,
                                })}
                              >
                                Ver logs
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </SectionCard>

          <SectionCard eyebrow="Resumo" title={isCamara ? 'Resumo por vereador' : 'Resumo por responsavel'}>
            {speakerUsage.length === 0
              ? (
                  <div className="portal-empty-state">
                    Nenhum resumo encontrado para o periodo atual. Assim que houver registros sincronizados, esta area mostrara volume por responsavel e duracao media.
                  </div>
                )
              : (
                  <div className="portal-entity-list">
                    {speakerUsage.map(item => (
                      <article className="portal-entity-card" key={item.speakerName}>
                        <strong className="portal-entity-card__title">{item.speakerName}</strong>
                        <span className="portal-entity-card__meta">
                          {item.totalSessions}
                          {' '}
                          {isCamara ? 'sessao(oes)' : 'registro(s)'}
                          {' · total '}
                          {formatDurationSeconds(item.totalElapsedSeconds)}
                          {' · media '}
                          {formatDurationSeconds(item.averageElapsedSeconds)}
                        </span>
                      </article>
                    ))}
                  </div>
                )}
          </SectionCard>
        </section>

        <section className="portal-report-grid">
          <SectionCard eyebrow="Ambiente" title="Frota e ultimos backups">
            <div className="portal-dual-list">
              <div className="portal-subsection">
                <h3 className="portal-subsection__title">Dispositivos</h3>
                {reportsData.devices.length === 0
                  ? <div className="portal-empty-state">Nenhum dispositivo provisionado.</div>
                  : (
                      <div className="portal-entity-list">
                        {reportsData.devices.slice(0, 6).map(device => (
                          <article className="portal-entity-card" key={device.id}>
                            <div className="portal-entity-card__row">
                              <strong className="portal-entity-card__title">{device.deviceName || device.deviceId}</strong>
                              <StatusChip label={device.isOnline ? 'Online' : 'Offline'} tone={device.isOnline ? 'good' : 'neutral'} />
                            </div>
                            <span className="portal-entity-card__meta">
                              {(device.lastStatus || device.appVersion) ? `${device.lastStatus || '--'} · ${device.appVersion || '--'}` : '--'}
                              {' · '}
                              {formatDateTime(device.lastSeenAt)}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
              </div>

              <div className="portal-subsection">
                <h3 className="portal-subsection__title">Backups recentes</h3>
                {reportsData.backups.length === 0
                  ? <div className="portal-empty-state">Nenhum backup retornado. Se este tenant já possui rotina ativa, vale revisar o agente ou a integração de armazenamento.</div>
                  : (
                      <div className="portal-entity-list">
                        {reportsData.backups.slice(0, 6).map(backup => (
                          <article className="portal-entity-card" key={backup.id}>
                            <div className="portal-entity-card__row">
                              <strong className="portal-entity-card__title">{backup.fileName}</strong>
                              <StatusChip label={backup.status} tone={backup.status === 'FAILED' ? 'danger' : backup.status === 'UPLOADED' || backup.status === 'COMPLETED' ? 'good' : 'neutral'} />
                            </div>
                            <span className="portal-entity-card__meta">
                              {backup.backupType}
                              {' · '}
                              {formatDateTime(backup.createdAt)}
                            </span>
                            {backup.errorMessage
                              ? <span className="portal-inline-alert portal-inline-alert--error">{backup.errorMessage}</span>
                              : null}
                          </article>
                        ))}
                      </div>
                    )}
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Sinais" title="Alertas e acessos do tenant">
            <div className="portal-dual-list">
              <div className="portal-subsection">
                <h3 className="portal-subsection__title">Alertas recentes</h3>
                {reportsData.alerts.length === 0
                  ? <div className="portal-empty-state">Nenhum alerta recente. Isso pode significar operação estável ou ausência de regras disparadas para o período.</div>
                  : (
                      <div className="portal-entity-list">
                        {reportsData.alerts.slice(0, 6).map(alert => (
                          <article className="portal-entity-card" key={alert.id}>
                            <div className="portal-entity-card__row">
                              <strong className="portal-entity-card__title">{alert.alertType}</strong>
                              <StatusChip label={alert.delivered ? 'Entregue' : 'Pendente'} tone={alert.delivered ? 'good' : 'neutral'} />
                            </div>
                            <span className="portal-entity-card__meta">
                              Criado em
                              {' '}
                              {formatDateTime(alert.createdAt)}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
              </div>

              <div className="portal-subsection">
                <h3 className="portal-subsection__title">Usuarios do tenant</h3>
                {reportsData.users.length === 0
                  ? <div className="portal-empty-state">Nenhum usuario vinculado ao portal neste momento.</div>
                  : (
                      <div className="portal-entity-list">
                        {reportsData.users.slice(0, 6).map(user => (
                          <article className="portal-entity-card" key={user.userId}>
                            <div className="portal-entity-card__row">
                              <strong className="portal-entity-card__title">{user.displayName || user.email}</strong>
                              <StatusChip label={user.accessStatus} tone={user.accessStatus === 'active' ? 'good' : 'danger'} />
                            </div>
                            <span className="portal-entity-card__meta">
                              {user.email}
                              {' · validade '}
                              {formatDate(user.validUntil)}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="portal-report-grid">
          <SectionCard eyebrow="Auditoria" title={auditDetail ? (isCamara ? 'Trilha da sessao selecionada' : 'Trilha do registro selecionado') : (isCamara ? 'Selecione uma sessao' : 'Selecione um registro')}>
            {!auditDetail
              ? (
                  <div className="portal-empty-state">
                    {isCamara
                      ? 'Escolha uma sessao oficial na tabela para visualizar a trilha auditavel com eventos de inicio, pausa, retomada, parada e encerramento.'
                      : 'Escolha um registro na tabela para visualizar a trilha auditavel com eventos de inicio, pausa, retomada, parada e encerramento.'}
                  </div>
                )
              : (
                  <div className="portal-entity-list">
                    <div className="portal-stack-list">
                      <div className="portal-stack-list__item">
                        <Shield size={18} />
                        <span>
                          <strong>{auditDetail.session.speakerName}</strong>
                          {' · '}
                          {formatDate(auditDetail.session.startedAtUtc?.slice(0, 10) ?? null)}
                        </span>
                      </div>
                    </div>

                    {auditDetail.logs.length === 0
                      ? (
                          <div className="portal-empty-state">
                            {isCamara
                              ? 'Nenhum log auditavel sincronizado para esta sessao.'
                              : 'Nenhum log auditavel sincronizado para este registro.'}
                          </div>
                        )
                      : auditDetail.logs.map(log => (
                          <article className="portal-entity-card" key={log.id}>
                            <div className="portal-entity-card__row">
                              <strong className="portal-entity-card__title">{log.eventType}</strong>
                              <span className="portal-entity-card__meta">{formatDateTime(log.eventAtUtc)}</span>
                            </div>
                            <span className="portal-entity-card__meta">
                              Restante
                              {' '}
                              {formatDurationSeconds(log.remainingSeconds)}
                              {' · decorrido '}
                              {formatDurationSeconds(log.elapsedSeconds)}
                            </span>
                            {log.details
                              ? <div className="portal-note">{log.details}</div>
                              : null}
                          </article>
                        ))}
                  </div>
                )}
          </SectionCard>

          <SectionCard eyebrow="Resumo tecnico" title="Infraestrutura do tenant">
            <div className="portal-stack-list">
              <div className="portal-stack-list__item">
                <Wifi size={18} />
                <span>
                  Ultimo heartbeat:
                  {' '}
                  <strong>{formatDateTime(reportsData.stats.lastSeenAt)}</strong>
                </span>
              </div>
              <div className="portal-stack-list__item">
                <Database size={18} />
                <span>
                  Ultimo backup:
                  {' '}
                  <strong>{formatDateTime(reportsData.stats.lastBackupAt)}</strong>
                </span>
              </div>
              <div className="portal-stack-list__item">
                <Users size={18} />
                <span>
                  Responsabilidades:
                  {' '}
                  <strong>{reportsData.infrastructure.responsibilities.length}</strong>
                </span>
              </div>
              <div className="portal-stack-list__item">
                <Monitor size={18} />
                <span>
                  Stack monitorado:
                  {' '}
                  <strong>{reportsData.infrastructure.monitoring.stack.length}</strong>
                </span>
              </div>
            </div>

            <div className="portal-note">
              {reportsData.infrastructure.overview}
            </div>
          </SectionCard>
        </section>

        <footer className="portal-footer-note">
          <LockKeyhole size={16} />
          Dados visiveis apenas para usuarios autenticados do tenant.
        </footer>
      </section>
    </main>
  );
}
