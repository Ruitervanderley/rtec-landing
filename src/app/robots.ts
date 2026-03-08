import type { MetadataRoute } from 'next';
import { routing } from '@/libs/I18nRouting';
import { getBaseUrl } from '@/utils/Helpers';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const disallow = routing.locales.map(locale =>
    locale === routing.defaultLocale ? '/dashboard' : `/${locale}/dashboard`,
  );

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
