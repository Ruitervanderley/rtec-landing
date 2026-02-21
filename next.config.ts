import type { NextConfig } from 'next';
import path from 'node:path';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/libs/Env';

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const stubDir = path.resolve(__dirname, 'stub');

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  poweredByHeader: false,
  reactStrictMode: true,
  reactCompiler: process.env.NODE_ENV === 'production', // Keep the development environment fast
  outputFileTracingIncludes: {
    '/': ['./migrations/**/*'],
  },
  ...(isStaticExport && {
    output: 'export',
    images: { unoptimized: true },
  }),
};

// Initialize the Next-Intl plugin
let configWithPlugins = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

// Conditionally enable bundle analysis
if (process.env.ANALYZE === 'true') {
  configWithPlugins = withBundleAnalyzer()(configWithPlugins);
}

// Conditionally enable Sentry configuration (skip for static export)
if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED && !isStaticExport) {
  configWithPlugins = withSentryConfig(configWithPlugins, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options
    org: process.env.SENTRY_ORGANIZATION,
    project: process.env.SENTRY_PROJECT,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: '/monitoring',

    webpack: {
      reactComponentAnnotation: {
        enabled: true,
      },

      // Tree-shake Sentry logger statements to reduce bundle size
      treeshake: {
        removeDebugLogging: true,
      },
    },

    // Disable Sentry telemetry
    telemetry: false,
  });
}

type WebpackConfigWithResolve = { resolve?: { alias?: Record<string, string> }; [k: string]: unknown };

const nextConfig = isStaticExport
  ? (() => {
      const prevWebpack = configWithPlugins.webpack;
      return {
        ...configWithPlugins,
        webpack: (config: WebpackConfigWithResolve, options: { isServer?: boolean; nextRuntime?: string }) => {
          const c = prevWebpack ? (prevWebpack as (c: WebpackConfigWithResolve, o: unknown) => WebpackConfigWithResolve)(config, options) : config;
          c.resolve ??= {};
          c.resolve.alias ??= {};
          const alias = c.resolve.alias as Record<string, string>;
          alias['@clerk/nextjs'] = path.join(stubDir, 'clerk-nextjs.tsx');
          alias['@clerk/nextjs/server'] = path.join(stubDir, 'clerk-nextjs-server.ts');
          return c;
        },
      };
    })()
  : configWithPlugins;
export default nextConfig;
