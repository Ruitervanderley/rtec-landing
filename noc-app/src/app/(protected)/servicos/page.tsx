import { AlertTriangle, ArrowUpRight, CheckCircle2, Layers3, Server, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { getServices } from '@/lib/ops-api';
import { CadastrarServico } from '../../CadastrarServico';

export const dynamic = 'force-dynamic';

function getCriticalityMeta(criticidade: string) {
  const normalized = criticidade.trim().toLowerCase();

  if (normalized === 'critica') {
    return {
      badgeClass: 'badge-error',
      cardClass: 'service-card service-card--critical',
      label: 'Crítica',
      priority: 0,
    };
  }

  if (normalized === 'alta') {
    return {
      badgeClass: 'badge-warning',
      cardClass: 'service-card service-card--warning',
      label: 'Alta',
      priority: 1,
    };
  }

  if (normalized === 'media') {
    return {
      badgeClass: 'badge-warning',
      cardClass: 'service-card',
      label: 'Média',
      priority: 2,
    };
  }

  return {
    badgeClass: 'badge-success',
    cardClass: 'service-card',
    label: 'Baixa',
    priority: 3,
  };
}

export default async function ServicosPage() {
  let services: Awaited<ReturnType<typeof getServices>> = [];
  let error: string | null = null;

  try {
    services = await getServices();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar serviços';
  }

  const servicesByPriority = [...services].sort((left, right) => {
    const leftMeta = getCriticalityMeta(left.criticidade);
    const rightMeta = getCriticalityMeta(right.criticidade);

    if (leftMeta.priority !== rightMeta.priority) {
      return leftMeta.priority - rightMeta.priority;
    }

    return left.nome.localeCompare(right.nome, 'pt-BR');
  });
  const criticalServices = services.filter(service => getCriticalityMeta(service.criticidade).priority <= 1);
  const stableServices = services.filter(service => getCriticalityMeta(service.criticidade).priority > 1);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <div className="page-hero__eyebrow">Catálogo e incidentes</div>
          <h1 className="page-hero__title">
            <Server size={28} color="var(--accent-primary)" />
            Serviços NOC por criticidade
          </h1>
          <p className="page-hero__description">
            Use esta área para mapear escopos operacionais, dependências e impactos. A prioridade agora fica clara antes
            de abrir o detalhe técnico do serviço.
          </p>
        </div>

        <div className="status-strip">
          <span className="status-chip status-chip--critical">
            {criticalServices.length}
            {' críticos/altos'}
          </span>
          <span className="status-chip status-chip--success">
            {stableServices.length}
            {' estáveis'}
          </span>
        </div>
      </div>

      {error
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertTriangle size={20} />
              {error}
            </div>
          )
        : null}

      <div className="summary-strip">
        <article className="summary-card">
          <span className="summary-card__label">Serviços cadastrados</span>
          <strong className="summary-card__value">{services.length}</strong>
          <div className="summary-card__meta">Escopos operacionais acompanhados pelo NOC.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Alta atenção</span>
          <strong className="summary-card__value">{criticalServices.length}</strong>
          <div className="summary-card__meta">Serviços de criticidade alta ou crítica.</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Fila estável</span>
          <strong className="summary-card__value">{stableServices.length}</strong>
          <div className="summary-card__meta">Serviços com criticidade média ou baixa.</div>
        </article>
      </div>

      <CadastrarServico />

      {!error && services.length === 0
        ? (
            <div className="empty-state">
              Nenhum serviço cadastrado. Crie o primeiro escopo para conectar incidentes, dependências e ativos.
            </div>
          )
        : null}

      <div className="service-grid">
        {servicesByPriority.map((service) => {
          const meta = getCriticalityMeta(service.criticidade);
          const Icon = meta.priority <= 1 ? ShieldAlert : CheckCircle2;

          return (
            <Link className={meta.cardClass} href={`/servicos/${service.id}`} key={service.id}>
              <div className="service-card__topline">
                <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                <ArrowUpRight size={15} />
              </div>

              <div className="service-card__body">
                <div className="service-card__icon">
                  <Icon size={21} />
                </div>
                <div>
                  <strong>{service.nome}</strong>
                  <span>
                    {meta.priority <= 1
                      ? 'Abrir dependências e incidentes antes de qualquer janela.'
                      : 'Escopo operacional cadastrado para correlação futura.'}
                  </span>
                </div>
              </div>

              <div className="service-card__footer">
                <Layers3 size={14} />
                <span>Detalhe, ativos vinculados e impactos ativos</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
