import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Laptop2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_NOC_API_URL ?? 'http://localhost:4000';

async function getServiceDetail(id: string) {
  const token = process.env.OPS_ADMIN_SERVICE_TOKEN ?? '';
  const res = await fetch(`${API_URL}/v1/services/${id}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error('Falha ao carregar serviço');
  }
  return res.json() as Promise<{
    service: { id: string; nome: string; criticidade: string };
    devices: Array<{ id: string; nome: string; tipo: string; local: string; ip: string }>;
    openIncidents: Array<{
      id: string;
      titulo: string;
      severidade: string;
      status: string;
      startedAt: string;
      impactoOperacional: string | null;
      confiancaDiagnostico: number | null;
    }>;
  }>;
}

function CriticidadeBadge({ criticidade }: { criticidade: string }) {
  const cores: Record<string, string> = {
    baixa: 'badge-success',
    media: 'badge-warning',
    alta: 'badge-warning',
    critica: 'badge-error',
  };
  const badgeClass = cores[criticidade] ?? 'badge-neutral';
  return (
    <span className={`badge ${badgeClass}`}>
      {criticidade.toUpperCase()}
    </span>
  );
}

export default async function ServicoDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  let data: Awaited<ReturnType<typeof getServiceDetail>> = null;
  let error: string | null = null;

  try {
    data = await getServiceDetail(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  if (error || !data) {
    return (
      <section>
        <Link href="/servicos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '2rem', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          {' '}
          Voltar aos serviços
        </Link>
        <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} />
          {error || 'Serviço não encontrado.'}
        </div>
      </section>
    );
  }

  const { service, devices, openIncidents } = data;

  return (
    <section>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/servicos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          {' '}
          Catálogo de Serviços
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {service.nome}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Criticidade de Operação:</span>
              <CriticidadeBadge criticidade={service.criticidade} />
            </div>
          </div>
          <div style={{ height: '48px', width: '48px', borderRadius: '12px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'var(--shadow-md)' }}>
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* DEVICES LIST */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <Laptop2 size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Terminais Mapeados</h2>
          </div>

          {devices.length === 0
            ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  Nenhum ativo de TI vinculado diretamente a este escopo.
                </div>
              )
            : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {devices.map(d => (
                    <li
                      key={d.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-primary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{d.nome}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>{d.tipo}</span>
                        {' '}
                        •
                        <span>{d.local}</span>
                        {' '}
                        •
                        <span style={{ fontFamily: 'Consolas, monospace', color: 'var(--accent-primary)' }}>{d.ip}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
        </div>

        {/* INCIDENTS LIST */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Incidentes & Impactos</h2>
          </div>

          {openIncidents.length === 0
            ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ opacity: 0.5 }} />
                  Não há anomalias ou distúrbios ativos relatados para este serviço. O fluxo está normal.
                </div>
              )
            : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {openIncidents.map(i => (
                    <li
                      key={i.id}
                      style={{
                        padding: '1rem',
                        background: i.severidade === 'critical' ? '#fef2f2' : '#fffbeb',
                        borderRadius: '8px',
                        border: `1px solid ${i.severidade === 'critical' ? '#fecaca' : '#fde68a'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '0.95rem', color: i.severidade === 'critical' ? '#991b1b' : '#b45309' }}>{i.titulo}</strong>
                        <span className={`badge ${i.severidade === 'critical' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                          {i.severidade.toUpperCase()}
                        </span>
                      </div>

                      {i.impactoOperacional && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: i.severidade === 'critical' ? '#b91c1c' : '#d97706' }}>
                          <strong>Impacto:</strong>
                          {' '}
                          {i.impactoOperacional}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <span>
                          Detectado em:
                          {new Date(i.startedAt).toLocaleString('pt-BR')}
                        </span>
                        {i.confiancaDiagnostico != null && (
                          <span style={{ fontWeight: 600 }}>
                            Certeza Algorítmica:
                            {Math.round(i.confiancaDiagnostico * 100)}
                            %
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      </div>
    </section>
  );
}
