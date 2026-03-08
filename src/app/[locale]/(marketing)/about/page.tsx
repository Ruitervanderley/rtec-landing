import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: AboutPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'About',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function AboutPage(props: AboutPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'About',
  });

  const pillars = [
    { title: t('pillar_1_title'), description: t('pillar_1_description') },
    { title: t('pillar_2_title'), description: t('pillar_2_description') },
    { title: t('pillar_3_title'), description: t('pillar_3_description') },
  ];

  return (
    <div className="min-h-full bg-[#0b1121] px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 shadow-2xl shadow-black/10 backdrop-blur-sm sm:p-12">
          <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
            {t('eyebrow')}
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t('hero_title')}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-400">
            {t('hero_description')}
          </p>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-white/[0.06] bg-[#060a14] p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {t('story_title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              {t('story_paragraph')}
            </p>
          </article>

          <aside className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {t('cta_title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              {t('cta_description')}
            </p>
            <Link
              href="/#cta"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#0b1121] focus:outline-none"
            >
              {t('cta_button')}
            </Link>
          </aside>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            {t('pillars_title')}
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {pillars.map(pillar => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:border-emerald-500/30"
              >
                <h3 className="text-lg font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
