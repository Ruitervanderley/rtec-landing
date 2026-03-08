import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './I18nRouting';

// The locale messages are resolved from the files declared in `src/locales`.
// The default language is configured in `AppConfig` and loaded when the route
// does not contain a supported locale segment.

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
