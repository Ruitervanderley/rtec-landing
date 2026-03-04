import { Building2, Download, ExternalLink, FileText, HardDrive, Mail, MapPin, Monitor, Server, Shield, Video, Wifi, WifiOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_NOC_API_URL ?? 'http://localhost:4000';

async function getTenantBySlug(slug: string) {
  try {
    const res = await fetch(`${API_URL}/v1/portal/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Feature cards for Câmaras Municipais ───
function CamaraCards({ deviceCount }: { deviceCount: number }) {
  return (
    <>
      <FeatureCard
        icon={<Wifi size={24} color="#22c55e" />}
        iconBg="rgba(34, 197, 94, 0.15)"
        title="Monitoramento 24/7"
        description={deviceCount > 0
          ? `${deviceCount} dispositivos ativos sendo monitorados em tempo real.`
          : 'Todos os dispositivos monitorados em tempo real com alertas automáticos.'}
      />
      <FeatureCard
        icon={<Shield size={24} color="#4db8ff" />}
        iconBg="rgba(45, 130, 204, 0.15)"
        title="Backup Automático"
        description="Backups criptografados armazenados em nuvem com retenção segura e restauração instantânea."
      />
      <FeatureCard
        icon={<Download size={24} color="#a855f7" />}
        iconBg="rgba(168, 85, 247, 0.15)"
        title="Software Dedicado"
        description="Baixe o aplicativo oficial para gerenciar sessões, atas e reuniões."
        actionLabel="Baixar Software"
        actionHref="#download"
        actionColor="linear-gradient(135deg, #a855f7, #7c3aed)"
      />
    </>
  );
}

// ─── Feature cards for Empresas de TI ───
function EmpresaTICards({ deviceCount }: { deviceCount: number }) {
  return (
    <>
      <FeatureCard
        icon={<Server size={24} color="#22c55e" />}
        iconBg="rgba(34, 197, 94, 0.15)"
        title="Servidores Gerenciados"
        description={deviceCount > 0
          ? `${deviceCount} equipamentos ativos monitorados com alertas via Telegram.`
          : 'Servidores monitorados 24/7 com alertas automáticos e uptime garantido.'}
      />
      <FeatureCard
        icon={<Monitor size={24} color="#4db8ff" />}
        iconBg="rgba(45, 130, 204, 0.15)"
        title="VPN & Rede Segura"
        description="Rede privada via Tailscale conectando todas as filiais com segurança end-to-end."
      />
      <FeatureCard
        icon={<Video size={24} color="#f59e0b" />}
        iconBg="rgba(245, 158, 11, 0.15)"
        title="Videomonitoramento"
        description="Câmeras de segurança online com gravação contínua e acesso remoto."
      />
      <FeatureCard
        icon={<HardDrive size={24} color="#a855f7" />}
        iconBg="rgba(168, 85, 247, 0.15)"
        title="Servidor de Arquivos"
        description="Armazenamento local com backup diário em nuvem e proteção contra perda de dados."
      />
    </>
  );
}

// ─── Reusable Feature Card ───
function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  actionLabel,
  actionHref,
  actionColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionColor?: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '2rem',
      transition: 'transform 0.3s, border-color 0.3s',
    }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: '#94a3b8',
        lineHeight: 1.5,
        marginBottom: actionLabel ? '1rem' : 0,
      }}
      >
        {description}
      </p>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            background: actionColor ?? 'linear-gradient(135deg, #2d82cc, #4db8ff)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <Download size={14} />
          {' '}
          {actionLabel}
        </a>
      )}
    </div>
  );
}

export default async function PortalLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  const tenantName = tenant?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const tenantType = tenant?.type ?? 'empresa_ti';
  const isOnline = tenant?.isOnline ?? true;
  const deviceCount = tenant?.deviceCount ?? 0;

  const isCamara = tenantType === 'camara';
  const subtitleText = isCamara
    ? 'Sistema Legislativo gerenciado pela'
    : 'Infraestrutura de TI gerenciada pela';
  const reportLabel = isCamara ? 'Sessões e Atas' : 'Relatórios e Status';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1121',
      color: '#fff',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}
    >
      {/* ─── Navbar ─── */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(11, 17, 33, 0.85)',
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          >
            {isCamara
              ? <Building2 size={20} color="#fff" />
              : <Server size={20} color="#fff" />}
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
            {tenantName}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a
            href="/relatorios"
            style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}
          >
            {reportLabel}
          </a>
          <a
            href="https://wa.me/message/J4U5D52DAZMED1"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}
          >
            Suporte R.TEC
          </a>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5rem 2rem 3rem',
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(45, 130, 204, 0.25) 0%, transparent 70%)',
        position: 'relative',
      }}
      >
        <div style={{
          position: 'absolute',
          top: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(77,184,255,0.15) 0%, transparent 60%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
        />

        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          boxShadow: '0 12px 40px rgba(77, 184, 255, 0.3)',
        }}
        >
          {isCamara
            ? <Building2 size={40} color="#fff" />
            : <Server size={40} color="#fff" />}
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        >
          {tenantName}
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: '#94a3b8',
          maxWidth: '600px',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}
        >
          {subtitleText}
          {' '}
          <strong style={{ color: '#4db8ff' }}>R.TEC Soluções Tecnológicas</strong>
          .
          {' '}
          {isCamara
            ? 'Automação legislativa, monitoramento e suporte técnico especializado.'
            : 'Servidores, VPN, videomonitoramento, backups e suporte técnico 24/7.'}
        </p>

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          borderRadius: '9999px',
          background: isOnline ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}
        >
          {isOnline
            ? <Wifi size={16} color="#22c55e" />
            : <WifiOff size={16} color="#ef4444" />}
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: isOnline ? '#22c55e' : '#ef4444',
          }}
          >
            {isOnline ? 'Sistemas Operacionais' : 'Manutenção Programada'}
          </span>
        </div>
      </section>

      {/* ─── Feature Cards (type-dependent) ─── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: isCamara
          ? 'repeat(auto-fit, minmax(280px, 1fr))'
          : 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        padding: '2rem',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
      >
        {isCamara
          ? <CamaraCards deviceCount={deviceCount} />
          : <EmpresaTICards deviceCount={deviceCount} />}
      </section>

      {/* ─── CTA: Portal de Relatórios ─── */}
      <section style={{ maxWidth: '1100px', margin: '1.5rem auto 3rem', padding: '0 2rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(45, 130, 204, 0.12) 0%, rgba(77, 184, 255, 0.06) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(77, 184, 255, 0.2)',
          padding: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
        >
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {isCamara ? 'Portal de Sessões' : 'Portal de Relatórios'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              {isCamara
                ? 'Acesse sessões anteriores, atas, históricos e relatórios completos.'
                : 'Acompanhe o status dos servidores, rede VPN, backups e alertas de TI.'}
            </p>
          </div>
          <a
            href="/relatorios"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2d82cc, #4db8ff)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxShadow: '0 4px 16px rgba(77, 184, 255, 0.3)',
            }}
          >
            <ExternalLink size={18} />
            {' '}
            {isCamara ? 'Acessar Sessões' : 'Acessar Painel de TI'}
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem',
      }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem',
        }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          >
            <FileText size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 600, color: '#94a3b8' }}>R.TEC Soluções Tecnológicas</span>
        </div>
        <p style={{ marginBottom: '0.5rem' }}>
          Infraestrutura, segurança e inovação para seu negócio.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem' }}>
          <a
            href="https://wa.me/message/J4U5D52DAZMED1"
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#4db8ff',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
            }}
          >
            <Mail size={14} />
            {' '}
            Contato
          </a>
          <a
            href="https://rtectecnologia.com.br"
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#4db8ff',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
            }}
          >
            <MapPin size={14} />
            {' '}
            Site Oficial
          </a>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#475569' }}>
          ©
          {' '}
          {new Date().getFullYear()}
          {' '}
          R.TEC Soluções Tecnológicas. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
