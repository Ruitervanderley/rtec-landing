import { AlertTriangle, ArrowUpCircle, Clock, Users, Wifi, XCircle } from 'lucide-react';
import { DashboardCharts } from '@/components/DashboardCharts';
import { formatDateTime } from '@/lib/format';
import { getOverview } from '@/lib/ops-api';

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

export default async function DashboardPage() {
  let overview: Awaited<ReturnType<typeof getOverview>> | null = null;
  let error: string | null = null;

  try {
    overview = await getOverview();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar dashboard';
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

      {error
        ? (
            <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} />
              {error}
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
    </section>
  );
}
