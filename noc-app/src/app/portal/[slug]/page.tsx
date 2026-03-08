import { AlertTriangle, Building2, FileText, HardDrive, Monitor, Network, Server, Shield, Users, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortalTenantSummary, PortalApiError } from '@/lib/portalApi';
import { getPortalPath } from '@/lib/portalRouting';

function InfoCard(props: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          background: 'rgba(77, 184, 255, 0.12)',
          borderRadius: '12px',
          display: 'inline-flex',
          height: '44px',
          justifyContent: 'center',
          marginBottom: '1rem',
          width: '44px',
        }}
      >
        {props.icon}
      </div>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{props.title}</h2>
      <p style={{ color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{props.description}</p>
    </div>
  );
}

function StatusBadge(props: {
  isActive: boolean;
  isOnline: boolean;
}) {
  const palette = !props.isActive
    ? {
        background: 'rgba(239, 68, 68, 0.12)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        color: '#f87171',
        icon: <AlertTriangle size={16} />,
        label: 'Licenca inativa',
      }
    : props.isOnline
      ? {
          background: 'rgba(34, 197, 94, 0.12)',
          borderColor: 'rgba(34, 197, 94, 0.35)',
          color: '#4ade80',
          icon: <Wifi size={16} />,
          label: 'Operacao assistida',
        }
      : {
          background: 'rgba(248, 113, 113, 0.12)',
          borderColor: 'rgba(248, 113, 113, 0.35)',
          color: '#fca5a5',
          icon: <WifiOff size={16} />,
          label: 'Sem dispositivos online',
        };

  return (
    <div
      style={{
        alignItems: 'center',
        background: palette.background,
        border: `1px solid ${palette.borderColor}`,
        borderRadius: '999px',
        color: palette.color,
        display: 'inline-flex',
        gap: '0.5rem',
        padding: '0.55rem 1rem',
      }}
    >
      {palette.icon}
      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{palette.label}</span>
    </div>
  );
}

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
      <main
        style={{
          alignItems: 'center',
          background: '#0b1121',
          color: '#fff',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: '24px',
            maxWidth: '560px',
            padding: '2rem',
            width: '100%',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              background: 'rgba(248, 113, 113, 0.12)',
              borderRadius: '16px',
              color: '#fca5a5',
              display: 'inline-flex',
              height: '56px',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              width: '56px',
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
            Portal temporariamente indisponivel
          </h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            Nao foi possivel carregar os dados operacionais deste tenant no momento.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
            {apiError}
          </p>
          <a
            href="https://wa.me/message/J4U5D52DAZMED1"
            rel="noreferrer"
            style={{
              color: '#4db8ff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
            target="_blank"
          >
            Falar com o suporte da R.TEC
          </a>
        </div>
      </main>
    );
  }

  const isCamara = tenant.type === 'camara';
  const cards = isCamara
    ? [
        {
          description: 'Consulte o ambiente do LegislativoTimer, a validade das licencas e a disponibilidade dos terminais monitorados.',
          icon: <Building2 size={22} color="#4db8ff" />,
          title: 'Ambiente legislativo',
        },
        {
          description: 'Acesse relatorios autenticados com usuarios, licencas, backups e status operacional do tenant.',
          icon: <FileText size={22} color="#4db8ff" />,
          title: 'Relatorios centralizados',
        },
        {
          description: 'A R.TEC acompanha o tenant com suporte operacional, alertas e trilha tecnica para o ambiente da camara.',
          icon: <Shield size={22} color="#4db8ff" />,
          title: 'Suporte assistido',
        },
      ]
    : [
        {
          description: 'Veja quantos equipamentos estao ativos, acompanhe heartbeats e valide rapidamente a saude do ambiente de TI.',
          icon: <Monitor size={22} color="#4db8ff" />,
          title: 'Dispositivos monitorados',
        },
        {
          description: 'Use o portal para consolidar rede, VPN, backups e historico operacional da empresa atendida.',
          icon: <Network size={22} color="#4db8ff" />,
          title: 'Infraestrutura assistida',
        },
        {
          description: 'Acesse relatorios autenticados com dados reais de operacao, usuarios e inventario tecnico.',
          icon: <HardDrive size={22} color="#4db8ff" />,
          title: 'Relatorios operacionais',
        },
      ];

  return (
    <main
      style={{
        background: '#0b1121',
        color: '#fff',
        minHeight: '100vh',
      }}
    >
      <section
        style={{
          background: 'radial-gradient(circle at top, rgba(77, 184, 255, 0.18), transparent 45%)',
          padding: '4rem 1.5rem 2rem',
        }}
      >
        <div style={{ margin: '0 auto', maxWidth: '1100px' }}>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: '0.9rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                background: 'linear-gradient(135deg, #2d82cc, #4db8ff)',
                borderRadius: '18px',
                display: 'flex',
                height: '64px',
                justifyContent: 'center',
                width: '64px',
              }}
            >
              {isCamara ? <Building2 size={32} color="#fff" /> : <Server size={32} color="#fff" />}
            </div>
            <div>
              <p style={{ color: '#4db8ff', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                Portal do tenant
              </p>
              <h1 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
                {tenant.name}
              </h1>
            </div>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 1.5rem', maxWidth: '720px' }}>
            {isCamara
              ? 'Este portal apresenta o status publico do tenant da camara e libera o acesso aos relatorios autenticados do ambiente legislativo.'
              : 'Este portal apresenta o status publico do ambiente de TI e libera o acesso aos relatorios autenticados com dados operacionais administrados pela R.TEC.'}
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <StatusBadge isActive={tenant.isActive} isOnline={tenant.isOnline} />
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.9rem',
            }}
          >
            <Link
              href={getPortalPath({ slug, path: '/relatorios' })}
              style={{
                background: 'linear-gradient(135deg, #2d82cc, #4db8ff)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 700,
                padding: '0.9rem 1.25rem',
                textDecoration: 'none',
              }}
            >
              Acessar relatorios
            </Link>
            <a
              href="https://wa.me/message/J4U5D52DAZMED1"
              rel="noreferrer"
              style={{
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '12px',
                color: '#cbd5e1',
                fontWeight: 700,
                padding: '0.9rem 1.25rem',
                textDecoration: 'none',
              }}
              target="_blank"
            >
              Falar com o suporte
            </a>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 1.5rem 3rem' }}>
        <div style={{ margin: '0 auto', maxWidth: '1100px' }}>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              marginBottom: '1.5rem',
            }}
          >
            <InfoCard
              description={`Total de dispositivos vinculados: ${tenant.deviceCount}.`}
              icon={<Server size={22} color="#4db8ff" />}
              title={isCamara ? 'Estrutura monitorada' : 'Inventario do tenant'}
            />
            <InfoCard
              description={`Dispositivos online agora: ${tenant.onlineDevices}.`}
              icon={<Monitor size={22} color="#4db8ff" />}
              title="Status em tempo real"
            />
            <InfoCard
              description={`Validade do tenant: ${formatDate(tenant.validUntil)}. Usuarios ativos: ${tenant.licensedUsers}/${tenant.userCount}.`}
              icon={<Users size={22} color="#4db8ff" />}
              title={isCamara ? 'Licencas e usuarios' : 'Equipe e licencas'}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              marginBottom: '1.5rem',
            }}
          >
            <InfoCard
              description={`Ultimo heartbeat: ${formatTimestamp(tenant.lastSeenAt)}.`}
              icon={<Wifi size={22} color="#4db8ff" />}
              title="Heartbeat recente"
            />
            <InfoCard
              description={`Ultimo backup: ${formatTimestamp(tenant.lastBackupAt)}.`}
              icon={<HardDrive size={22} color="#4db8ff" />}
              title="Historico de backup"
            />
            <InfoCard
              description={isCamara ? 'O acesso autenticado exibe usuarios, licencas e a operacao tecnica do tenant.' : 'O acesso autenticado exibe inventario tecnico, operacao, alertas e documentacao do ambiente.'}
              icon={<FileText size={22} color="#4db8ff" />}
              title="Portal autenticado"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            {cards.map(card => (
              <InfoCard
                key={card.title}
                description={card.description}
                icon={card.icon}
                title={card.title}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
