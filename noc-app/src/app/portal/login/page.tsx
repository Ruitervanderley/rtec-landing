import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalReportsLoginForm } from '@/components/PortalReportsLoginForm';
import { getPortalTenantSummary, PortalApiError } from '@/lib/portalApi';
import { getPortalPath } from '@/lib/portalRouting';
import { getPortalSession, shouldRefreshPortalSession } from '@/lib/portalSession';

type PortalLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    slug?: string;
  }>;
};

export default async function PortalLoginPage(props: PortalLoginPageProps) {
  const searchParams = await props.searchParams;
  const slug = String(searchParams.slug ?? '').trim().toLowerCase();
  const errorMessage = String(searchParams.error ?? '').trim();

  if (!slug) {
    redirect('/');
  }

  const session = await getPortalSession({ tenantSlug: slug });
  if (session) {
    const reportsPath = getPortalPath({ slug, path: '/relatorios' });
    if (shouldRefreshPortalSession(session)) {
      if (session.refreshToken) {
        redirect(`/portal/auth/refresh?slug=${encodeURIComponent(slug)}&returnTo=${encodeURIComponent(reportsPath)}`);
      }
    } else {
      redirect(reportsPath);
    }
  }

  let tenantName = slug;
  let tenantSummary: Awaited<ReturnType<typeof getPortalTenantSummary>> = null;

  try {
    tenantSummary = await getPortalTenantSummary(slug);
    if (!tenantSummary) {
      redirect(getPortalPath({ slug }));
    }

    tenantName = tenantSummary.name;
  } catch (error) {
    if (error instanceof PortalApiError && error.status === 404) {
      redirect(getPortalPath({ slug }));
    }
  }

  return (
    <main className="portal-shell">
      <section className="portal-auth-shell">
        <div className="portal-auth-panel">
          <div className="portal-auth-panel__content">
            <Link className="portal-inline-link portal-inline-link--muted" href={getPortalPath({ slug })}>
              <ArrowLeft size={15} />
              Voltar ao portal
            </Link>

            <div className="portal-chip">Portal autenticado</div>
            <h1 className="portal-auth-panel__title">
              Relatorios de
              {' '}
              {tenantName}
            </h1>
            <p className="portal-auth-panel__description">
              Entre com o mesmo email e senha cadastrados para este tenant. O acesso valida a empresa antes de liberar os
              relatórios operacionais.
            </p>

            {errorMessage
              ? <div className="portal-inline-alert portal-inline-alert--error">{errorMessage}</div>
              : null}

            <PortalReportsLoginForm slug={slug} />
          </div>

          <aside className="portal-auth-sidecard">
            <div className="portal-auth-sidecard__icon">
              <Lock size={28} />
            </div>
            <h2 className="portal-auth-sidecard__title">Acesso por tenant</h2>
            <p className="portal-auth-sidecard__copy">
              Cada usuário entra apenas no próprio ambiente, com sessão isolada e visibilidade restrita aos dados da empresa.
            </p>

            <div className="portal-auth-sidecard__stack">
              <div className="portal-auth-signal">
                <ShieldCheck size={16} />
                <span>
                  {tenantSummary?.isActive ? 'Licença ativa' : 'Licença inativa'}
                </span>
              </div>
              <div className="portal-auth-signal">
                <ShieldCheck size={16} />
                <span>
                  {tenantSummary?.onlineDevices ?? 0}
                  {' dispositivo(s) online agora'}
                </span>
              </div>
              <div className="portal-auth-signal">
                <ShieldCheck size={16} />
                <span>
                  {tenantSummary?.licensedUsers ?? 0}
                  {' licença(s) válida(s)'}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
