import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'painel-web',
    releaseVersion: (process.env.OPS_RELEASE_VERSION ?? process.env.IMAGE_TAG ?? 'main').trim() || 'main',
    serverTimeUtc: new Date().toISOString(),
  });
}
