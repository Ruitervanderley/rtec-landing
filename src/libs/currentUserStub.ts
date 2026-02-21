/** Stub for static export build — no Clerk. */
export async function currentUser(): Promise<{
  primaryEmailAddress?: { emailAddress?: string } | null;
} | null> {
  return null;
}
