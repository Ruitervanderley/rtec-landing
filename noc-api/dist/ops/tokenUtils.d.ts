export declare const DEVICE_TOKEN_TTL_DAYS = 30;
export declare function generateOpaqueToken(prefix: string): string;
export declare function hashOpaqueToken(token: string): string;
export declare function nowPlusDays(days: number): Date;
export declare function buildDedupWindowKey(base: string, windowMinutes: number): string;
export declare function sanitizeObjectPathSegment(value: string): string;
//# sourceMappingURL=tokenUtils.d.ts.map