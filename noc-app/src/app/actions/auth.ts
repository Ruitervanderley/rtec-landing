'use server';

import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// ─── Rate Limiting Store (in-memory, resets on server restart) ───
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const _ATTEMPT_WINDOW_MS = 60 * 1000; // 1 minute window

function getSessionSecret(): string {
  const secret = process.env.NOC_SESSION_SECRET;
  if (!secret) {
    // In development, use a fallback. In production, this MUST be set.
    console.warn('⚠️  NOC_SESSION_SECRET not set! Using dev fallback. Set this in production!');
    return 'rtec-dev-secret-change-in-production-2026';
  }
  return secret;
}

function getAdminPassword(): string {
  const pw = process.env.NOC_ADMIN_PASSWORD;
  if (!pw) {
    throw new Error('NOC_ADMIN_PASSWORD environment variable is not set. Cannot authenticate.');
  }
  return pw;
}

// ─── HMAC Token (lightweight JWT alternative, zero dependencies) ───
function createSignedToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'RTEC' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function _verifySignedToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(`${header}.${body}`)
      .digest('base64url');

    // Timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature!), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body!, 'base64url').toString());

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ─── Rate Limit Check ───
function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    // Check if blocked
    if (record.blockedUntil > now) {
      const minutesLeft = Math.ceil((record.blockedUntil - now) / 60000);
      return { blocked: true, remaining: minutesLeft };
    }

    // Reset if window expired
    if (record.blockedUntil <= now && record.count >= MAX_ATTEMPTS) {
      loginAttempts.delete(ip);
    }
  }

  return { blocked: false, remaining: MAX_ATTEMPTS - (record?.count ?? 0) };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) ?? { count: 0, blockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    console.warn(`🚫 IP ${ip} bloqueado por ${BLOCK_DURATION_MS / 60000} minutos após ${record.count} tentativas falhas`);
  }

  loginAttempts.set(ip, record);

  // Auto-cleanup old entries every 100 attempts
  if (loginAttempts.size > 100) {
    for (const [key, val] of loginAttempts) {
      if (val.blockedUntil < now) {
        loginAttempts.delete(key);
      }
    }
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// ─── Main Auth Action ───
export async function authenticate(formData: FormData) {
  const password = formData.get('password') as string;
  const clientIp = 'server-action'; // Next.js Server Actions don't expose IP easily

  // Rate limit check
  const rateCheck = checkRateLimit(clientIp);
  if (rateCheck.blocked) {
    return { error: `Muitas tentativas falhas. Aguarde ${rateCheck.remaining} minuto(s).` };
  }

  let adminPassword: string;
  try {
    adminPassword = getAdminPassword();
  } catch {
    return { error: 'Erro de configuração do servidor. Contate o administrador.' };
  }

  if (password === adminPassword) {
    clearAttempts(clientIp);

    // Create signed token with expiration (7 days)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = createSignedToken({
      role: 'admin',
      iat: Date.now(),
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString('hex'),
    });

    const cookieStore = await cookies();
    cookieStore.set('rtec_noc_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(expiresAt),
      path: '/',
    });

    redirect('/dashboard');
  } else {
    recordFailedAttempt(clientIp);
    const remaining = MAX_ATTEMPTS - (loginAttempts.get(clientIp)?.count ?? 0);
    const suffix = remaining > 0 ? ` (${remaining} tentativas restantes)` : '';
    return { error: `Senha incorreta. Acesso Negado.${suffix}` };
  }
}

// ─── Logout Action ───
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('rtec_noc_session');
  redirect('/login');
}
