import { Database, Home, Monitor, Settings, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/tenants', icon: Users, label: 'Tenants' },
  { href: '/devices', icon: Monitor, label: 'Dispositivos' },
  { href: '/backups', icon: Database, label: 'Backups' },
  { href: '/servicos', icon: Settings, label: 'NOC Servicos' },
];

export default function ProtectedLayout(props: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <aside
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--sidebar-text)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          left: 0,
          position: 'fixed',
          top: 0,
          width: '260px',
          zIndex: 40,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            height: '70px',
            justifyContent: 'center',
            padding: '0 1.5rem',
          }}
        >
          <Image
            alt="R.TEC Solucoes Tecnologicas"
            height={42}
            priority
            src="/logo.png"
            style={{ height: '42px', objectFit: 'contain', width: 'auto' }}
            width={168}
          />
        </div>

        <nav style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '0.5rem', padding: '1.5rem 1rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} className="sidebar-link" href={item.href}>
                <Icon size={20} strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '1rem',
          }}
        >
          <LogoutButton />
          <div style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center' }}>
            R.TEC NOC Panel v2.0
          </div>
        </div>
      </aside>

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', marginLeft: '260px' }}>
        <header
          style={{
            WebkitBackdropFilter: 'blur(12px)',
            alignItems: 'center',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'var(--bg-glass)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            height: '70px',
            justifyContent: 'flex-end',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>NOC Admin</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Operations</div>
            </div>
            <div
              style={{
                alignItems: 'center',
                background: 'var(--brand-gradient)',
                borderRadius: '50%',
                color: '#fff',
                display: 'flex',
                fontWeight: 700,
                height: '36px',
                justifyContent: 'center',
                width: '36px',
              }}
            >
              RT
            </div>
          </div>
        </header>

        <main style={{ margin: '0 auto', maxWidth: '1400px', padding: '2rem', width: '100%' }}>
          {props.children}
        </main>
      </div>
    </div>
  );
}
