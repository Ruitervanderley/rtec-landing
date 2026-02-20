import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BackToTop } from '@/components/BackToTop';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { Link } from '@/libs/I18nNavigation';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return (
    <BaseTemplate
      rightNav={(
        <li>
          <Link
            href="/#cta"
            className="rounded-xl border border-zinc-400 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
          >
            {t('header_cta')}
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
