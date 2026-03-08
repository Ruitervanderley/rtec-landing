function readEnv(name: string) {
  return (process.env[name] ?? '').trim();
}

function requireEnv(name: string) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`${name} environment variable is not configured`);
  }

  return value;
}

function getOpsApiBaseUrl() {
  const value = readEnv('OPS_API_URL') || readEnv('NEXT_PUBLIC_NOC_API_URL');
  if (!value) {
    throw new Error('OPS_API_URL environment variable is not configured');
  }

  return value.replace(/\/$/, '');
}

function getSessionSecret() {
  const value = readEnv('NOC_SESSION_SECRET');
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'rtec-dev-secret-change-in-production-2026';
  }

  throw new Error('NOC_SESSION_SECRET environment variable is required in production');
}

export const Env = {
  get nocAdminPassword() {
    return requireEnv('NOC_ADMIN_PASSWORD');
  },
  get nocSessionSecret() {
    return getSessionSecret();
  },
  get opsAdminServiceToken() {
    return requireEnv('OPS_ADMIN_SERVICE_TOKEN');
  },
  get opsApiBaseUrl() {
    return getOpsApiBaseUrl();
  },
  get supabaseAnonKey() {
    return requireEnv('SUPABASE_ANON_KEY');
  },
  get supabaseUrl() {
    return requireEnv('SUPABASE_URL');
  },
};
