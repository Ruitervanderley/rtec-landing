import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Env } from '@/lib/Env';
import { extractTenantSubdomain, getPortalPath } from '@/lib/portalRouting';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/sessionConfig';

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

function decodeBase64Url(value: string) {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalizedValue.length % 4;
  const paddedValue = padding === 0
    ? normalizedValue
    : `${normalizedValue}${'='.repeat(4 - padding)}`;

  return atob(paddedValue);
}

async function verifyTokenInMiddleware(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [header, body, signature] = parts;
  if (!header || !body || !signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(Env.nocSessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const expectedSignatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(`${header}.${body}`),
  );
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(expectedSignatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  if (signature !== expectedSignature) {
    return false;
  }

  const payload = JSON.parse(decodeBase64Url(body)) as { exp?: number };
  if (payload.exp && Date.now() > payload.exp) {
    return false;
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? 'localhost';
  const subdomain = extractTenantSubdomain(host);

  if (
    currentPath.startsWith('/_next')
    || currentPath.startsWith('/api')
    || currentPath.includes('.')
  ) {
    return NextResponse.next();
  }

  if (subdomain) {
    const canonicalPortalRoot = getPortalPath({ slug: subdomain });

    if (currentPath === '/' || currentPath === '') {
      return applySecurityHeaders(
        NextResponse.rewrite(new URL(canonicalPortalRoot, request.url)),
      );
    }

    if (currentPath === canonicalPortalRoot || currentPath.startsWith(`${canonicalPortalRoot}/`)) {
      return applySecurityHeaders(NextResponse.next());
    }

    if (currentPath.startsWith('/portal/')) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(canonicalPortalRoot, request.url)),
      );
    }

    return applySecurityHeaders(
      NextResponse.rewrite(new URL(`${canonicalPortalRoot}${currentPath}`, request.url)),
    );
  }

  if (currentPath.startsWith('/login') || currentPath.startsWith('/portal')) {
    return applySecurityHeaders(NextResponse.next());
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie || !(await verifyTokenInMiddleware(sessionCookie))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', currentPath);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (currentPath === '/') {
    return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
