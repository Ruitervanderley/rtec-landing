import { cookies } from 'next/headers';
import { Env } from '@/lib/Env';
import { createSignedSessionToken, verifySignedSessionToken } from '@/lib/ServerSession';
import { PORTAL_SESSION_COOKIE_NAME } from '@/lib/sessionConfig';

const PORTAL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60 * 1000;

type SupabaseSessionResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  user?: {
    email?: string;
  };
};

export class PortalSessionError extends Error {
  public readonly status: number;

  public readonly code: string;

  public constructor(props: {
    code: string;
    message: string;
    status: number;
  }) {
    super(props.message);
    this.name = 'PortalSessionError';
    this.status = props.status;
    this.code = props.code;
  }
}

export type PortalSessionPayload = {
  accessToken: string;
  accessTokenExpiresAt: number;
  email: string;
  exp: number;
  refreshToken: string | null;
  tenantId: string;
  tenantSlug: string;
};

export function shouldRefreshPortalSession(session: PortalSessionPayload) {
  return session.accessTokenExpiresAt <= Date.now() + ACCESS_TOKEN_REFRESH_THRESHOLD_MS;
}

async function requestSupabaseSession(props: {
  email?: string;
  password?: string;
  refreshToken?: string;
  grantType: 'password' | 'refresh_token';
}) {
  const response = await fetch(`${Env.supabaseUrl}/auth/v1/token?grant_type=${props.grantType}`, {
    method: 'POST',
    headers: {
      'apikey': Env.supabaseAnonKey,
      'Authorization': `Bearer ${Env.supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      props.grantType === 'password'
        ? {
            email: props.email,
            password: props.password,
          }
        : {
            refresh_token: props.refreshToken,
          },
    ),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
    expires_in?: number;
    refresh_token?: string;
    user?: {
      email?: string;
    };
  };

  if (!response.ok || !payload.access_token || !payload.expires_in) {
    throw new PortalSessionError({
      code: payload.error_code || payload.error || 'SUPABASE_AUTH_ERROR',
      message: payload.error_description || payload.error || 'Supabase auth failed',
      status: response.status,
    });
  }

  return payload as SupabaseSessionResponse;
}

function buildPortalSessionPayload(props: {
  session: SupabaseSessionResponse;
  tenantId: string;
  tenantSlug: string;
  email?: string;
}) {
  const accessTokenExpiresAt = Date.now() + props.session.expires_in * 1000;
  const sessionExpiresAt = Date.now() + PORTAL_SESSION_TTL_MS;

  return {
    accessToken: props.session.access_token,
    accessTokenExpiresAt,
    email: props.email ?? props.session.user?.email ?? '',
    exp: sessionExpiresAt,
    refreshToken: props.session.refresh_token ?? null,
    tenantId: props.tenantId,
    tenantSlug: props.tenantSlug,
  } satisfies PortalSessionPayload;
}

/**
 * Clears the current portal session cookie.
 * Only call this from a Server Action or Route Handler.
 * @returns Promise that resolves when the cookie is deleted.
 */
export async function clearPortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE_NAME);
}

/**
 * Reads and verifies the current portal session cookie.
 * @returns Parsed portal session payload or null.
 */
export async function readPortalSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  return verifySignedSessionToken<PortalSessionPayload>({
    token: raw,
    secret: Env.nocSessionSecret,
  });
}

/**
 * Writes a signed portal session cookie.
 * Only call this from a Server Action or Route Handler.
 * @param payload - Portal session payload.
 * @returns Promise that resolves when the cookie is stored.
 */
export async function writePortalSession(payload: PortalSessionPayload) {
  const cookieStore = await cookies();
  const token = createSignedSessionToken({
    payload,
    secret: Env.nocSessionSecret,
  });

  cookieStore.set(PORTAL_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(payload.exp),
    path: '/',
  });
}

/**
 * Authenticates the tenant admin against Supabase and builds the portal session payload.
 * @param props - Login options.
 * @param props.email - User email.
 * @param props.password - User password.
 * @param props.tenantId - Tenant identifier returned by the portal API.
 * @param props.tenantSlug - Tenant slug from the current route.
 * @returns Fresh portal session payload.
 */
export async function createPortalSessionFromPassword(props: {
  email: string;
  password: string;
  tenantId: string;
  tenantSlug: string;
}) {
  const session = await requestSupabaseSession({
    email: props.email,
    password: props.password,
    grantType: 'password',
  });

  return buildPortalSessionPayload({
    session,
    tenantId: props.tenantId,
    tenantSlug: props.tenantSlug,
    email: props.email,
  });
}

/**
 * Refreshes the portal session using the refresh token.
 * This helper does not write cookies (cookie writes must happen in a Server Action or Route Handler).
 * @param props - Refresh options.
 * @param props.session - Current portal session payload.
 * @returns Refreshed portal session payload.
 */
export async function refreshPortalSessionPayload(props: {
  session: PortalSessionPayload;
}) {
  if (!props.session.refreshToken) {
    throw new PortalSessionError({
      code: 'REFRESH_TOKEN_MISSING',
      message: 'Refresh token is missing',
      status: 401,
    });
  }

  const refreshedSession = await requestSupabaseSession({
    grantType: 'refresh_token',
    refreshToken: props.session.refreshToken,
  });

  return buildPortalSessionPayload({
    session: refreshedSession,
    tenantId: props.session.tenantId,
    tenantSlug: props.session.tenantSlug,
    email: props.session.email,
  });
}

/**
 * Resolves the current portal session, refreshing the Supabase token when needed.
 * @param props - Session resolution options.
 * @param props.tenantSlug - Tenant slug expected by the current route.
 * @returns Valid portal session payload or null.
 */
export async function getPortalSession(props: {
  tenantSlug: string;
}) {
  const currentSession = await readPortalSession();
  if (!currentSession) {
    return null;
  }

  if (currentSession.tenantSlug !== props.tenantSlug) {
    return null;
  }

  return currentSession;
}
