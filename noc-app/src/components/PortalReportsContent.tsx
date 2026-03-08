'use client';

import type { PortalReportsResponse } from '@/lib/portalApi';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Clock3,
  HardDrive,
  Lock,
  Monitor,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logoutPortalAction } from '@/app/actions/portal';
import { PortalReportsLoginForm } from '@/components/PortalReportsLoginForm';
import { formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { getPortalPath } from '@/lib/portalRouting';

type LoadState
  = | { message: string | null; status: 'error' | 'login' }
    | { status: 'loading' }
    | { reports: PortalReportsResponse; status: 'ready' };

function MetricCard(props: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '1.25rem' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>{props.label}</div>
      <div style={{ fontSize: '1.95rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{props.value}</div>
    </div>
  );
}

function SectionCard(props: { children: React.ReactNode; title: string }) {
  return (
    <section style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem' }}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function Chip(props: {
  label: string;
  tone: 'danger' | 'good' | 'neutral' | 'warning';
}) {
  const palette = props.tone === 'good'
    ? { background: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.28)', color: '#86efac' }
    : props.tone === 'warning'
      ? { background: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.28)', color: '#fcd34d' }
      : props.tone === 'danger'
        ? { background: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.28)', color: '#fca5a5' }
        : { background: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.28)', color: '#cbd5e1' };

  return (
    <span style={{ background: palette.background, border: `1px solid ${palette.border}`, borderRadius: '999px', color: palette.color, display: 'inline-flex', fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.65rem' }}>
      {props.label}
    </span>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div style={{ alignItems: 'center', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', display: 'flex', gap: '0.75rem', justifyContent: 'space-between', padding: '0.55rem 0' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{props.label}</span>
      <span style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>{props.value}</span>
    </div>
  );
}

function ListBox(props: { empty: string; items: string[] }) {
  if (props.items.length === 0) {
    return <p style={{ color: '#94a3b8', margin: 0 }}>{props.empty}</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.7rem' }}>
      {props.items.map(item => (
        <div key={item} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', color: '#cbd5e1', padding: '0.85rem 1rem' }}>
          {item}
        </div>
      ))}
    </div>
  );
}

async function parseResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as { error?: string };
}

function getAccessLabel(status: PortalReportsResponse['license']['accessStatus']) {
  if (status === 'active') {
    return 'Acesso ativo';
  }

  if (status === 'tenant_expired') {
    return 'Licenca expirada';
  }

  if (status === 'tenant_inactive') {
    return 'Tenant inativo';
  }

  return 'Usuario expirado';
}

function getAccessTone(status: PortalReportsResponse['license']['accessStatus']) {
  if (status === 'active') {
    return 'good' as const;
  }

  if (status === 'tenant_inactive') {
    return 'neutral' as const;
  }

  return 'danger' as const;
}

function getTenantLabel(type: string) {
  return type === 'camara' ? 'Camara / LegislativoTimer' : 'Empresa TI / infraestrutura';
}

function renderLoginState(props: { message: string | null; slug: string; tenantName: string }) {
  return (
    <main style={{ alignItems: 'center', background: '#0b1121', color: '#fff', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(148, 163, 184, 0.14)', borderRadius: '24px', maxWidth: '460px', padding: '2rem', width: '100%' }}>
        <div style={{ alignItems: 'center', background: 'rgba(77, 184, 255, 0.12)', borderRadius: '16px', display: 'inline-flex', height: '56px', justifyContent: 'center', marginBottom: '1.25rem', width: '56px' }}>
          <Lock size={28} color="#4db8ff" />
        </div>
        <p style={{ color: '#4db8ff', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Portal autenticado</p>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 900, margin: '0 0 0.75rem' }}>
          Relatorios de
          {props.tenantName}
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.25rem' }}>Entre com o mesmo email e senha do admin criado para este tenant no Supabase.</p>
        {props.message
          ? <div style={{ border: '1px solid rgba(248, 113, 113, 0.35)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.9rem 1rem' }}>{props.message}</div>
          : null}
        <PortalReportsLoginForm slug={props.slug} />
        <div style={{ marginTop: '1.25rem' }}>
          <Link href={getPortalPath({ slug: props.slug })} style={{ color: '#94a3b8', fontSize: '0.9rem', textDecoration: 'none' }}>Voltar ao portal</Link>
        </div>
      </div>
    </main>
  );
}

function renderLoadError(props: { message: string; onRetry: () => void; slug: string }) {
  return (
    <main style={{ alignItems: 'center', background: '#0b1121', color: '#fff', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '24px', maxWidth: '520px', padding: '2rem', width: '100%' }}>
        <div style={{ alignItems: 'center', background: 'rgba(248, 113, 113, 0.12)', borderRadius: '16px', color: '#fca5a5', display: 'inline-flex', height: '56px', justifyContent: 'center', marginBottom: '1rem', width: '56px' }}>
          <AlertTriangle size={28} />
        </div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0 0 0.75rem' }}>Falha ao carregar os relatorios</h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.25rem' }}>{props.message}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={props.onRetry} style={{ background: 'linear-gradient(135deg, #2d82cc, #4db8ff)', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontWeight: 700, padding: '0.85rem 1rem' }} type="button">Tentar novamente</button>
          <Link href={getPortalPath({ slug: props.slug })} style={{ border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', color: '#cbd5e1', fontWeight: 700, padding: '0.85rem 1rem', textDecoration: 'none' }}>Voltar ao portal</Link>
        </div>
      </div>
    </main>
  );
}

export function PortalReportsContent(props: {
  hasSession: boolean;
  slug: string;
  tenantName: string;
}) {
  const [loadKey, setLoadKey] = useState(0);
  const [state, setState] = useState<LoadState>(() => (props.hasSession ? { status: 'loading' } : { message: null, status: 'login' }));

  useEffect(() => {
    if (!props.hasSession) {
      return;
    }

    const abortController = new AbortController();

    async function loadReports() {
      setState({ status: 'loading' });

      try {
        const response = await fetch(`/api/portal/${props.slug}/reports`, {
          cache: 'no-store',
          signal: abortController.signal,
        });

        if (response.status === 401 || response.status === 403) {
          const payload = await parseResponse(response);
          setState({ message: payload.error || 'Sua sessao expirou ou nao pertence a este tenant.', status: 'login' });
          return;
        }

        if (!response.ok) {
          const payload = await parseResponse(response);
          setState({ message: payload.error || 'Nao foi possivel carregar os relatorios agora.', status: 'error' });
          return;
        }

        setState({ reports: (await response.json()) as PortalReportsResponse, status: 'ready' });
      } catch (error) {
        if (!abortController.signal.aborted) {
          setState({ message: error instanceof Error ? error.message : 'Falha ao carregar os relatorios.', status: 'error' });
        }
      }
    }

    void loadReports();

    return () => abortController.abort();
  }, [loadKey, props.hasSession, props.slug]);

  if (state.status === 'login') {
    return renderLoginState({ message: state.message, slug: props.slug, tenantName: props.tenantName });
  }

  if (state.status === 'loading') {
    return (
      <main style={{ alignItems: 'center', background: '#0b1121', color: '#fff', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ color: '#94a3b8', fontSize: '1rem' }}>Carregando relatorios...</div>
      </main>
    );
  }

  if (state.status === 'error') {
    return renderLoadError({
      message: state.message || 'Falha ao carregar os relatorios.',
      onRetry: () => setLoadKey(current => current + 1),
      slug: props.slug,
    });
  }

  if (state.status !== 'ready') {
    return null;
  }

  const reports = state.reports;
  const isCamara = reports.tenant.type === 'camara';
  const activeUsers = reports.users.filter(user => user.accessStatus === 'active').length;
  const metrics = isCamara
    ? [
        { label: 'Usuarios ativos', value: String(activeUsers) },
        { label: 'Usuarios licenciados', value: String(reports.license.licensedUsers) },
        { label: 'Admins', value: String(reports.tenant.adminUsers) },
        { label: 'Dispositivos online', value: String(reports.stats.onlineDevices) },
      ]
    : [
        { label: 'Dispositivos', value: String(reports.stats.totalDevices) },
        { label: 'Online', value: String(reports.stats.onlineDevices) },
        { label: 'Backups 24h', value: String(reports.stats.uploadedBackups24h) },
        { label: 'Usuarios ativos', value: String(activeUsers) },
      ];

  return (
    <main style={{ background: '#0b1121', color: '#fff', minHeight: '100vh', padding: '2rem 1.5rem 3rem' }}>
      <div style={{ margin: '0 auto', maxWidth: '1180px' }}>
        <header style={{ alignItems: 'flex-start', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: '#4db8ff', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.45rem' }}>Portal autenticado</p>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 0.75rem' }}>{reports.tenant.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <Chip label={getTenantLabel(reports.tenant.type)} tone={isCamara ? 'warning' : 'good'} />
              <Chip label={getAccessLabel(reports.license.accessStatus)} tone={getAccessTone(reports.license.accessStatus)} />
            </div>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              Logado como
              {reports.profile.displayName || reports.profile.email}
            </p>
          </div>

          <div style={{ alignItems: 'center', display: 'flex', gap: '0.8rem' }}>
            <Link href={getPortalPath({ slug: props.slug })} style={{ border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', color: '#cbd5e1', fontWeight: 700, padding: '0.85rem 1rem', textDecoration: 'none' }}>Portal publico</Link>
            <form action={logoutPortalAction}>
              <input type="hidden" name="slug" value={props.slug} />
              <button type="submit" style={{ background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '12px', color: '#fca5a5', cursor: 'pointer', fontWeight: 700, padding: '0.85rem 1rem' }}>Sair</button>
            </form>
          </div>
        </header>

        {reports.infrastructureIsDefault
          ? (
              <div style={{ alignItems: 'center', background: 'rgba(77, 184, 255, 0.12)', border: '1px solid rgba(77, 184, 255, 0.24)', borderRadius: '16px', color: '#bfdbfe', display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem 1.1rem' }}>
                <BookOpen size={18} />
                O tenant ainda usa um perfil tecnico inicial. O NOC pode complementar esse inventario no painel interno.
              </div>
            )
          : null}

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: '1.5rem' }}>
          {metrics.map(metric => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '1.5rem' }}>
          <SectionCard title={isCamara ? 'Licenca e usuarios' : 'Licenca e acesso'}>
            <DetailRow label="Status do tenant" value={reports.license.tenantIsActive ? 'Ativo' : 'Inativo'} />
            <DetailRow label="Validade do tenant" value={formatDate(reports.license.tenantValidUntil)} />
            <DetailRow label="Validade do usuario" value={formatDate(reports.license.userValidUntil)} />
            <DetailRow label="Usuarios vinculados" value={String(reports.tenant.userCount)} />
            <DetailRow label="Usuarios licenciados" value={String(reports.license.licensedUsers)} />
            <DetailRow label="Admins" value={String(reports.tenant.adminUsers)} />
          </SectionCard>

          <SectionCard title={isCamara ? 'Resumo do ambiente' : 'Resumo operacional'}>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                {isCamara ? <Building2 size={18} color="#4db8ff" /> : <Server size={18} color="#4db8ff" />}
                {getTenantLabel(reports.tenant.type)}
              </div>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <Clock3 size={18} color="#4db8ff" />
                Ultimo heartbeat:
                {' '}
                {formatDateTime(reports.stats.lastSeenAt)}
              </div>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <HardDrive size={18} color="#4db8ff" />
                Ultimo backup:
                {' '}
                {formatDateTime(reports.stats.lastBackupAt)}
              </div>
              <div style={{ alignItems: 'center', color: '#cbd5e1', display: 'flex', gap: '0.6rem' }}>
                <ShieldCheck size={18} color="#4db8ff" />
                {reports.infrastructure.overview || 'Sem resumo tecnico cadastrado.'}
              </div>
            </div>
          </SectionCard>
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '1.5rem' }}>
          <SectionCard title={isCamara ? 'Usuarios do tenant' : 'Equipe e licencas'}>
            {reports.users.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum usuario vinculado ao tenant.</p>
              : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {reports.users.map(user => (
                      <div key={user.userId} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
                          <strong>{user.displayName || user.email}</strong>
                          <Chip label={user.isAdmin ? 'ADMIN' : 'USUARIO'} tone={user.isAdmin ? 'good' : 'neutral'} />
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>{user.email}</div>
                        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.45rem' }}>
                          <Chip label={getAccessLabel(user.accessStatus)} tone={getAccessTone(user.accessStatus)} />
                          <Chip label={`Validade ${formatDate(user.validUntil)}`} tone="neutral" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </SectionCard>

          {isCamara
            ? (
                <SectionCard title="LegislativoTimer e apoio operacional">
                  <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginTop: 0 }}>
                    {reports.infrastructure.notes || 'Sem observacoes adicionais registradas para este tenant.'}
                  </p>
                  <ListBox empty="Sem responsabilidades cadastradas." items={reports.infrastructure.responsibilities} />
                </SectionCard>
              )
            : (
                <SectionCard title="Rede e VPN">
                  <DetailRow label="Origem WAN" value={reports.infrastructure.network.wanSource || '--'} />
                  <DetailRow label="Gateway" value={`${reports.infrastructure.network.gatewayName || '--'} | ${reports.infrastructure.network.gatewayIp || '--'}`} />
                  <DetailRow label="Firewall" value={`${reports.infrastructure.network.firewallName || '--'} | ${reports.infrastructure.network.firewallLanIp || '--'}`} />
                  <DetailRow label="Sub-rede" value={reports.infrastructure.network.lanSubnet || '--'} />
                  <DetailRow label="Switch" value={reports.infrastructure.network.switchName || '--'} />
                  <DetailRow label="VPN" value={reports.infrastructure.vpn.provider || '--'} />
                  <DetailRow label="Tailnet" value={reports.infrastructure.vpn.tailnetIp || '--'} />
                  <DetailRow label="Dominio" value={reports.infrastructure.vpn.domain || '--'} />
                  <DetailRow label="Headscale" value={reports.infrastructure.vpn.headscaleDomain || '--'} />
                  <DetailRow label="DERP" value={reports.infrastructure.vpn.derpDomain || '--'} />
                  <DetailRow label="Subnet routing" value={reports.infrastructure.vpn.subnetRouting ? 'Ativo' : 'Inativo'} />
                </SectionCard>
              )}
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '1.5rem' }}>
          <SectionCard title={isCamara ? 'Operacao tecnica' : 'Infraestrutura principal'}>
            {isCamara
              ? <ListBox empty="Sem ativos tecnicos cadastrados." items={reports.infrastructure.assets.map(asset => `${asset.title}: ${asset.role}`)} />
              : reports.infrastructure.assets.length === 0
                ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum ativo tecnico cadastrado.</p>
                : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {reports.infrastructure.assets.map(asset => (
                        <div key={asset.id} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                          <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
                            <strong>{asset.title}</strong>
                            <Chip label={asset.status.toUpperCase()} tone={asset.status === 'active' ? 'good' : asset.status === 'maintenance' ? 'warning' : 'neutral'} />
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>{asset.role}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.3rem' }}>
                            {asset.platform || '--'}
                            {' '}
                            |
                            {asset.host || '--'}
                            {' '}
                            |
                            {asset.ipAddress || '--'}
                            {' '}
                            | porta
                            {asset.port || '--'}
                          </div>
                          {asset.notes ? <div style={{ color: '#cbd5e1', fontSize: '0.84rem', marginTop: '0.45rem' }}>{asset.notes}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
          </SectionCard>

          <SectionCard title={isCamara ? 'Documentacao tecnica' : 'Monitoramento e automacao'}>
            {isCamara
              ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {reports.infrastructure.docs.length === 0
                      ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum link tecnico cadastrado.</p>
                      : reports.infrastructure.docs.map(doc => (
                          <a key={doc.url} href={doc.url} rel="noreferrer" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', color: '#93c5fd', padding: '0.9rem 1rem', textDecoration: 'none' }} target="_blank">{doc.label}</a>
                        ))}
                  </div>
                )
              : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem', marginBottom: '0.55rem' }}>
                        <Monitor size={16} color="#4db8ff" />
                        <strong style={{ fontSize: '0.92rem' }}>Resumo</strong>
                      </div>
                      <p style={{ color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{reports.infrastructure.monitoring.summary || 'Sem resumo de monitoramento cadastrado.'}</p>
                    </div>
                    <div>
                      <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem', marginBottom: '0.55rem' }}>
                        <Network size={16} color="#4db8ff" />
                        <strong style={{ fontSize: '0.92rem' }}>Topologia</strong>
                      </div>
                      <ListBox empty="Sem topologia cadastrada." items={reports.infrastructure.network.topology} />
                    </div>
                    <div>
                      <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem', marginBottom: '0.55rem' }}>
                        <Wifi size={16} color="#4db8ff" />
                        <strong style={{ fontSize: '0.92rem' }}>Nodes da VPN</strong>
                      </div>
                      <ListBox empty="Sem nodes de VPN cadastrados." items={reports.infrastructure.vpn.nodes} />
                    </div>
                  </div>
                )}
          </SectionCard>
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '1.5rem' }}>
          <SectionCard title={isCamara ? 'Stack e melhorias' : 'Documentacao e responsabilidades'}>
            {isCamara
              ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem' }}>Stack atual</div>
                      <ListBox empty="Sem stack cadastrada." items={reports.infrastructure.monitoring.stack} />
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem' }}>Melhorias planejadas</div>
                      <ListBox empty="Sem melhorias cadastradas." items={reports.infrastructure.monitoring.improvements} />
                    </div>
                  </div>
                )
              : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem' }}>Links tecnicos</div>
                      {reports.infrastructure.docs.length === 0
                        ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum link tecnico cadastrado.</p>
                        : (
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                              {reports.infrastructure.docs.map(doc => (
                                <a key={doc.url} href={doc.url} rel="noreferrer" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', color: '#93c5fd', padding: '0.9rem 1rem', textDecoration: 'none' }} target="_blank">{doc.label}</a>
                              ))}
                            </div>
                          )}
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem' }}>Responsabilidades</div>
                      <ListBox empty="Sem responsabilidades cadastradas." items={reports.infrastructure.responsibilities} />
                    </div>
                  </div>
                )}
          </SectionCard>
        </section>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <SectionCard title="Dispositivos do tenant">
            {reports.devices.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum dispositivo vinculado.</p>
              : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {reports.devices.slice(0, 8).map(device => (
                      <div key={device.id} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
                          <strong>{device.deviceName}</strong>
                          <Chip label={device.isOnline ? 'ONLINE' : 'OFFLINE'} tone={device.isOnline ? 'good' : 'danger'} />
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                          ID:
                          {device.deviceId}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.2rem' }}>
                          Ultimo status:
                          {device.lastStatus || '--'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.2rem' }}>
                          Ultimo heartbeat:
                          {formatDateTime(device.lastSeenAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </SectionCard>

          <SectionCard title="Backups recentes">
            {reports.backups.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum backup recente.</p>
              : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {reports.backups.slice(0, 8).map(backup => (
                      <div key={backup.id} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'space-between' }}>
                          <strong>{backup.fileName}</strong>
                          <Chip label={backup.status} tone={backup.status === 'FAILED' ? 'danger' : 'good'} />
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.35rem' }}>
                          {backup.backupType}
                          {' '}
                          |
                          {' '}
                          {formatBytes(backup.sizeBytes)}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.2rem' }}>
                          Criado em
                          {formatDateTime(backup.createdAt)}
                        </div>
                        {backup.errorMessage ? <div style={{ color: '#fca5a5', fontSize: '0.84rem', marginTop: '0.35rem' }}>{backup.errorMessage}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
          </SectionCard>

          <SectionCard title="Alertas recentes">
            {reports.alerts.length === 0
              ? <p style={{ color: '#94a3b8', margin: 0 }}>Nenhum alerta recente para este tenant.</p>
              : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {reports.alerts.slice(0, 8).map(alert => (
                      <div key={alert.id} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                        <div style={{ alignItems: 'center', display: 'flex', gap: '0.55rem', marginBottom: '0.35rem' }}>
                          <ShieldAlert size={16} color="#f59e0b" />
                          <strong>{alert.alertType}</strong>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                          Criado em
                          {formatDateTime(alert.createdAt)}
                          . Entregue:
                          {alert.delivered ? 'sim' : 'nao'}
                          .
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
