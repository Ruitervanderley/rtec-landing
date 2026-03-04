import type { NextRequest } from 'next/server';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

const ADMIN_HOSTS = ['painel', 'www', 'localhost'];

function extractSubdomain(host: string): string | null {
  // ouvidor.rtectecnologia.com.br → "ouvidor"
  const hostname = host.split(':')[0]!;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');
  // ouvidor.rtectecnologia.com.br = 4 parts → subdomain = ouvidor
  if (parts.length <= 3) {
    return null;
  }

  const sub = parts[0]!.toLowerCase();
  if (ADMIN_HOSTS.includes(sub)) {
    return null;
  }

  return sub;
}

// ─── Lightweight JWT verification in Edge Runtime ───
function verifyTokenInMiddleware(token: string): boolean {
  try {
    const secret = process.env.NOC_SESSION_SECRET ?? 'rtec-dev-secret-change-in-production-2026';
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    // Compare signatures
    if (signature !== expectedSig) {
      return false;
    }

    // Check expiration
    const payload = JSON.parse(Buffer.from(body!, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  const host = request.headers.get('host') ?? 'localhost';
  const subdomain = extractSubdomain(host);

  // ─── Static / API assets pass through ───
  if (
    currentPath.startsWith('/_next')
    || currentPath.startsWith('/api')
    || currentPath.includes('.')
  ) {
    return NextResponse.next();
  }

  // ─── TENANT PORTAL MODE (ouvidor.rtectecnologia.com.br) ───
  if (subdomain) {
    if (currentPath === '/' || currentPath === '') {
      return NextResponse.rewrite(new URL(`/portal/${subdomain}`, request.url));
    }
    return NextResponse.rewrite(new URL(`/portal/${subdomain}${currentPath}`, request.url));
  }

  // ─── ADMIN PANEL MODE ───
  if (currentPath.startsWith('/login') || currentPath.startsWith('/portal')) {
    return NextResponse.next();
  }

  // ─── Validate signed session token ───
  const sessionCookie = request.cookies.get('rtec_noc_session');

  if (!sessionCookie || !verifyTokenInMiddleware(sessionCookie.value)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', currentPath);
    return NextResponse.redirect(loginUrl);
  }

  if (currentPath === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ─── Apply security headers ───
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
