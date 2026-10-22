import type { LocalePrefixMode } from 'next-intl/routing';

const localePrefix: LocalePrefixMode = 'as-needed';

export const AppConfig = {
  name: 'RTEC Soluções Tecnológicas',
  locales: ['pt-BR', 'fr'],
  defaultLocale: 'pt-BR',
  localePrefix,
};
