import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Laptop2, RadioTower } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDateTime } from '@/lib/format';
import { getServiceDetail } from '@/lib/ops-api';

export const dynamic = 'force-dynamic';

function getCriticalityMeta(criticidade: string) {
  const normalized = criticidade.trim().toLowerCase();

  if (normalized === 'critica') {
    return { badgeClass: 'badge-error', label: 'Crítica', tone: 'danger' };
  }

  if (normalized === 'alta') {
    return { badgeClass: 'badge-warning', label: 'Alta', tone: 'warning' };
  }

  if (normalized === 'media') {
    return { badgeClass: 'badge-warning', label: 'Média', tone: 'warning' };
  }

  return { badgeClass: 'badge-success', label: 'Baixa', tone: 'success' };
}

function getIncidentBadgeClass(severidade: string) {
  return severidade.trim().toLowerCase() === 'critical' ? 'badge-error' : 'badge-warning';
}

export default async function ServicoDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  let data: Awaited<ReturnType<typeof getServiceDetail>> = null;
  let error: string | null = null;

  try {
    data = await getServiceDetail(id);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar serviço';
  }

  if (!data && !error) {
    notFound();
  }

  if (error || !data) {
    return (
      <section className="page-stack">
        <Link className="inline-link" href="/servicos">
          <ArrowLeft size={16} />
          Voltar aos serviços
        </Link>
        <div className="alert-panel alert-panel--error">
          <AlertTriangle size={20} />
          {error || 'Serviço não encontrado.'}
        </div>
      </section>
    );
  }

  const criticality = getCriticalityMeta(data.service.criticidade);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <Link className="inline-link" href="/servicos">
            <ArrowLeft size={15} />
            Voltar aos serviços
          </Link>
          <div className="page-hero__eyebrow">Serviço monitorado</div>
          <h1 className="page-hero__title">{data.service.nome}</h1>
          <p className="page-hero__description">
            Visualização do escopo operacional, ativos vinculados e incidentes abertos que podem afetar este serviço.
          </p>
        </div>

        <div className="page-hero__actions">
          <span className={`badge ${criticality.badgeClass}`}>
            <Activity size={12} />
            {criticality.label}
          </span>
        </div>
      </div>

      <div className="summary-strip">
        <article className="summary-card">
          <span className="summary-card__label">Ativos vinculados</span>
          <strong className="summary-card__value">{data.devices.length}</strong>
          <div className="summary-card__meta">Dispositivos mapeados para este escopo.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Incidentes abertos</span>
          <strong className="summary-card__value">{data.openIncidents.length}</strong>
          <div className="summary-card__meta">Ocorrências ativas associadas ao serviço.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Criticidade</span>
          <strong className="summary-card__value">{criticality.label}</strong>
          <div className="summary-card__meta">Peso operacional para priorização.</div>
        </article>
      </div>

      <div className="service-detail-grid">
        <section className="card ops-section-card">
          <div className="ops-section-card__header">
            <div>
              <div className="page-hero__eyebrow">Dependências</div>
              <h2 className="ops-section-card__title">Ativos vinculados</h2>
            </div>
            <Laptop2 size={20} color="var(--accent-primary)" />
          </div>

          {data.devices.length === 0
            ? (
                <div className="empty-state empty-state--compact">
                  Nenhum ativo vinculado diretamente a este serviço.
                </div>
              )
            : (
                <div className="service-asset-list">
                  {data.devices.map(device => (
                    <article className="service-asset-card" key={device.id}>
                      <div>
                        <strong>{device.nome}</strong>
                        <span>{device.tipo || 'Tipo não informado'}</span>
                      </div>
                      <div className="service-asset-card__meta">
                        <span>{device.local || 'Local não informado'}</span>
                        <span className="ops-mono-text">{device.ip || '--'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
        </section>

        <section className="card ops-section-card">
          <div className="ops-section-card__header">
            <div>
              <div className="page-hero__eyebrow">Impacto atual</div>
              <h2 className="ops-section-card__title">Incidentes ativos</h2>
            </div>
            <RadioTower size={20} color="#f59e0b" />
          </div>

          {data.openIncidents.length === 0
            ? (
                <div className="empty-state empty-state--compact">
                  <CheckCircle2 size={30} color="#10b981" />
                  Nenhum incidente aberto para este serviço.
                </div>
              )
            : (
                <div className="service-incident-list">
                  {data.openIncidents.map(incident => (
                    <article className="service-incident-card" key={incident.id}>
                      <div className="service-incident-card__header">
                        <strong>{incident.titulo}</strong>
                        <span className={`badge ${getIncidentBadgeClass(incident.severidade)}`}>
                          {incident.severidade}
                        </span>
                      </div>

                      {incident.impactoOperacional
                        ? (
                            <p>
                              <strong>Impacto:</strong>
                              {' '}
                              {incident.impactoOperacional}
                            </p>
                          )
                        : null}

                      <div className="service-incident-card__meta">
                        <span>
                          Detectado em
                          {' '}
                          {formatDateTime(incident.startedAt)}
                        </span>
                        {incident.confiancaDiagnostico !== null
                          ? (
                              <span>
                                Confiança
                                {' '}
                                {Math.round(incident.confiancaDiagnostico * 100)}
                                %
                              </span>
                            )
                          : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
        </section>
      </div>
    </section>
  );
}
