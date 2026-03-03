import { getOverview } from '@/lib/ops-api';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

function StatCard(props: { title: string; value: string; subtitle?: string }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dbe2ea',
        borderRadius: 12,
        padding: '0.95rem 1rem',
        minHeight: 92,
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{props.title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.15 }}>{props.value}</div>
      {props.subtitle ? <div style={{ marginTop: 7, color: '#475569', fontSize: 12 }}>{props.subtitle}</div> : null}
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
      <h1 style={{ marginTop: 0, marginBottom: 6 }}>Dashboard operacional</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Visao central de licencas, status dos notebooks e backup automatico.
      </p>

      {error ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: 12, borderRadius: 10 }}>
          {error}
        </div>
      ) : null}

      {overview ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
              marginTop: 14,
              marginBottom: 18,
            }}
          >
            <StatCard title="Tenants" value={String(overview.counts.totalTenants)} />
            <StatCard
              title="Dispositivos online"
              value={`${overview.counts.onlineDevices}/${overview.counts.totalDevices}`}
              subtitle="Online em ate 15 minutos"
            />
            <StatCard title="Backups enviados (24h)" value={String(overview.counts.uploadedBackups24h)} />
            <StatCard title="Backups com falha (24h)" value={String(overview.counts.failedBackups24h)} />
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #dbe2ea',
              borderRadius: 12,
              padding: '0.95rem 1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Jobs operacionais</div>
              <div>Ultima varredura offline: {formatDateTime(overview.jobs.lastOfflineScanAtUtc)}</div>
              <div>Candidatos offline: {overview.jobs.lastOfflineCandidates}</div>
              <div>Ultima retencao: {formatDateTime(overview.jobs.lastRetentionRunAtUtc)}</div>
              <div>Backups removidos na ultima retencao: {overview.jobs.lastRetentionDeletedCount}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Alertas</div>
              <div>Ultimo alerta telegram: {formatDateTime(overview.lastAlertAtUtc)}</div>
              <div>Ultimo erro de job: {overview.jobs.lastError ?? '--'}</div>
              <div>Servidor UTC: {formatDateTime(new Date().toISOString())}</div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
