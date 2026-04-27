import { AlertCircle, ArrowUpRight, Building2, ShieldCheck, Wifi } from 'lucide-react';
import Link from 'next/link';
import { CadastrarTenant } from '@/components/CadastrarTenant';
import { EditTenantModal } from '@/components/EditTenantModal';
import { formatDate, formatDateTime } from '@/lib/format';
import { getTenants } from '@/lib/ops-api';
import { getPortalAbsoluteUrl } from '@/lib/portalRouting';

export const dynamic = 'force-dynamic';

function isExpiringSoon(value: string | null) {
  if (!value) {
    return false;
  }

  const today = new Date();
  const expiration = new Date(`${value}T00:00:00`);
  if (Number.isNaN(expiration.getTime())) {
    return false;
  }

  const diffMs = expiration.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

export default async function TenantsPage() {
  let tenants = [] as Awaited<ReturnType<typeof getTenants>>;
  let error: string | null = null;

  try {
    tenants = await getTenants();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar tenants';
  }

  const activeTenants = tenants.filter(tenant => tenant.is_active).length;
  const expiringSoon = tenants.filter(tenant => isExpiringSoon(tenant.valid_until)).length;
  const totalOnlineDevices = tenants.reduce((sum, tenant) => sum + tenant.online_devices, 0);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">Mapa de clientes</span>
          <h1 className="page-hero__title">
            <Building2 size={28} color="var(--accent-primary)" />
            Empresas, portais e licencas
          </h1>
          <p className="page-hero__description">
            Cada empresa agora aparece como unidade operacional propria, com portal canonico, frota conectada, validade de licenca e atalho direto para a administracao do tenant.
          </p>
        </div>

        <div className="page-hero__actions">
          <CadastrarTenant />
        </div>
      </div>

      {error
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertCircle size={20} />
              {error}
            </div>
          )
        : null}

      {!error && tenants.length > 0
        ? (
            <div className="summary-strip">
              <div className="summary-card">
                <span className="summary-card__label">Empresas cadastradas</span>
                <strong className="summary-card__value">{tenants.length}</strong>
                <div className="summary-card__meta">
                  {activeTenants}
                  {' ativas na operacao.'}
                </div>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Frota online</span>
                <strong className="summary-card__value">{totalOnlineDevices}</strong>
                <div className="summary-card__meta">Soma de dispositivos online em todos os tenants.</div>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Licencas em janela</span>
                <strong className="summary-card__value">{expiringSoon}</strong>
                <div className="summary-card__meta">Expiram nos proximos 30 dias.</div>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">Portais prontos</span>
                <strong className="summary-card__value">{tenants.filter(tenant => tenant.portal_slug || tenant.subdomain).length}</strong>
                <div className="summary-card__meta">Com slug ou subdominio configurado.</div>
              </div>
            </div>
          )
        : null}

      {!error && tenants.length > 0
        ? (
            <div className="tenant-grid">
              {tenants.map((tenant) => {
                const portalSlug = tenant.portal_slug ?? tenant.subdomain ?? null;
                const portalUrl = portalSlug
                  ? getPortalAbsoluteUrl({ slug: portalSlug })
                  : null;
                const reportsUrl = portalSlug
                  ? getPortalAbsoluteUrl({ slug: portalSlug, path: '/relatorios' })
                  : null;

                return (
                  <article key={tenant.id} className="tenant-card">
                    <div className="tenant-card__header">
                      <div>
                        <div className="page-hero__eyebrow">
                          {tenant.type === 'camara' ? 'Camara municipal' : 'Empresa / TI gerenciado'}
                        </div>
                        <h2 className="tenant-card__title">{tenant.name}</h2>
                        <div className="tenant-card__subtle">
                          {portalSlug
                            ? `${portalSlug}.rtectecnologia.com.br`
                            : 'Portal ainda nao configurado'}
                        </div>
                      </div>

                      <div className="page-hero__actions">
                        <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-error'}`}>
                          {tenant.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {tenant.online_devices > 0
                          ? (
                              <span className="badge badge-success">
                                <Wifi size={12} />
                                {tenant.online_devices}
                                {' online'}
                              </span>
                            )
                          : (
                              <span className="badge badge-neutral">Sem online</span>
                            )}
                      </div>
                    </div>

                    <div className="tenant-card__mono">{tenant.license_key}</div>

                    <div className="tenant-card__stats">
                      <div className="tenant-card__stat">
                        <div className="tenant-card__stat-label">Dispositivos</div>
                        <div className="tenant-card__stat-value">{tenant.total_devices}</div>
                      </div>
                      <div className="tenant-card__stat">
                        <div className="tenant-card__stat-label">Online</div>
                        <div className="tenant-card__stat-value">{tenant.online_devices}</div>
                      </div>
                      <div className="tenant-card__stat">
                        <div className="tenant-card__stat-label">Ultimo heartbeat</div>
                        <div className="tenant-card__stat-value">{formatDateTime(tenant.last_seen_at)}</div>
                      </div>
                      <div className="tenant-card__stat">
                        <div className="tenant-card__stat-label">Ultimo backup</div>
                        <div className="tenant-card__stat-value">{formatDateTime(tenant.last_backup_at)}</div>
                      </div>
                    </div>

                    <div className="tenant-card__stats">
                      <div className="tenant-card__stat">
                        <div className="tenant-card__stat-label">Validade</div>
                        <div className="tenant-card__stat-value">{formatDate(tenant.valid_until)}</div>
                      </div>
                      <div className="tenant-card__stat">
                        <div className="tenant-card__stat-label">Portal</div>
                        <div className="tenant-card__stat-value">{portalSlug || '--'}</div>
                      </div>
                    </div>

                    <div className="tenant-card__actions">
                      <div className="tenant-card__links">
                        <Link className="inline-link" href={`/tenants/${tenant.id}`}>
                          Gerenciar tenant
                          <ArrowUpRight size={14} />
                        </Link>

                        {portalUrl
                          ? (
                              <>
                                <a className="inline-link inline-link--muted" href={portalUrl} rel="noreferrer" target="_blank">
                                  Abrir portal
                                </a>
                                <a className="inline-link inline-link--muted" href={reportsUrl ?? portalUrl} rel="noreferrer" target="_blank">
                                  Relatorios
                                </a>
                              </>
                            )
                          : (
                              <span className="inline-link inline-link--muted">
                                <ShieldCheck size={14} />
                                Defina o slug para liberar o portal
                              </span>
                            )}
                      </div>

                      <EditTenantModal tenant={tenant} />
                    </div>
                  </article>
                );
              })}
            </div>
          )
        : null}

      {!error && tenants.length === 0
        ? (
            <div className="empty-state">
              Nenhuma empresa cadastrada no momento.
            </div>
          )
        : null}
    </section>
  );
}
