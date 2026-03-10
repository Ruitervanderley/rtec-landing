import type { OpsConfig } from './config.js';
export type SupabaseIdentity = {
    userId: string;
    email: string;
};
export type ProfileAccessInfo = {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    userValidUntil: string | null;
    tenantName: string;
    tenantPortalSlug: string;
    tenantLogoUrl: string | null;
    tenantIsActive: boolean;
    tenantValidUntil: string | null;
};
export declare function getSupabaseIdentity(accessToken: string, config: OpsConfig): Promise<SupabaseIdentity | null>;
export declare function getProfileAccessInfo(userId: string): Promise<ProfileAccessInfo | null>;
export declare function isAccessAllowed(profile: ProfileAccessInfo): {
    canAccess: boolean;
    reason: string;
};
//# sourceMappingURL=supabaseIdentity.d.ts.map