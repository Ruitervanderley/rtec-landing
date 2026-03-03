function getEnv(name) {
    return (process.env[name] ?? '').trim();
}
export function loadOpsConfig() {
    return {
        supabaseUrl: getEnv('SUPABASE_URL'),
        supabaseAnonKey: getEnv('SUPABASE_ANON_KEY'),
        adminServiceToken: getEnv('OPS_ADMIN_SERVICE_TOKEN'),
        r2AccountId: getEnv('R2_ACCOUNT_ID'),
        r2AccessKeyId: getEnv('R2_ACCESS_KEY_ID'),
        r2SecretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
        r2Bucket: getEnv('R2_BUCKET'),
        r2PublicBaseUrl: getEnv('R2_PUBLIC_BASE_URL'),
        telegramBotToken: getEnv('TELEGRAM_BOT_TOKEN'),
        telegramChatId: getEnv('TELEGRAM_CHAT_ID'),
    };
}
export function isOpsAdminAuthConfigured(config) {
    return config.adminServiceToken.length > 0;
}
export function isSupabaseAuthConfigured(config) {
    return config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;
}
export function isR2Configured(config) {
    return (config.r2AccountId.length > 0
        && config.r2AccessKeyId.length > 0
        && config.r2SecretAccessKey.length > 0
        && config.r2Bucket.length > 0);
}
export function isTelegramConfigured(config) {
    return config.telegramBotToken.length > 0 && config.telegramChatId.length > 0;
}
//# sourceMappingURL=config.js.map