import Link from 'next/link';

export const metadata = {
  title: 'RTEC Ops Panel',
  description: 'Painel operacional interno de licencas, dispositivos e backups',
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tenants', label: 'Tenants' },
  { href: '/devices', label: 'Dispositivos' },
  { href: '/backups', label: 'Backups' },
  { href: '/servicos', label: 'NOC Servicos' },
];

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          background: '#f3f6fb',
          color: '#0f172a',
        }}
      >
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: '#0f172a',
            color: '#f8fafc',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '0.9rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <Link
              href="/dashboard"
              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, letterSpacing: 0.2 }}
            >
              RTEC Painel Operacional
            </Link>
            <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    padding: '0.3rem 0.55rem',
                    borderRadius: 7,
                    border: '1px solid #334155',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main style={{ padding: '1.2rem 1.4rem', maxWidth: 1280, margin: '0 auto' }}>
          {props.children}
        </main>
      </body>
    </html>
  );
}
