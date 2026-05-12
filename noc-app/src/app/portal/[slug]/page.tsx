import { AlertTriangle, Building2, FileText, HardDrive, Monitor, Server, Shield, Users, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortalTenantSummary, PortalApiError } from '@/lib/portalApi';

function formatTimestamp(value: string | null) {
  if (!value) {
    return '--';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatDate(value: string | null) {
  if (!value) {
    return '--';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

function getStatusMeta(props: {
  isActive: boolean;
  isOnline: boolean;
}) {
  if (!props.isActive) {
    return {
      badgeClass: 'portal-status-badge portal-status-badge--danger',
      icon: <AlertTriangle size={15} />,
      label: 'Licenca inativa',
    };
  }

  if (props.isOnline) {
    return {
      badgeClass: 'portal-status-badge portal-status-badge--success',
      icon: <Wifi size={15} />,
      label: 'Operacao assistida',
    };
  }

  return {
    badgeClass: 'portal-status-badge portal-status-badge--neutral',
    icon: <WifiOff size={15} />,
    label: 'Sem dispositivos online',
  };
}

export default async function PortalLandingPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  let tenant: Awaited<ReturnType<typeof getPortalTenantSummary>> = null;
  let apiError: string | null = null;

  try {
    tenant = await getPortalTenantSummary(slug);
  } catch (error) {
    if (error instanceof PortalApiError) {
      apiError = error.message;
    } else {
      apiError = 'Falha ao carregar o portal.';
    }
  }

  if (!tenant && !apiError) {
    notFound();
  }

  if (!tenant) {
    return (
      <main className="portal-shell">
        <section className="portal-state-shell">
          <div className="portal-state-card portal-state-card--error">
            <div className="portal-state-card__icon">
              <AlertTriangle size={28} />
            </div>
            <h1 className="portal-state-card__title">Portal temporariamente indisponivel</h1>
            <p className="portal-state-card__copy">
              Nao foi possivel carregar os dados operacionais deste tenant no momento.
            </p>
            <p className="portal-state-card__meta">{apiError}</p>
            <a className="portal-inline-link" href="https://wa.me/message/J4U5D52DAZMED1" rel="noreferrer" target="_blank">
              Falar com o suporte da R.TEC
            </a>
          </div>
        </section>
      </main>
    );
  }

  const isCamara = tenant.type === 'camara';
  const statusMeta = getStatusMeta({
    isActive: tenant.isActive,
    isOnline: tenant.isOnline,
  });
  const cards = isCamara
    ? [
        {
          description: 'Consulte o ambiente do LegislativoTimer, a validade das licencas e a disponibilidade dos terminais monitorados.',
          icon: <Building2 size={20} color="#4db8ff" />,
          title: 'Ambiente legislativo',
        },
        {
          description: 'Acesse relatorios autenticados com usuarios, licencas, backups e status operacional do tenant.',
          icon: <FileText size={20} color="#4db8ff" />,
          title: 'Relatorios centralizados',
        },
        {
          description: 'A R.TEC acompanha o tenant com suporte operacional, alertas e trilha tecnica para o ambiente da camara.',
          icon: <Shield size={20} color="#4db8ff" />,
          title: 'Suporte assistido',
        },
      ]
    : [
        {
          description: 'Veja quantos equipamentos estao ativos, acompanhe heartbeats e valide rapidamente a saude do ambiente de TI.',
          icon: <Monitor size={20} color="#4db8ff" />,
          title: 'Dispositivos monitorados',
        },
        {
          description: 'Use o portal para consolidar rede, VPN, backups e historico operacional da empresa atendida.',
          icon: <Server size={20} color="#4db8ff" />,
          title: 'Infraestrutura assistida',
        },
        {
          description: 'Acesse relatorios autenticados com dados reais de operacao, usuarios e inventario tecnico.',
          icon: <HardDrive size={20} color="#4db8ff" />,
          title: 'Relatorios operacionais',
        },
      ];

  return (
    <main className="portal-shell">
      <section className="portal-page">
        <header className="portal-hero">
          <div className="portal-hero__content">
            <div className="portal-chip">Portal do tenant</div>
            <h1 className="portal-hero__title">{tenant.name}</h1>
            <p className="portal-hero__description">
              {isCamara
                ? 'Este portal apresenta o status do tenant da camara e libera o acesso aos relatorios autenticados do ambiente legislativo.'
                : 'Este portal apresenta o status do ambiente de TI e libera o acesso aos relatorios autenticados administrados pela R.TEC.'}
            </p>

            <div className="portal-status-row">
              <span className={statusMeta.badgeClass}>
                {statusMeta.icon}
                {statusMeta.label}
              </span>
              <span className="portal-status-badge portal-status-badge--neutral">
                <Users size={15} />
                {tenant.licensedUsers}
                {' licencas validas'}
              </span>
            </div>

            <div className="portal-action-row">
              <Link className="portal-button portal-button--primary" href={`/portal/login?slug=${encodeURIComponent(slug)}`}>
                Entrar no portal
              </Link>
              <a className="portal-button portal-button--ghost" href="https://wa.me/message/J4U5D52DAZMED1" rel="noreferrer" target="_blank">
                Falar com o suporte
              </a>
            </div>
          </div>

          <aside className="portal-side-panel">
            <div className="portal-side-panel__icon">
              {isCamara ? <Building2 size={30} color="#fff" /> : <Server size={30} color="#fff" />}
            </div>
            <div className="portal-side-panel__grid">
              <div className="portal-side-panel__item">
                <span className="portal-side-panel__label">Dispositivos</span>
                <strong className="portal-side-panel__value">{tenant.deviceCount}</strong>
              </div>
              <div className="portal-side-panel__item">
                <span className="portal-side-panel__label">Online agora</span>
                <strong className="portal-side-panel__value">{tenant.onlineDevices}</strong>
              </div>
              <div className="portal-side-panel__item">
                <span className="portal-side-panel__label">Ultimo heartbeat</span>
                <strong className="portal-side-panel__value">{formatTimestamp(tenant.lastSeenAt)}</strong>
              </div>
              <div className="portal-side-panel__item">
                <span className="portal-side-panel__label">Validade</span>
                <strong className="portal-side-panel__value">{formatDate(tenant.validUntil)}</strong>
              </div>
            </div>
          </aside>
        </header>

        <section className="portal-kpi-grid">
          <article className="portal-kpi-card">
            <span className="portal-kpi-card__label">Frota monitorada</span>
            <strong className="portal-kpi-card__value">{tenant.deviceCount}</strong>
            <span className="portal-kpi-card__meta">Equipamentos vinculados ao tenant.</span>
          </article>
          <article className="portal-kpi-card">
            <span className="portal-kpi-card__label">Dispositivos online</span>
            <strong className="portal-kpi-card__value">{tenant.onlineDevices}</strong>
            <span className="portal-kpi-card__meta">Leitura operacional do momento.</span>
          </article>
          <article className="portal-kpi-card">
            <span className="portal-kpi-card__label">Ultimo backup</span>
            <strong className="portal-kpi-card__value">{formatTimestamp(tenant.lastBackupAt)}</strong>
            <span className="portal-kpi-card__meta">Referencia rapida de protecao de dados.</span>
          </article>
          <article className="portal-kpi-card">
            <span className="portal-kpi-card__label">Usuarios validos</span>
            <strong className="portal-kpi-card__value">
              {tenant.licensedUsers}
              {' / '}
              {tenant.userCount}
            </strong>
            <span className="portal-kpi-card__meta">Usuarios com acesso no tenant.</span>
          </article>
        </section>

        <section className="portal-card-grid">
          {cards.map(card => (
            <article className="portal-feature-card" key={card.title}>
              <div className="portal-feature-card__icon">{card.icon}</div>
              <h2 className="portal-feature-card__title">{card.title}</h2>
              <p className="portal-feature-card__copy">{card.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
