import type { MetadataRoute } from 'next';
import { routing } from '@/libs/I18nRouting';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const routes = ['', '/about', '/portfolio'];

  return routes.map(route => ({
    url: `${baseUrl}${getI18nPath(route, routing.defaultLocale)}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const,
    priority: route === '' ? 1 : 0.7,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map(locale => [
          locale,
          `${baseUrl}${getI18nPath(route, locale)}`,
        ]),
      ),
    },
  }));
}
