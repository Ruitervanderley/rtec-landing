import type { LocalePrefixMode } from 'next-intl/routing';

const localePrefix: LocalePrefixMode = 'as-needed';

export const AppConfig = {
  name: 'Rtec Tecnologia',
  locales: ['pt-BR', 'fr'],
  defaultLocale: 'pt-BR',
  localePrefix,
};
