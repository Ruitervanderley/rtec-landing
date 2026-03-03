export type OpsConfig = {
    supabaseUrl: string;
    supabaseAnonKey: string;
    adminServiceToken: string;
    r2AccountId: string;
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2Bucket: string;
    r2PublicBaseUrl: string;
    telegramBotToken: string;
    telegramChatId: string;
};
export declare function loadOpsConfig(): OpsConfig;
export declare function isOpsAdminAuthConfigured(config: OpsConfig): boolean;
export declare function isSupabaseAuthConfigured(config: OpsConfig): boolean;
export declare function isR2Configured(config: OpsConfig): boolean;
export declare function isTelegramConfigured(config: OpsConfig): boolean;
//# sourceMappingURL=config.d.ts.map