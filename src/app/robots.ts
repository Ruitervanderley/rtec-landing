import type { MetadataRoute } from 'next';
import { routing } from '@/libs/I18nRouting';
import { getBaseUrl } from '@/utils/Helpers';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const privateRoutes = ['/counter', '/dashboard', '/sign-in', '/sign-up', '/api'];
  const disallow = routing.locales.flatMap(locale =>
    privateRoutes.map(route =>
      locale === routing.defaultLocale ? route : `/${locale}${route}`,
    ),
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
