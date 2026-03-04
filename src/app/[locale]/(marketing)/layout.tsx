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
                width={160}
                height={45}
                className="h-10 w-auto object-contain brightness-110 sm:h-12"
                priority
              />
            </Link>
          </li>
          <li>
            <Link
              href="/"
              className="rounded text-slate-400 transition-colors hover:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {tRoot('home_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/portfolio"
              prefetch={false}
              className="rounded text-slate-400 transition-colors hover:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
            className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 shadow-sm transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-600 hover:text-white hover:shadow-emerald-500/20 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
