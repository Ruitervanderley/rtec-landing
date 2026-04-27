'use client';

import { Activity, Database, Home, Monitor, Settings, ShieldCheck, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', description: 'Panorama geral do stack' },
  { href: '/tenants', icon: Users, label: 'Empresas', description: 'Clientes, portais e licencas' },
  { href: '/devices', icon: Monitor, label: 'Dispositivos', description: 'Frota agrupada por tenant' },
  { href: '/backups', icon: Database, label: 'Backups', description: 'Historico e retencao' },
  { href: '/servicos', icon: Settings, label: 'Servicos', description: 'Catalogo e incidentes' },
];

export default function ProtectedLayout(props: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentItem = navItems.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date());

  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <div className="ops-sidebar__brand">
          <Image
            alt="R.TEC Solucoes Tecnologicas"
            height={44}
            priority
            src="/logo.png"
            style={{ height: '44px', objectFit: 'contain', width: 'auto' }}
            width={172}
          />
          <div className="ops-sidebar__brand-copy">
            <span className="ops-sidebar__eyebrow">Operations mesh</span>
            <strong className="ops-sidebar__title">NOC multi-tenant</strong>
          </div>
        </div>

        <div className="ops-sidebar__intro">
          <strong>Empresas separadas por contexto operacional</strong>
          <p>
            O painel agora prioriza leitura por tenant, frota conectada, saude do stack e atalho rapido para cada empresa.
          </p>
        </div>

        <nav className="ops-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`ops-nav__link${isActive ? ' is-active' : ''}`}
                href={item.href}
              >
                <span className="ops-nav__icon">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span className="ops-nav__copy">
                  <span className="ops-nav__label">{item.label}</span>
                  <span className="ops-nav__description">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ops-sidebar__footer">
          <LogoutButton />
          <div className="ops-sidebar__version">R.TEC NOC panel v3.0</div>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-topbar">
          <div className="ops-topbar__context">
            <span className="ops-topbar__eyebrow">R.TEC operational cockpit</span>
            <strong className="ops-topbar__title">{currentItem.label}</strong>
            <span className="ops-topbar__description">{currentItem.description}</span>
          </div>

          <div className="ops-topbar__cluster">
            <span className="ops-topbar__badge">
              <ShieldCheck size={14} />
              Empresas segmentadas
            </span>
            <span className="ops-topbar__badge">
              <Activity size={14} />
              {dateLabel}
            </span>
            <span className="ops-topbar__avatar">RT</span>
          </div>
        </header>

        <main className="ops-content">{props.children}</main>
      </div>
    </div>
  );
}
