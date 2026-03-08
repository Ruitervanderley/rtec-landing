import type { routing } from '@/libs/I18nRouting';
import type messages from '@/locales/pt-BR.json';

declare module 'next-intl' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
