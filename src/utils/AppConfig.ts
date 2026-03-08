import type { LocalizationResource } from '@clerk/types';
import type { LocalePrefixMode } from 'next-intl/routing';
import { frFR, ptBR } from '@clerk/localizations';

const localePrefix: LocalePrefixMode = 'as-needed';

// FIXME: Update this configuration file based on your project information
export const AppConfig = {
  name: 'Rtec Tecnologia',
  locales: ['pt-BR', 'fr'],
  defaultLocale: 'pt-BR',
  localePrefix,
};

const supportedLocales: Record<string, LocalizationResource> = {
  'pt-BR': ptBR,
  'fr': frFR,
};

export const ClerkLocalizations = {
  defaultLocale: ptBR,
  supportedLocales,
};
