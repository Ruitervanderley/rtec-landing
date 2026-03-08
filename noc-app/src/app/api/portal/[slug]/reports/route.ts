import { NextResponse } from 'next/server';
import { getPortalReports, PortalApiError } from '@/lib/portalApi';
import { clearPortalSession, getPortalSession } from '@/lib/portalSession';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return NextResponse.json({ error: 'SLUG_REQUIRED' }, { status: 400 });
  }

  const session = await getPortalSession({ tenantSlug: normalizedSlug });
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const reports = await getPortalReports({
      accessToken: session.accessToken,
      slug: normalizedSlug,
    });

    return NextResponse.json(reports);
  } catch (error) {
    if (error instanceof PortalApiError && (error.status === 401 || error.status === 403)) {
      await clearPortalSession();
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof PortalApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'PORTAL_REPORTS_PROXY_ERROR' }, { status: 500 });
  }
}
