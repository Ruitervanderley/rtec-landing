import crypto from 'node:crypto';

export const DEVICE_TOKEN_TTL_DAYS = 30;

export function generateOpaqueToken(prefix: string): string {
  const random = crypto.randomBytes(32).toString('base64url');
  return `${prefix}.${random}`;
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function nowPlusDays(days: number): Date {
  return new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
}

export function buildDedupWindowKey(base: string, windowMinutes: number): string {
  const now = new Date();
  const windowMs = Math.max(1, windowMinutes) * 60 * 1000;
  const bucket = Math.floor(now.getTime() / windowMs) * windowMs;
  return `${base}:${new Date(bucket).toISOString()}`;
}

export function sanitizeObjectPathSegment(value: string): string {
  const normalized = value.trim().replace(/\s+/g, '-').toLowerCase();
  return normalized.replace(/[^a-z0-9._-]/g, '');
}
