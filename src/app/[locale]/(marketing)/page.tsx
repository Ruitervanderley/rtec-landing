import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { AnimateInView } from '@/components/AnimateInView';
import { FaqAccordion } from '@/components/FaqAccordion';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { Env } from '@/libs/Env';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

type IIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IIndexProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  const baseUrl = getBaseUrl();
  const path = getI18nPath('', locale);
  const canonicalUrl = path ? `${baseUrl}${path}` : baseUrl;

  const title = t('meta_title');
  const description = t('meta_description');
  const ogImage = `${baseUrl}/rtec-logo.png`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Rtec Tecnologia',
      locale: locale === 'fr' ? 'fr_BR' : 'pt_BR',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Rtec Tecnologia' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

const ctaButtonClass
  = 'inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2';

export default async function Index(props: IIndexProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  const whatsappUrl = Env.NEXT_PUBLIC_WHATSAPP_URL ?? '#cta';
  const baseUrl = getBaseUrl();

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Rtec Tecnologia',
    'url': baseUrl,
    'logo': `${baseUrl}/rtec-logo.png`,
    'description': t('meta_description'),
    'slogan': 'Soluções Tecnológicas',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero */}
      <section
        className="w-full bg-gradient-to-b from-slate-100/90 via-slate-200/60 to-slate-300/80 px-4 py-24 sm:px-6 md:py-28 lg:py-32"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="hero-heading"
            className="animate-fade-in-up text-2xl leading-tight font-bold tracking-tight text-balance text-slate-900 opacity-0 sm:text-3xl md:text-4xl lg:text-5xl"
          >
            {t('hero_title')}
          </h1>
          <p className="animate-fade-in-up animate-delay-1 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 opacity-0 sm:text-xl">
            {t('hero_subtitle')}
          </p>
          <div className="animate-fade-in-up animate-delay-2 mt-10 flex flex-col items-center gap-3 opacity-0">
            <Link
              href={whatsappUrl.startsWith('http') ? whatsappUrl : '#cta'}
              target={whatsappUrl.startsWith('http') ? '_blank' : undefined}
              rel={whatsappUrl.startsWith('http') ? 'noreferrer noopener' : undefined}
              className={`${ctaButtonClass} min-w-[16rem]`}
            >
              <WhatsAppIcon className="size-6 shrink-0" />
              <span>{t('cta_primary')}</span>
            </Link>
            <p className="text-sm text-slate-600">
              {t('cta_trust')}
            </p>
            <p className="text-xs text-slate-500">
              {t('cta_trust_extra')}
            </p>
          </div>
        </div>
      </section>

      {/* Sobre Nós / Nossa Trajetória */}
      <section
        className="w-full border-t border-zinc-300/60 bg-white/80 px-4 py-24 backdrop-blur-md sm:px-6 md:py-28"
        aria-labelledby="about-heading"
      >
        <AnimateInView className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p
                className="animate-on-visible text-sm font-semibold tracking-wider text-emerald-600 uppercase"
                aria-hidden
              >
                {t('about_badge')}
              </p>
              <h2
                id="about-heading"
                className="animate-on-visible stagger-1 mt-2 text-3xl font-bold tracking-tight text-slate-900"
              >
                {t('about_title')}
              </h2>
              <p className="animate-on-visible stagger-2 mt-6 text-lg leading-relaxed text-slate-600">
                {t('about_paragraph')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="animate-on-visible stagger-1 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 transition-all duration-300 hover:border-zinc-300 hover:shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('about_pillar_1_title')}
                </h3>
                <p className="mt-2 text-slate-600">
                  {t('about_pillar_1_sub')}
                </p>
              </div>
              <div className="animate-on-visible stagger-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 transition-all duration-300 hover:border-zinc-300 hover:shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('about_pillar_2_title')}
                </h3>
                <p className="mt-2 text-slate-600">
                  {t('about_pillar_2_sub')}
                </p>
              </div>
              <div className="animate-on-visible stagger-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 transition-all duration-300 hover:border-zinc-300 hover:shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('about_pillar_3_title')}
                </h3>
                <p className="mt-2 text-slate-600">
                  {t('about_pillar_3_sub')}
                </p>
              </div>
              <div className="animate-on-visible stagger-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 transition-all duration-300 hover:border-zinc-300 hover:shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('about_pillar_4_title')}
                </h3>
                <p className="mt-2 text-slate-600">
                  {t('about_pillar_4_sub')}
                </p>
              </div>
            </div>
          </div>
        </AnimateInView>
      </section>

      {/* Services */}
      <section
        className="w-full border-t border-zinc-300/60 bg-slate-100/90 px-4 py-24 backdrop-blur-md sm:px-6 md:py-28"
        aria-labelledby="services-heading"
      >
        <AnimateInView className="mx-auto max-w-5xl">
          <h2
            id="services-heading"
            className="animate-on-visible text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {t('services_title')}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:mt-16 md:grid-cols-3">
            <article className="animate-on-visible stagger-1 flex flex-col rounded-2xl border border-zinc-300/80 bg-slate-50/95 p-8 shadow-md shadow-slate-400/30 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-200/30">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase" aria-hidden>1</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('service_1_title')}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                {t('service_1_desc')}
              </p>
            </article>
            <article className="animate-on-visible stagger-2 flex flex-col rounded-2xl border border-zinc-300/80 bg-slate-50/95 p-8 shadow-md shadow-slate-400/30 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-200/30">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase" aria-hidden>2</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('service_2_title')}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                {t('service_2_desc')}
              </p>
            </article>
            <article className="animate-on-visible stagger-3 flex flex-col rounded-2xl border border-zinc-300/80 bg-slate-50/95 p-8 shadow-md shadow-slate-400/30 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-200/30">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase" aria-hidden>3</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('service_3_title')}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                {t('service_3_desc')}
              </p>
            </article>
          </div>
        </AnimateInView>
      </section>

      {/* Benefits */}
      <section
        className="w-full border-t border-zinc-300/60 bg-gradient-to-b from-slate-200/80 via-slate-200/70 to-zinc-300/80 px-4 py-24 sm:px-6 md:py-28"
        aria-labelledby="benefits-heading"
      >
        <AnimateInView className="mx-auto max-w-5xl">
          <h2
            id="benefits-heading"
            className="animate-on-visible text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {t('benefits_title')}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:mt-16 md:grid-cols-3">
            <div className="animate-on-visible stagger-1 flex flex-col rounded-2xl border border-zinc-300/80 bg-slate-50/95 p-8 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase" aria-hidden>1</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('benefit_1_title')}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                {t('benefit_1_desc')}
              </p>
            </div>
            <div className="animate-on-visible stagger-2 flex flex-col rounded-2xl border border-zinc-300/80 bg-slate-50/95 p-8 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase" aria-hidden>2</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('benefit_2_title')}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                {t('benefit_2_desc')}
              </p>
            </div>
            <div className="animate-on-visible stagger-3 flex flex-col rounded-2xl border border-zinc-300/80 bg-slate-50/95 p-8 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase" aria-hidden>3</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('benefit_3_title')}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                {t('benefit_3_desc')}
              </p>
            </div>
          </div>
        </AnimateInView>
      </section>

      {/* Como trabalhamos */}
      <section
        className="w-full border-t border-zinc-300/60 bg-slate-100/85 px-4 py-24 backdrop-blur-md sm:px-6 md:py-28"
        aria-labelledby="how-heading"
      >
        <AnimateInView className="mx-auto max-w-5xl">
          <h2
            id="how-heading"
            className="animate-on-visible text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {t('how_title')}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
            <div className="animate-on-visible stagger-1 flex flex-col rounded-2xl border border-zinc-300 bg-slate-200/60 p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-md">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">
                1
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('how_1_title')}
              </h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                {t('how_1_desc')}
              </p>
            </div>
            <div className="animate-on-visible stagger-2 flex flex-col rounded-2xl border border-zinc-300 bg-slate-200/60 p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-md">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">
                2
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('how_2_title')}
              </h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                {t('how_2_desc')}
              </p>
            </div>
            <div className="animate-on-visible stagger-3 flex flex-col rounded-2xl border border-zinc-300 bg-slate-200/60 p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-md">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">
                3
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('how_3_title')}
              </h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                {t('how_3_desc')}
              </p>
            </div>
            <div className="animate-on-visible stagger-4 flex flex-col rounded-2xl border border-zinc-300 bg-slate-200/60 p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-md">
              <span className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">
                4
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t('how_4_title')}
              </h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                {t('how_4_desc')}
              </p>
            </div>
          </div>
        </AnimateInView>
      </section>

      {/* FAQ */}
      <section
        className="w-full border-t border-zinc-300/60 bg-zinc-100 px-4 py-24 backdrop-blur-md sm:px-6 md:py-28"
        aria-labelledby="faq-heading"
      >
        <AnimateInView className="mx-auto max-w-3xl">
          <h2
            id="faq-heading"
            className="animate-on-visible text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            {t('faq_title')}
          </h2>
          <FaqAccordion
            items={[
              { q: t('faq_1_q'), a: t('faq_1_a') },
              { q: t('faq_2_q'), a: t('faq_2_a') },
              { q: t('faq_3_q'), a: t('faq_3_a') },
              { q: t('faq_4_q'), a: t('faq_4_a') },
              { q: t('faq_5_q'), a: t('faq_5_a') },
            ]}
          />
        </AnimateInView>
      </section>

      {/* CTA Final */}
      <section
        id="cta"
        className="w-full border-t border-zinc-300/60 bg-gradient-to-b from-slate-200/90 via-slate-200/70 to-emerald-900/20 px-4 py-24 sm:px-6 md:py-28"
        aria-labelledby="cta-heading"
      >
        <AnimateInView className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl border border-emerald-300/70 bg-slate-100/95 px-6 py-12 shadow-lg shadow-slate-400/30 backdrop-blur-sm sm:px-10 sm:py-14">
            <h2
              id="cta-heading"
              className="animate-on-visible text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              {t('cta_final_title')}
            </h2>
            <div className="animate-on-visible stagger-1 mt-10 flex flex-col items-center gap-3">
              <Link
                href={whatsappUrl.startsWith('http') ? whatsappUrl : '#'}
                target={whatsappUrl.startsWith('http') ? '_blank' : undefined}
                rel={whatsappUrl.startsWith('http') ? 'noreferrer noopener' : undefined}
                className={`${ctaButtonClass} min-w-[16rem]`}
              >
                <WhatsAppIcon className="size-6 shrink-0" />
                <span>{t('cta_primary')}</span>
              </Link>
              <p className="text-xs text-slate-600">
                {t('cta_trust_extra')}
              </p>
            </div>
          </div>
        </AnimateInView>
      </section>
    </>
  );
}
