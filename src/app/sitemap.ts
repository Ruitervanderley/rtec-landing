import type { MetadataRoute } from 'next';
import { AppConfig } from '@/utils/AppConfig';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  const routes = ['', '/about', '/counter'];

  const allRoutes = [...routes];

  return allRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const,
    priority: route === '' ? 1 : 0.7,
    alternates: {
      languages: Object.fromEntries(
        AppConfig.locales
          .filter(locale => locale !== AppConfig.defaultLocale)
          .map(locale => [locale, `${baseUrl}${getI18nPath(route, locale)}`]),
      ),
    },
  }));
}
