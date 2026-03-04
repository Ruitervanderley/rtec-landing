import { Database, Home, Monitor, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/devices', label: 'Dispositivos', icon: Monitor },
  { href: '/backups', label: 'Backups', icon: Database },
  { href: '/servicos', label: 'NOC Serviços', icon: Settings },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          top: 0,
          left: 0,
          zIndex: 40,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo Area */}
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', padding: '0 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 0.5rem', width: '100%' }}>
            <img src="/logo.png" alt="R.TEC Soluções Tecnológicas" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Navigation Area */}
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="sidebar-link">
                <Icon size={20} strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <LogoutButton />
          <div style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
            R.TEC NOC Panel v2.0
          </div>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header
          style={{
            height: '70px',
            backgroundColor: 'var(--bg-glass)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>NOC Admin</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operations</div>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              RT
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
