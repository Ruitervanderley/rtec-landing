import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { routing } from '@/libs/I18nRouting';
import '@/styles/global.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  manifest: '/site.webmanifest',
  icons: [
    { rel: 'icon', url: '/favicon.ico', sizes: '48x48' },
    { rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' },
    { rel: 'icon', type: 'image/png', sizes: '96x96', url: '/favicon-96x96.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className={plusJakarta.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider>
          <PostHogProvider>
            {props.children}
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
