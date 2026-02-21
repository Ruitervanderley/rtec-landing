import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

type IPortfolioProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IPortfolioProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Portfolio',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Portfolio(props: IPortfolioProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Portfolio',
  });

  return (
    <div className="min-h-full bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">
          {t('page_title')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          {t('page_subtitle')}
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
              {t('card1_badge')}
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              {t('card1_title')}
            </h2>
            <p className="mt-3 text-slate-600">
              {t('card1_description')}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
              {t('card2_badge')}
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              {t('card2_title')}
            </h2>
            <p className="mt-3 text-slate-600">
              {t('card2_description')}
            </p>
          </article>
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/#cta"
            className="inline-flex items-center justify-center rounded-xl border border-emerald-600 bg-emerald-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:border-emerald-700 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
          >
            {t('cta_button')}
          </Link>
        </div>
      </div>
    </div>
  );
}
