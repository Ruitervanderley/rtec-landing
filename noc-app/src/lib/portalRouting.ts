const ADMIN_HOSTS = new Set(['painel', 'www', 'localhost']);
const PORTAL_PUBLIC_BASE_URL = 'https://painel.rtectecnologia.com.br';

/**
 * Extracts the tenant subdomain from a request host.
 * @param host - Current request host header.
 * @returns Tenant subdomain or null when the host is not a tenant host.
 */
export function extractTenantSubdomain(host: string) {
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length <= 3) {
    return null;
  }

  const subdomain = parts[0] ?? '';
  if (!subdomain || ADMIN_HOSTS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Builds a canonical path inside the tenant portal.
 * @param props - Path building options.
 * @param props.slug - Tenant slug.
 * @param props.path - Target path inside the tenant portal.
 * @returns Canonical path under `painel.rtectecnologia.com.br`.
 */
export function getPortalPath(props: {
  slug: string;
  path?: string;
}) {
  const rawPath = props.path ?? '';
  const normalizedPath = rawPath
    ? (rawPath.startsWith('/') ? rawPath : `/${rawPath}`)
    : '';

  return `/portal/${props.slug}${normalizedPath}`;
}

/**
 * Builds a canonical public URL for the tenant portal.
 * @param props - Public URL options.
 * @param props.slug - Tenant slug.
 * @param props.path - Optional path inside the tenant portal.
 * @returns Absolute canonical URL under the painel host.
 */
export function getPortalAbsoluteUrl(props: {
  slug: string;
  path?: string;
}) {
  return `${PORTAL_PUBLIC_BASE_URL}${getPortalPath(props)}`;
}
