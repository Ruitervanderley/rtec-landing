import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { BackToTop } from '@/components/BackToTop';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { Link } from '@/libs/I18nNavigation';
import { BaseTemplate } from '@/templates/BaseTemplate';
import { AppConfig } from '@/utils/AppConfig';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const tIndex = await getTranslations({ locale, namespace: 'Index' });
  const tRoot = await getTranslations({ locale, namespace: 'RootLayout' });

  return (
    <BaseTemplate
      leftNav={(
        <>
          <li>
            <Link
              href="/"
              className="flex items-center rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
              aria-label={AppConfig.name}
            >
              <Image
                src="/rtec-logo.png"
                alt="Rtec Tecnologia - Soluções Tecnológicas"
                width={200}
                height={57}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </Link>
          </li>
          <li>
            <Link
              href="/"
              className="rounded text-slate-600 transition-colors hover:text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
            >
              {tRoot('home_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/portfolio"
              className="rounded text-slate-600 transition-colors hover:text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
            >
              {tRoot('portfolio_link')}
            </Link>
          </li>
        </>
      )}
      rightNav={(
        <li>
          <Link
            href="/#cta"
            className="rounded-xl border border-zinc-400 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
          >
            {tIndex('header_cta')}
          </Link>
        </li>
      )}
    >
      {props.children}
      <FloatingWhatsApp />
      <BackToTop />
    </BaseTemplate>
  );
}
