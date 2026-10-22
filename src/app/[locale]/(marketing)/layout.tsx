import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { BackToTop } from '@/components/BackToTop';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Env } from '@/libs/Env';
import { Link } from '@/libs/I18nNavigation';
import { BaseTemplate } from '@/templates/BaseTemplate';
import { AppConfig } from '@/utils/AppConfig';
import { ContactConfig } from '@/utils/ContactConfig';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const tIndex = await getTranslations({ locale, namespace: 'IndexPage' });
  const tRoot = await getTranslations({ locale, namespace: 'RootLayout' });
  const tBase = await getTranslations({ locale, namespace: 'BaseTemplate' });

  const navItems = [
    { href: '/', label: tRoot('home_link') },
    { href: '/services', label: tRoot('services_link') },
    { href: '/portfolio', label: tRoot('portfolio_link') },
    { href: '/about', label: tRoot('about_link') },
  ];

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
                alt={tBase('brand_alt')}
                width={160}
                height={45}
                className="h-10 w-auto object-contain brightness-110 sm:h-12"
                priority
              />
            </Link>
          </li>
          {navItems.map(item => (
            <li key={item.href}>
              <Link href={item.href} prefetch={false} className="rounded py-3 text-slate-300 transition-colors hover:text-white">
                {item.label}
              </Link>
            </li>
          ))}
        </>
      )}
      mobileNav={(
        <>
          {navItems.map(item => (
            <li key={item.href}>
              <Link href={item.href} prefetch={false} className="block rounded-lg px-4 py-3 hover:bg-white/5">{item.label}</Link>
            </li>
          ))}
          <li><Link href="/#cta" className="block rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">{tIndex('header_cta')}</Link></li>
          <li><LanguageSwitcher /></li>
        </>
      )}
      rightNav={(
        <>
          <li><LanguageSwitcher /></li>
          <li>
            <Link
              href="/#cta"
              className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 shadow-sm transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-600 hover:text-white hover:shadow-emerald-500/20 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {tIndex('header_cta')}
            </Link>
          </li>
        </>
      )}
    >
      {props.children}
      <FloatingWhatsApp
        label={tBase('floating_whatsapp_label')}
        url={Env.NEXT_PUBLIC_WHATSAPP_URL ?? ContactConfig.whatsappUrl}
      />
      <BackToTop label={tBase('back_to_top_label')} />
    </BaseTemplate>
  );
}
