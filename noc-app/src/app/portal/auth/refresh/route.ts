import { NextResponse } from 'next/server';
import { Env } from '@/lib/Env';
import { getPortalPath } from '@/lib/portalRouting';
import { readPortalSession, refreshPortalSessionPayload } from '@/lib/portalSession';
import { createSignedSessionToken } from '@/lib/ServerSession';
import { PORTAL_SESSION_COOKIE_NAME } from '@/lib/sessionConfig';

function getSafeReturnTo(props: {
  raw: string;
  slug: string;
}) {
  const candidate = props.raw.trim();
  if (!candidate) {
    return getPortalPath({ slug: props.slug, path: '/relatorios' });
  }

  if (!candidate.startsWith('/')) {
    return getPortalPath({ slug: props.slug, path: '/relatorios' });
  }

  if (!candidate.startsWith('/portal/')) {
    return getPortalPath({ slug: props.slug, path: '/relatorios' });
  }

  return candidate;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = String(url.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!slug) {
    return NextResponse.redirect(new URL('/', url));
  }

  const returnTo = getSafeReturnTo({
    raw: String(url.searchParams.get('returnTo') ?? ''),
    slug,
  });

  const session = await readPortalSession();
  if (!session || session.tenantSlug !== slug) {
    const response = NextResponse.redirect(new URL(`/portal/login?slug=${encodeURIComponent(slug)}`, url));
    response.cookies.delete(PORTAL_SESSION_COOKIE_NAME);
    return response;
  }

  try {
    const nextSession = await refreshPortalSessionPayload({ session });
    const token = createSignedSessionToken({
      payload: nextSession,
      secret: Env.nocSessionSecret,
    });

    const response = NextResponse.redirect(new URL(returnTo, url));
    response.cookies.set(PORTAL_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(nextSession.exp),
      path: '/',
    });

    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL(
        `/portal/login?slug=${encodeURIComponent(slug)}&error=${encodeURIComponent('Sua sessao expirou. Entre novamente.')}`,
        url,
      ),
    );
    response.cookies.delete(PORTAL_SESSION_COOKIE_NAME);
    return response;
  }
}
