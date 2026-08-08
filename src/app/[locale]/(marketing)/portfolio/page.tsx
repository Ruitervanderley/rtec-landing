import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { Env } from '@/libs/Env';
import { Link } from '@/libs/I18nNavigation';
import { routing } from '@/libs/I18nRouting';
import { ContactConfig } from '@/utils/ContactConfig';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

type IPortfolioProps = {
  params: Promise<{ locale: string }>;
};

const openGraphLocaleByLocale: Record<string, string> = {
  'pt-BR': 'pt_BR',
  'fr': 'fr_FR',
};

export async function generateMetadata(props: IPortfolioProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Portfolio',
  });
  const baseUrl = getBaseUrl();
  const path = getI18nPath('/portfolio', locale);
  const canonicalUrl = `${baseUrl}${path}`;
  const languageAlternates = Object.fromEntries(
    routing.locales.map(currentLocale => [
      currentLocale,
      `${baseUrl}${getI18nPath('/portfolio', currentLocale)}`,
    ]),
  );
  const title = t('meta_title');
  const description = t('meta_description');

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Rtec Tecnologia',
      locale: openGraphLocaleByLocale[locale] ?? 'pt_BR',
      type: 'website',
      images: [{ url: `${baseUrl}/og-rtec.svg`, width: 1200, height: 630, alt: 'Rtec Tecnologia' }],
    },
  };
}

export default async function PortfolioPage(props: IPortfolioProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Portfolio',
  });
  const whatsappUrl = Env.NEXT_PUBLIC_WHATSAPP_URL ?? ContactConfig.whatsappUrl;
  const caseStudies = [
    {
      badge: t('case_1_badge'),
      title: t('case_1_title'),
      summary: t('case_1_summary'),
      problemLabel: t('problem_label'),
      problem: t('case_1_problem'),
      solutionLabel: t('solution_label'),
      solution: t('case_1_solution'),
      resultLabel: t('result_label'),
      result: t('case_1_result'),
      metrics: [
        { value: t('case_1_metric_1_value'), label: t('case_1_metric_1_label') },
        { value: t('case_1_metric_2_value'), label: t('case_1_metric_2_label') },
        { value: t('case_1_metric_3_value'), label: t('case_1_metric_3_label') },
      ],
      accent: 'from-emerald-500/25',
    },
    {
      badge: t('case_2_badge'),
      title: t('case_2_title'),
      summary: t('case_2_summary'),
      problemLabel: t('problem_label'),
      problem: t('case_2_problem'),
      solutionLabel: t('solution_label'),
      solution: t('case_2_solution'),
      resultLabel: t('result_label'),
      result: t('case_2_result'),
      metrics: [
        { value: t('case_2_metric_1_value'), label: t('case_2_metric_1_label') },
        { value: t('case_2_metric_2_value'), label: t('case_2_metric_2_label') },
        { value: t('case_2_metric_3_value'), label: t('case_2_metric_3_label') },
      ],
      accent: 'from-blue-500/25',
    },
    {
      badge: t('case_3_badge'),
      title: t('case_3_title'),
      summary: t('case_3_summary'),
      problemLabel: t('problem_label'),
      problem: t('case_3_problem'),
      solutionLabel: t('solution_label'),
      solution: t('case_3_solution'),
      resultLabel: t('result_label'),
      result: t('case_3_result'),
      metrics: [
        { value: t('case_3_metric_1_value'), label: t('case_3_metric_1_label') },
        { value: t('case_3_metric_2_value'), label: t('case_3_metric_2_label') },
        { value: t('case_3_metric_3_value'), label: t('case_3_metric_3_label') },
      ],
      accent: 'from-purple-500/25',
    },
  ];

  const trustItems = [
    t('trust_item_1'),
    t('trust_item_2'),
    t('trust_item_3'),
  ];

  return (
    <div className="min-h-full bg-[#0b1121] text-white">
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 md:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-widest text-emerald-400 uppercase">
              {t('eyebrow')}
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {t('page_title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              {t('page_subtitle')}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {trustItems.map(item => (
              <div key={item} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-slate-300">
                <span className="mb-3 block size-2 rounded-full bg-emerald-400" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-8">
            {caseStudies.map(caseStudy => (
              <article
                key={caseStudy.title}
                className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${caseStudy.accent} to-transparent opacity-70`} />
                <div className="relative grid gap-8 lg:grid-cols-[1fr_0.82fr]">
                  <div>
                    <span className="inline-flex rounded-lg bg-white/[0.08] px-3 py-1 text-xs font-semibold tracking-wide text-emerald-300 uppercase">
                      {caseStudy.badge}
                    </span>
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {caseStudy.title}
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-slate-400">
                      {caseStudy.summary}
                    </p>

                    <div className="mt-8 grid gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">{caseStudy.problemLabel}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{caseStudy.problem}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">{caseStudy.solutionLabel}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{caseStudy.solution}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">{caseStudy.resultLabel}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{caseStudy.result}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid content-start gap-4">
                    {caseStudy.metrics.map(metric => (
                      <div key={metric.label} className="rounded-xl border border-white/[0.06] bg-[#060a14]/70 p-5">
                        <div className="text-2xl font-extrabold text-emerald-400">{metric.value}</div>
                        <div className="mt-1 text-sm text-slate-400">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center">
            <h2 className="text-2xl font-bold text-white">{t('cta_title')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">{t('cta_description')}</p>
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0b1121] focus:outline-none"
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
