import { AlertTriangle, ArrowUpCircle, Clock, Users, Wifi, XCircle } from 'lucide-react';
import { DashboardCharts } from '@/components/DashboardCharts';
import { formatDateTime } from '@/lib/format';
import { getAdminHealth, getOverview } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

function StatCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string; subtitle?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{ padding: '1.15rem', borderRadius: '16px', backgroundColor: `${color}15`, color }}>
        <Icon size={32} strokeWidth={2.5} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
        {subtitle && <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function DependencyStatusCard(props: {
  label: string;
  health: {
    ok: boolean;
    status: 'ok' | 'error' | 'not_configured';
    message: string;
    latencyMs: number | null;
  };
}) {
  const tone = props.health.ok
    ? { background: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.28)', text: '#047857' }
    : props.health.status === 'not_configured'
      ? { background: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.28)', text: '#b45309' }
      : { background: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.28)', text: '#b91c1c' };

  return (
    <div
      style={{
        background: tone.background,
        border: `1px solid ${tone.border}`,
        borderRadius: '14px',
        padding: '0.9rem 1rem',
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{props.label}</strong>
        <span style={{ color: tone.text, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
          {props.health.status === 'not_configured'
            ? 'Nao config.'
            : props.health.ok
              ? 'Ok'
              : 'Falha'}
        </span>
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.45rem' }}>
        {props.health.message}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.35rem' }}>
        Latencia:
        {' '}
        {props.health.latencyMs != null ? `${props.health.latencyMs} ms` : '--'}
      </div>
    </div>
  );
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

  return (
    <section>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 800,
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
          display: 'inline-block',
        }}
        >
          Overview Operacional
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 0 }}>Visão macro de licenças de clientes, conectividade de dispositivos e saúde dos backups.</p>
      </div>

      {overviewError
        ? (
            <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} />
              {overviewError}
            </div>
          )
        : null}

      {healthError
        ? (
            <div className="card" style={{ backgroundColor: '#fff7ed', borderColor: '#fdba74', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: overviewError ? '1rem' : 0 }}>
              <AlertTriangle size={20} />
              {healthError}
            </div>
          )
        : null}

      {overview
        ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <StatCard
                  title="Clientes (Tenants)"
                  value={String(overview.counts.totalTenants)}
                  icon={Users}
                  color="#3b82f6"
                />
                <StatCard
                  title="Dispositivos Online"
                  value={`${overview.counts.onlineDevices} / ${overview.counts.totalDevices}`}
                  subtitle="Online nos últimos 15 min"
                  icon={Wifi}
                  color="#10b981"
                />
                <StatCard
                  title="Backups Enviados (24h)"
                  value={String(overview.counts.uploadedBackups24h)}
                  icon={ArrowUpCircle}
                  color="#8b5cf6"
                />
                <StatCard
                  title="Backups com Falha (24h)"
                  value={String(overview.counts.failedBackups24h)}
                  icon={XCircle}
                  color="#ef4444"
                />
              </div>

              {/* Interactive Recharts */}
              <DashboardCharts
                online={overview.counts.onlineDevices}
                offline={overview.counts.totalDevices - overview.counts.onlineDevices}
                backupsSuccess={overview.counts.uploadedBackups24h}
                backupsFailed={overview.counts.failedBackups24h}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    <Clock size={20} color="var(--accent-primary)" />
                    Status de Processamento
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Última varredura offline</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(overview.jobs.lastOfflineScanAtUtc)}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Candidatos desconectados</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{overview.jobs.lastOfflineCandidates}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Última retenção</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(overview.jobs.lastRetentionRunAtUtc)}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Arquivos limpos na retenção</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{overview.jobs.lastRetentionDeletedCount}</strong>
                    </li>
                  </ul>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    <AlertTriangle size={20} color="#f59e0b" />
                    Saúde e Alertas
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Último disparo via Telegram</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(overview.lastAlertAtUtc)}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Relógio do Servidor UTC</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(new Date().toISOString())}</strong>
                    </li>
                    <li style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Último Erro Conhecido (Jobs)</span>
                      {overview.jobs.lastError
                        ? (
                            <pre style={{ margin: 0, padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', overflowX: 'auto', color: '#dc2626' }}>
                              {overview.jobs.lastError}
                            </pre>
                          )
                        : (
                            <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 500 }}>Nenhum erro registrado</span>
                          )}
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )
        : null}

      {adminHealth
        ? (
            <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', marginTop: overview ? '1.5rem' : 0 }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                    Saude do stack
                  </div>
                  <span
                    style={{
                      background: adminHealth.status === 'ok' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      border: `1px solid ${adminHealth.status === 'ok' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'}`,
                      borderRadius: '999px',
                      color: adminHealth.status === 'ok' ? '#047857' : '#b45309',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.7rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {adminHealth.status === 'ok' ? 'Saudavel' : 'Degradado'}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <DependencyStatusCard health={adminHealth.dependencies.database} label="Banco" />
                  <DependencyStatusCard health={adminHealth.dependencies.supabase} label="Supabase" />
                  <DependencyStatusCard health={adminHealth.dependencies.r2} label="R2 / Backups" />
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                  <Clock size={20} color="var(--accent-primary)" />
                  Deploy e runtime
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Release</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'Consolas, monospace' }}>{adminHealth.deployment.releaseVersion}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ambiente</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{adminHealth.deployment.nodeEnv ?? '--'}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Servidor UTC</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(adminHealth.deployment.serverTimeUtc)}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tokens ativos</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{adminHealth.metrics.activeDeviceTokens}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Backups pendentes/falhos</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{adminHealth.metrics.pendingOrFailedBackups}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ultimo alerta Telegram</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(adminHealth.alerts.lastAlertAtUtc)}</strong>
                  </li>
                </ul>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                    Ultimo erro de job
                  </div>
                  {adminHealth.jobs.lastError
                    ? (
                        <pre style={{ margin: 0, padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', overflowX: 'auto', color: '#dc2626' }}>
                          {adminHealth.jobs.lastError}
                        </pre>
                      )
                    : (
                        <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 500 }}>Nenhum erro registrado</span>
                      )}
                </div>
              </div>
            </div>
          )
        : null}
    </section>
  );
}
