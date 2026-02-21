/**
 * Stub for \@clerk/nextjs/server when building static export.
 */
export async function currentUser() {
  return null;
}

export function clerkMiddleware(_fn: (auth: unknown, req: unknown) => unknown) {
  return (_req: unknown) => new Response(null, { status: 200 });
}

export function createRouteMatcher(_routes: string[]) {
  return () => false;
}
