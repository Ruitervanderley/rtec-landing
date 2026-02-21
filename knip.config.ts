import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Files to exclude from Knip analysis
  ignore: [
    '.storybook/**/*',
    'checkly.config.ts',
    'scripts/run-db-migrate.cjs',
    'scripts/build-for-pages.cjs',
    'src/components/DemoBadge.tsx',
    'src/components/DemoBanner.tsx',
    'src/components/CurrentCount-pages.tsx',
    'src/libs/I18n.ts',
    'src/libs/currentUser-pages.ts',
    'src/libs/currentUserStub.ts',
    'src/types/I18n.ts',
    'src/utils/Helpers.ts',
    'src/proxy-static.ts',
    'src/app/[locale]/(marketing)/counter/page-pages.tsx',
    'stub/**/*',
    'tests/**/*.ts',
  ],
  // Dependencies to ignore during analysis
  ignoreDependencies: [
    '@commitlint/types',
    '@clerk/types',
    'conventional-changelog-conventionalcommits',
    'vite',
  ],
  // Binaries to ignore during analysis
  ignoreBinaries: [
    'production', // False positive raised with dotenv-cli
  ],
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
};

export default config;
