import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/libs/I18nRouting';
import { ContactConfig } from '@/utils/ContactConfig';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' });
  const baseUrl = getBaseUrl();
  const path = getI18nPath('/privacy', locale);

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: `${baseUrl}${path}`,
      languages: Object.fromEntries(
        routing.locales.map(currentLocale => [
          currentLocale,
          `${baseUrl}${getI18nPath('/privacy', currentLocale)}`,
        ]),
      ),
    },
  };
}

export default async function PrivacyPage(props: PrivacyPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' });
  const sections = [
    { title: t('section_1_title'), body: t('section_1_body') },
    { title: t('section_2_title'), body: t('section_2_body') },
    { title: t('section_3_title'), body: t('section_3_body') },
    { title: t('section_4_title'), body: t('section_4_body') },
  ];

  return (
    <div className="min-h-full bg-[#0b1121] text-white">
      <section className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-emerald-400 uppercase">{t('eyebrow')}</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t('page_title')}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            {t('page_subtitle')}
          </p>

          <div className="mt-12 space-y-8">
            {sections.map(section => (
              <section key={section.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 text-sm leading-relaxed text-slate-300">
            <p>
              {t('company_label')}
              {': '}
              {ContactConfig.legalName}
            </p>
            <p>
              CNPJ:
              {' '}
              {ContactConfig.cnpjDisplay}
            </p>
            <p>
              {t('email_label')}
              {': '}
              {ContactConfig.email}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
