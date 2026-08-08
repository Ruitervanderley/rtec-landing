import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { Env } from '@/libs/Env';
import { Link } from '@/libs/I18nNavigation';
import { routing } from '@/libs/I18nRouting';
import { ContactConfig } from '@/utils/ContactConfig';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

type ServicesPageProps = {
  params: Promise<{ locale: string }>;
};

const openGraphLocaleByLocale: Record<string, string> = {
  'pt-BR': 'pt_BR',
  'fr': 'fr_FR',
};

export async function generateMetadata(props: ServicesPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'ServicesPage' });
  const baseUrl = getBaseUrl();
  const path = getI18nPath('/services', locale);
  const canonicalUrl = `${baseUrl}${path}`;

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(
        routing.locales.map(currentLocale => [
          currentLocale,
          `${baseUrl}${getI18nPath('/services', currentLocale)}`,
        ]),
      ),
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: canonicalUrl,
      siteName: 'Rtec Tecnologia',
      locale: openGraphLocaleByLocale[locale] ?? 'pt_BR',
      type: 'website',
      images: [{ url: `${baseUrl}/og-rtec.svg`, width: 1200, height: 630, alt: 'Rtec Tecnologia' }],
    },
  };
}

export default async function ServicesPage(props: ServicesPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ServicesPage' });
  const whatsappUrl = Env.NEXT_PUBLIC_WHATSAPP_URL ?? ContactConfig.whatsappUrl;
  const services = [
    {
      title: t('service_1_title'),
      description: t('service_1_description'),
      outcomes: [t('service_1_outcome_1'), t('service_1_outcome_2'), t('service_1_outcome_3')],
    },
    {
      title: t('service_2_title'),
      description: t('service_2_description'),
      outcomes: [t('service_2_outcome_1'), t('service_2_outcome_2'), t('service_2_outcome_3')],
    },
    {
      title: t('service_3_title'),
      description: t('service_3_description'),
      outcomes: [t('service_3_outcome_1'), t('service_3_outcome_2'), t('service_3_outcome_3')],
    },
  ];

  return (
    <div className="min-h-full bg-[#0b1121] text-white">
      <section className="px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold tracking-widest text-emerald-400 uppercase">{t('eyebrow')}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t('page_title')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            {t('page_subtitle')}
          </p>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {services.map((service, index) => (
              <article key={service.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
                <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                  0
                  {index + 1}
                </span>
                <h2 className="mt-3 text-2xl font-bold text-white">{service.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{service.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {service.outcomes.map(outcome => (
                    <li key={outcome} className="flex gap-3">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center">
            <h2 className="text-2xl font-bold text-white">{t('cta_title')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">{t('cta_description')}</p>
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition-all hover:bg-emerald-500"
            >
              <WhatsAppIcon className="size-5 shrink-0" />
              <span>{t('cta_button')}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
