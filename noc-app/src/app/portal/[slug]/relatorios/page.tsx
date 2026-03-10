import { AlertTriangle, Database, FileClock, LockKeyhole, Monitor, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { logoutPortalAction } from '@/app/actions/portal';
import { formatDate, formatDateTime, formatDurationSeconds } from '@/lib/format';
import {
  getPortalAuditLogs,
  getPortalOverview,
  getPortalSessions,
  getPortalSpeakerUsage,
  getPortalTenantSummary,
  PortalApiError,
} from '@/lib/portalApi';
import { getPortalPath } from '@/lib/portalRouting';
import { clearPortalSession, getPortalSession } from '@/lib/portalSession';

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
    <main style={{ alignItems: 'center', background: '#0b1121', color: '#fff', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '24px', maxWidth: '620px', padding: '2rem', width: '100%' }}>
        <div style={{ alignItems: 'center', background: 'rgba(248, 113, 113, 0.12)', borderRadius: '16px', color: '#fca5a5', display: 'inline-flex', height: '56px', justifyContent: 'center', marginBottom: '1.25rem', width: '56px' }}>
          <AlertTriangle size={28} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.75rem' }}>
          Relatorios temporariamente indisponiveis
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
          Nao foi possivel carregar os dados deste tenant no momento.
        </p>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
          {props.message}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link href={getPortalPath({ slug: props.slug })} style={{ background: 'linear-gradient(135deg, #2d82cc, #4db8ff)', borderRadius: '12px', color: '#fff', fontWeight: 800, padding: '0.85rem 1.15rem', textDecoration: 'none' }}>
            Voltar ao portal
          </Link>
          <Link href={`/portal/login?slug=${encodeURIComponent(props.slug)}`} style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '12px', color: '#cbd5e1', fontWeight: 800, padding: '0.85rem 1.15rem', textDecoration: 'none' }}>
            Ir para login
          </Link>
          <a href="https://wa.me/message/J4U5D52DAZMED1" rel="noreferrer" style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '12px', color: '#cbd5e1', fontWeight: 800, padding: '0.85rem 1.15rem', textDecoration: 'none' }} target="_blank">
            Falar com o suporte
          </a>
        </div>
      </div>
    </main>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.25rem' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>{props.label}</div>
      <div style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{props.value}</div>
    </div>
  );
}

