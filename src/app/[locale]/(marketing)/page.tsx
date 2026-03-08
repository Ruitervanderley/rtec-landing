import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { AnimateInView } from '@/components/AnimateInView';
import { FaqAccordion } from '@/components/FaqAccordion';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import { Env } from '@/libs/Env';
import { routing } from '@/libs/I18nRouting';
import { getBaseUrl, getI18nPath } from '@/utils/Helpers';

type IndexPageProps = {
  params: Promise<{ locale: string }>;
};

const openGraphLocaleByLocale: Record<string, string> = {
  'pt-BR': 'pt_BR',
  'fr': 'fr_FR',
};

function IconBuilding() {
  return (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  );
}

function IconBot() {
  return (
    <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function IconServer() {
  return (
    <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function IconTrendingDown() {
  return (
    <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m6 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

const ctaButtonClass
  = 'inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-7 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:scale-[1.03] hover:bg-emerald-500 hover:shadow-emerald-500/35 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0b1121]';

export async function generateMetadata(props: IndexPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'Index' });
  const baseUrl = getBaseUrl();
  const path = getI18nPath('', locale);
  const canonicalUrl = path ? `${baseUrl}${path}` : baseUrl;
  const languageAlternates = Object.fromEntries(
    routing.locales.map(currentLocale => [
      currentLocale,
      `${baseUrl}${getI18nPath('', currentLocale)}`,
    ]),
  );
  const title = t('meta_title');
  const description = t('meta_description');
  const ogImage = `${baseUrl}/rtec-logo.png`;

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

export default async function IndexPage(props: IndexPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Index' });
  const baseUrl = getBaseUrl();
  const whatsappUrl = Env.NEXT_PUBLIC_WHATSAPP_URL ?? '#cta';
  const primaryCtaHref = whatsappUrl.startsWith('http') ? whatsappUrl : '#cta';
  const isExternalCta = primaryCtaHref.startsWith('http');

  const stats = [
    { value: '2018', label: t('stats_foundation_label') },
    { value: '99.9%', label: t('stats_uptime_label') },
    { value: '24/7', label: t('stats_monitoring_label') },
    { value: 'IA', label: t('stats_automation_label') },
  ];

  const aboutPillars = [
    { title: t('about_pillar_1_title'), sub: t('about_pillar_1_sub'), icon: <IconBuilding />, color: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/10' },
    { title: t('about_pillar_2_title'), sub: t('about_pillar_2_sub'), icon: <IconGlobe />, color: 'text-blue-400', glow: 'group-hover:shadow-blue-500/10' },
    { title: t('about_pillar_3_title'), sub: t('about_pillar_3_sub'), icon: <IconCpu />, color: 'text-purple-400', glow: 'group-hover:shadow-purple-500/10' },
    { title: t('about_pillar_4_title'), sub: t('about_pillar_4_sub'), icon: <IconCloud />, color: 'text-cyan-400', glow: 'group-hover:shadow-cyan-500/10' },
  ];

  const services = [
    { num: '01', title: t('service_1_title'), desc: t('service_1_desc'), icon: <IconBot />, gradient: 'from-emerald-500/20 to-transparent', border: 'hover:border-emerald-500/30', iconColor: 'text-emerald-400' },
    { num: '02', title: t('service_2_title'), desc: t('service_2_desc'), icon: <IconServer />, gradient: 'from-blue-500/20 to-transparent', border: 'hover:border-blue-500/30', iconColor: 'text-blue-400' },
    { num: '03', title: t('service_3_title'), desc: t('service_3_desc'), icon: <IconLink />, gradient: 'from-purple-500/20 to-transparent', border: 'hover:border-purple-500/30', iconColor: 'text-purple-400' },
  ];

  const benefits = [
    { title: t('benefit_1_title'), desc: t('benefit_1_desc'), icon: <IconTrendingDown />, color: 'text-emerald-400', border: 'hover:border-emerald-500/30' },
    { title: t('benefit_2_title'), desc: t('benefit_2_desc'), icon: <IconRocket />, color: 'text-blue-400', border: 'hover:border-blue-500/30' },
    { title: t('benefit_3_title'), desc: t('benefit_3_desc'), icon: <IconShield />, color: 'text-purple-400', border: 'hover:border-purple-500/30' },
  ];

  const processSteps = [
    { step: '01', title: t('how_1_title'), desc: t('how_1_desc') },
    { step: '02', title: t('how_2_title'), desc: t('how_2_desc') },
    { step: '03', title: t('how_3_title'), desc: t('how_3_desc') },
    { step: '04', title: t('how_4_title'), desc: t('how_4_desc') },
  ];

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Rtec Tecnologia',
    'url': baseUrl,
    'logo': `${baseUrl}/rtec-logo.png`,
    'description': t('meta_description'),
    'slogan': t('organization_slogan'),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      <section
        className="relative w-full overflow-hidden px-4 pt-20 pb-16 sm:px-6 md:pt-28 md:pb-24 lg:pt-36 lg:pb-32"
        aria-labelledby="hero-heading"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2" aria-hidden>
          <div className="h-[600px] w-[900px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_65%)] blur-3xl" />
        </div>
        <div className="pointer-events-none absolute top-20 -right-40" aria-hidden>
          <div className="h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_60%)] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 opacity-0">
            <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
            {t('hero_brand')}
          </div>

          <h1
            id="hero-heading"
            className="animate-fade-in-up animate-delay-1 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-3xl leading-[1.1] font-extrabold tracking-tight text-transparent opacity-0 sm:text-4xl md:text-5xl lg:text-[3.5rem]"
          >
            {t('hero_title')}
          </h1>
          <p className="animate-fade-in-up animate-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 opacity-0 sm:text-xl">
            {t('hero_subtitle')}
          </p>

          <div className="animate-fade-in-up animate-delay-3 mt-10 flex flex-col items-center gap-4 opacity-0">
            <Link
              href={primaryCtaHref}
              target={isExternalCta ? '_blank' : undefined}
              rel={isExternalCta ? 'noreferrer noopener' : undefined}
              className={`${ctaButtonClass} min-w-[16rem]`}
            >
              <WhatsAppIcon className="size-6 shrink-0" />
              <span>{t('cta_primary')}</span>
            </Link>
            <p className="text-sm text-slate-500">
              {t('cta_trust')}
              {' '}
              {t('cta_trust_extra')}
            </p>
          </div>
        </div>
      </section>

      <section className="w-full border-y border-white/[0.06] bg-white/[0.02] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 sm:gap-16">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-extrabold tracking-tight text-emerald-400 sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative w-full px-4 py-24 sm:px-6 md:py-28" aria-labelledby="about-heading">
        <AnimateInView className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="animate-on-visible text-sm font-semibold tracking-widest text-emerald-500 uppercase">
                {t('about_badge')}
              </p>
              <h2
                id="about-heading"
                className="animate-on-visible stagger-1 mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                {t('about_title')}
              </h2>
              <p className="animate-on-visible stagger-2 mt-6 text-lg leading-relaxed text-slate-400">
                {t('about_paragraph')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {aboutPillars.map((pillar, index) => (
                <div
                  key={pillar.title}
                  className={`animate-on-visible stagger-${index + 1} group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-xl ${pillar.glow}`}
                >
                  <div className={pillar.color}>
                    {pillar.icon}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {pillar.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AnimateInView>
      </section>

      <section
        className="relative w-full border-t border-white/[0.06] bg-[#060a14] px-4 py-24 sm:px-6 md:py-28"
        aria-labelledby="services-heading"
      >
        <AnimateInView className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-emerald-500 uppercase">{t('services_badge')}</p>
            <h2 id="services-heading" className="animate-on-visible mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {t('services_title')}
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {services.map((service, index) => (
              <article
                key={service.num}
                className={`animate-on-visible stagger-${index + 1} group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${service.border}`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${service.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <div className={`inline-flex rounded-xl bg-white/[0.06] p-3 ${service.iconColor}`}>
                    {service.icon}
                  </div>
                  <span className="mt-5 block text-xs font-bold tracking-widest text-slate-600 uppercase">
                    {service.num}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-white">{service.title}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-slate-400">{service.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </AnimateInView>
      </section>

      <section className="relative w-full border-t border-white/[0.06] px-4 py-24 sm:px-6 md:py-28" aria-labelledby="benefits-heading">
        <AnimateInView className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-emerald-500 uppercase">{t('benefits_badge')}</p>
            <h2 id="benefits-heading" className="animate-on-visible mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {t('benefits_title')}
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={`animate-on-visible stagger-${index + 1} group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.04] hover:shadow-xl ${benefit.border}`}
              >
                <div className={`inline-flex rounded-xl bg-white/[0.06] p-3 ${benefit.color}`}>
                  {benefit.icon}
                </div>
                <h3 className={`mt-4 text-lg font-bold ${benefit.color}`}>{benefit.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-slate-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </AnimateInView>
      </section>

      <section
        className="relative w-full border-t border-white/[0.06] bg-[#060a14] px-4 py-24 sm:px-6 md:py-28"
        aria-labelledby="how-heading"
      >
        <AnimateInView className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-emerald-500 uppercase">{t('how_badge')}</p>
            <h2 id="how-heading" className="animate-on-visible mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {t('how_title')}
            </h2>
          </div>
          <div className="relative mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute top-12 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent lg:block" aria-hidden />
            {processSteps.map((item, index) => (
              <div
                key={item.step}
                className={`animate-on-visible stagger-${index + 1} group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.04]`}
              >
                <div className="flex size-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </AnimateInView>
      </section>

      <section className="relative w-full border-t border-white/[0.06] px-4 py-24 sm:px-6 md:py-28" aria-labelledby="faq-heading">
        <AnimateInView className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-emerald-500 uppercase">{t('faq_badge')}</p>
            <h2 id="faq-heading" className="animate-on-visible mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t('faq_title')}
            </h2>
          </div>
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

      <section id="cta" className="relative w-full border-t border-white/[0.06] px-4 py-24 sm:px-6 md:py-32" aria-labelledby="cta-heading">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute bottom-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_55%)] blur-3xl" />
        </div>
        <AnimateInView className="relative mx-auto max-w-2xl text-center">
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-10 backdrop-blur-sm sm:p-14">
            <h2 id="cta-heading" className="animate-on-visible text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {t('cta_final_title')}
            </h2>
            <div className="animate-on-visible stagger-1 mt-10 flex flex-col items-center gap-4">
              <Link
                href={primaryCtaHref}
                target={isExternalCta ? '_blank' : undefined}
                rel={isExternalCta ? 'noreferrer noopener' : undefined}
                className={`${ctaButtonClass} min-w-[16rem]`}
              >
                <WhatsAppIcon className="size-6 shrink-0" />
                <span>{t('cta_primary')}</span>
              </Link>
              <p className="text-sm text-slate-500">{t('cta_trust_extra')}</p>
            </div>
          </div>
        </AnimateInView>
      </section>
    </>
  );
}
