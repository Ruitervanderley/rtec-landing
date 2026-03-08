'use server';

import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Env } from '@/lib/Env';
import { createSignedSessionToken } from '@/lib/ServerSession';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/sessionConfig';

const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

function getSafeRedirectTarget(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return '/dashboard';
  }

  return value.startsWith('/login') ? '/dashboard' : value;
}

async function getRequestIp() {
  const headerStore = await headers();
  const forwardedIp = headerStore.get('cf-connecting-ip')
    || headerStore.get('x-real-ip')
    || headerStore.get('x-forwarded-for')?.split(',')[0];

  return forwardedIp?.trim() || 'unknown';
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }

  if (record.blockedUntil > now) {
    const minutesLeft = Math.ceil((record.blockedUntil - now) / 60000);
    return { blocked: true, remaining: minutesLeft };
  }

  if (record.count >= MAX_ATTEMPTS) {
    loginAttempts.delete(ip);
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }

  return { blocked: false, remaining: Math.max(MAX_ATTEMPTS - record.count, 0) };
}

function registerFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) ?? { count: 0, blockedUntil: 0 };
  const nextCount = record.count + 1;
  loginAttempts.set(ip, {
    count: nextCount,
    blockedUntil: nextCount >= MAX_ATTEMPTS ? now + BLOCK_DURATION_MS : 0,
  });
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function isValidPassword(inputPassword: string, expectedPassword: string) {
  const inputBuffer = Buffer.from(inputPassword);
  const expectedBuffer = Buffer.from(expectedPassword);
  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

export async function authenticate(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const adminPassword = Env.nocAdminPassword;

  const clientIp = await getRequestIp();
  const rateLimitState = isRateLimited(clientIp);
  if (rateLimitState.blocked) {
    return { error: `Muitas tentativas falhas. Aguarde ${rateLimitState.remaining} minuto(s).` };
  }

  if (!isValidPassword(password, adminPassword)) {
    registerFailedAttempt(clientIp);
    const remainingAttempts = Math.max(MAX_ATTEMPTS - (loginAttempts.get(clientIp)?.count ?? 0), 0);
    const suffix = remainingAttempts > 0 ? ` (${remainingAttempts} tentativas restantes)` : '';
    return { error: `Senha incorreta.${suffix}` };
  }

  clearAttempts(clientIp);

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = createSignedSessionToken({
    payload: {
      exp: expiresAt,
      iat: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
      role: 'admin',
    },
    secret: Env.nocSessionSecret,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(expiresAt),
    path: '/',
  });

  redirect(getSafeRedirectTarget(formData.get('from')));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
  redirect('/login');
}