function SectionCard(props: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem' }}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function StatusChip(props: {
  label: string;
  tone: 'danger' | 'good' | 'neutral';
}) {
  const palette = props.tone === 'good'
    ? { background: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.28)', color: '#86efac' }
    : props.tone === 'danger'
      ? { background: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.28)', color: '#fca5a5' }
      : { background: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.28)', color: '#cbd5e1' };

  return (
    <span style={{ background: palette.background, border: `1px solid ${palette.border}`, borderRadius: '999px', color: palette.color, display: 'inline-flex', fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.65rem' }}>
      {props.label}
    </span>
  );
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
    await clearPortalSession();
    redirect(`/portal/login?slug=${encodeURIComponent(slug)}&error=${encodeURIComponent('Sua sessao expirou ou nao pertence a este tenant.')}`);
  }

  if (error instanceof PortalApiError && error.status === 404) {
    notFound();
  }

  throw error;
}

export default async function PortalReportsPage(props: PortalReportsPageProps) {
  const { slug: rawSlug } = await props.params;
  const searchParams = await props.searchParams;
  const slug = rawSlug.trim().toLowerCase();

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

  const from = typeof searchParams.from === 'string' && searchParams.from.trim() ? searchParams.from.trim() : null;
  const to = typeof searchParams.to === 'string' && searchParams.to.trim() ? searchParams.to.trim() : null;
  const status = typeof searchParams.status === 'string' && searchParams.status.trim() ? searchParams.status.trim().toUpperCase() : null;
  const selectedSessionGuid = typeof searchParams.sessao === 'string' && searchParams.sessao.trim() ? searchParams.sessao.trim() : null;

  let overview: Awaited<ReturnType<typeof getPortalOverview>> | null = null;
  let sessions: Awaited<ReturnType<typeof getPortalSessions>> = [];
  let speakerUsage: Awaited<ReturnType<typeof getPortalSpeakerUsage>> = [];

  try {
    [overview, sessions, speakerUsage] = await Promise.all([
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
      if (error instanceof PortalApiError && error.status >= 500) {
        auditDetail = null;
      } else {
        await handlePortalError(error, slug);
      }
    }
  }

  if (!overview) {
    return <PortalFailure message="Nao foi possivel carregar o resumo do tenant." slug={slug} />;
  }

  const activeUsers = overview.tenant.licensedUsers;
  const metrics = [
    { label: 'Usuarios ativos', value: String(activeUsers) },
    { label: 'Dispositivos online', value: String(overview.tenant.onlineDevices) },
    { label: 'Ultimo heartbeat', value: formatDateTime(overview.tenant.lastSeenAt) },
    { label: 'Ultimo backup', value: formatDateTime(overview.tenant.lastBackupAt) },
    { label: 'Ultimo sync', value: formatDateTime(overview.tenant.lastReportSyncAt) },
    { label: 'Sessoes no periodo', value: String(sessions.length) },
  ];

  return (
    <main style={{ background: '#0b1121', color: '#fff', minHeight: '100vh', padding: '2rem 1.5rem 3rem' }}>
      <div style={{ margin: '0 auto', maxWidth: '1240px' }}>
        <header style={{ alignItems: 'flex-start', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: '#4db8ff', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.45rem' }}>Portal da camara</p>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 0.75rem' }}>{overview.tenant.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <StatusChip label={overview.tenant.isActive ? 'Licenca ativa' : 'Licenca inativa'} tone={overview.tenant.isActive ? 'good' : 'danger'} />
              <StatusChip label={overview.tenant.onlineDevices > 0 ? 'Notebook online' : 'Notebook offline'} tone={overview.tenant.onlineDevices > 0 ? 'good' : 'neutral'} />
            </div>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              Logado como
              {' '}
              {overview.profile.displayName || overview.profile.email}
            </p>
          </div>

          <div style={{ alignItems: 'center', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link href={getPortalPath({ slug })} style={{ border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', color: '#cbd5e1', fontWeight: 700, padding: '0.85rem 1rem', textDecoration: 'none' }}>
              Portal publico
            </Link>
            <Link href={`/portal/login?slug=${encodeURIComponent(slug)}`} style={{ border: '1px solid rgba(77, 184, 255, 0.24)', borderRadius: '12px', color: '#93c5fd', fontWeight: 700, padding: '0.85rem 1rem', textDecoration: 'none' }}>
              Trocar usuario
            </Link>
            <form action={logoutPortalAction}>
              <input name="slug" type="hidden" value={slug} />
              <button style={{ background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '12px', color: '#fca5a5', cursor: 'pointer', fontWeight: 700, padding: '0.85rem 1rem' }} type="submit">
                Sair
              </button>
            </form>
          </div>
        </header>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: '1.5rem' }}>
          {metrics.map(metric => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr', marginBottom: '1.5rem' }}>
          <SectionCard title="Filtros dos relatorios">
            <form method="get" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>Data inicial</span>
                <input defaultValue={from ?? ''} name="from" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', color: '#fff', padding: '0.8rem 0.9rem' }} type="date" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>Data final</span>
                <input defaultValue={to ?? ''} name="to" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', color: '#fff', padding: '0.8rem 0.9rem' }} type="date" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>Status final</span>
                <select defaultValue={status ?? ''} name="status" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', color: '#fff', padding: '0.8rem 0.9rem' }}>
                  <option value="">Todos</option>
                  <option value="TIME_ELAPSED">Tempo esgotado</option>
                  <option value="STOP">Parada manual</option>
                  <option value="RESET">Reset</option>
                </select>
              </label>
              <div style={{ alignItems: 'flex-end', display: 'flex', gap: '0.75rem' }}>
                <button style={{ background: 'linear-gradient(135deg, #2d82cc, #4db8ff)', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontWeight: 700, padding: '0.85rem 1rem' }} type="submit">
                  Atualizar
                </button>
                <Link href={getPortalPath({ slug, path: '/relatorios' })} style={{ color: '#94a3b8', fontSize: '0.9rem', textDecoration: 'none' }}>
                  Limpar
                </Link>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Contexto operacional">
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <Users color="#4db8ff" size={18} />
                Usuarios vinculados:
                {' '}
                {overview.tenant.userCount}
              </div>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <Monitor color="#4db8ff" size={18} />
                Dispositivos monitorados:
                {' '}
                {overview.tenant.deviceCount}
              </div>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <Database color="#4db8ff" size={18} />
                Ultimo backup:
                {' '}
                {formatDateTime(overview.tenant.lastBackupAt)}
              </div>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <FileClock color="#4db8ff" size={18} />
                Ultimo sync:
                {' '}
                {formatDateTime(overview.tenant.lastReportSyncAt)}
              </div>
            </div>
          </SectionCard>
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1.6fr 1fr', marginBottom: '1.5rem' }}>
          <SectionCard title="Sessoes oficiais">
            {sessions.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma sessao oficial encontrada para o filtro atual.</p>
              : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', minWidth: '100%', width: '100%' }}>
                      <thead>
                        <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                          {['Vereador', 'Inicio', 'Fim', 'Planejado', 'Realizado', 'Status', 'Detalhe'].map(header => (
                            <th key={header} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)', fontSize: '0.78rem', fontWeight: 700, padding: '0.75rem 0.5rem' }}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(sessionRow => (
                          <tr key={sessionRow.sessionGuid}>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', padding: '0.75rem 0.5rem' }}>{sessionRow.speakerName}</td>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', color: '#cbd5e1', padding: '0.75rem 0.5rem' }}>{formatDateTime(sessionRow.startedAtUtc)}</td>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', color: '#cbd5e1', padding: '0.75rem 0.5rem' }}>{formatDateTime(sessionRow.endedAtUtc)}</td>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', padding: '0.75rem 0.5rem' }}>{formatDurationSeconds(sessionRow.plannedSeconds)}</td>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', padding: '0.75rem 0.5rem' }}>{formatDurationSeconds(sessionRow.elapsedSeconds)}</td>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', padding: '0.75rem 0.5rem' }}>
                              <StatusChip label={sessionRow.finalStatus} tone={getStatusTone(sessionRow.finalStatus)} />
                            </td>
                            <td style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', padding: '0.75rem 0.5rem' }}>
                              <Link
                                href={`${getPortalPath({ slug, path: '/relatorios' })}?${new URLSearchParams({
                                  ...(from ? { from } : {}),
                                  ...(status ? { status } : {}),
                                  ...(to ? { to } : {}),
                                  sessao: sessionRow.sessionGuid,
                                }).toString()}`}
                                style={{ color: '#93c5fd', textDecoration: 'none' }}
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

          <SectionCard title="Resumo por vereador">
            {speakerUsage.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum resumo encontrado para o periodo atual.</p>
              : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {speakerUsage.map(item => (
                      <div key={item.speakerName} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 700 }}>{item.speakerName}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                          {item.totalSessions}
                          {' '}
                          sessao(oes)
                          {' '}
                          |
                          {' '}
                          total
                          {' '}
                          {formatDurationSeconds(item.totalElapsedSeconds)}
                          {' '}
                          |
                          {' '}
                          media
                          {' '}
                          {formatDurationSeconds(item.averageElapsedSeconds)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </SectionCard>
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
          <SectionCard title="Ultimos registros sincronizados">
            {overview.recentSessions.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma sessao sincronizada ainda.</p>
              : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {overview.recentSessions.slice(0, 6).map(sessionRow => (
                      <div key={sessionRow.sessionGuid} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                          <strong>{sessionRow.speakerName}</strong>
                          <StatusChip label={sessionRow.finalStatus} tone={getStatusTone(sessionRow.finalStatus)} />
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                          Inicio:
                          {' '}
                          {formatDateTime(sessionRow.startedAtUtc)}
                          {' '}
                          |
                          {' '}
                          Sync:
                          {' '}
                          {formatDateTime(sessionRow.syncedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </SectionCard>

          <SectionCard title={auditDetail ? 'Log auditavel da sessao' : 'Selecione uma sessao'}>
            {!auditDetail
              ? (
                  <div style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                    Escolha uma sessao oficial na tabela para visualizar a trilha auditavel com eventos de inicio, pausa, retomada, parada e encerramento.
                  </div>
                )
              : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      <StatusChip label={auditDetail.session.finalStatus} tone={getStatusTone(auditDetail.session.finalStatus)} />
                      <span style={{ color: '#cbd5e1' }}>{auditDetail.session.speakerName}</span>
                      <span style={{ color: '#64748b' }}>•</span>
                      <span style={{ color: '#94a3b8' }}>{formatDate(auditDetail.session.startedAtUtc?.slice(0, 10) ?? null)}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {auditDetail.logs.length === 0
                        ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum log auditavel sincronizado para esta sessao.</p>
                        : auditDetail.logs.map(log => (
                            <div key={log.id} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                              <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
                                <strong>{log.eventType}</strong>
                                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{formatDateTime(log.eventAtUtc)}</span>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                                Restante:
                                {' '}
                                {formatDurationSeconds(log.remainingSeconds)}
                                {' '}
                                |
                                {' '}
                                Decorrido:
                                {' '}
                                {formatDurationSeconds(log.elapsedSeconds)}
                              </div>
                              {log.details
                                ? <div style={{ color: '#cbd5e1', fontSize: '0.84rem', marginTop: '0.45rem' }}>{log.details}</div>
                                : null}
                            </div>
                          ))}
                    </div>
                  </div>
                )}
          </SectionCard>
        </section>

        <footer style={{ alignItems: 'center', color: '#64748b', display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '2rem' }}>
          <LockKeyhole size={16} />
          Dados visiveis apenas para usuarios autenticados do tenant.
        </footer>
      </div>
    </main>
  );
}
