import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';

type SessionPayload = Record<string, unknown> & {
  exp?: number;
};

/**
 * Creates a signed session token for server-side cookies.
 * @param props - Session token options.
 * @param props.payload - Serializable payload stored in the token.
 * @param props.secret - Secret used to sign the payload.
 * @returns Signed token string.
 */
export function createSignedSessionToken(props: {
  payload: SessionPayload;
  secret: string;
}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'RTEC' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(props.payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', props.secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 * @param props - Session verification options.
 * @param props.token - Token to verify.
 * @param props.secret - Secret used to validate the signature.
 * @returns Decoded payload or null when the token is invalid.
 */
export function verifySignedSessionToken<T extends SessionPayload>(props: {
  token: string;
  secret: string;
}) {
  try {
    const parts = props.token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, body, signature] = parts;
    if (!header || !body || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', props.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T;
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
