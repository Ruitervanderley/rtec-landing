/**
 * Stub for \@clerk/nextjs when building static export (Cloudflare Pages).
 * Prevents Clerk Server Actions from being included in the bundle.
 */
import type { ReactNode } from 'react';

function Noop({ children }: { children?: ReactNode }) {
  return children ?? null;
}

export const ClerkProvider = Noop;
export const SignIn = () => null;
export const SignUp = () => null;
export const UserProfile = () => null;
export function SignOutButton({ children }: { children?: ReactNode }) {
  return children ?? null;
}
