import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/libs/I18nNavigation';
import { AppConfig } from '@/utils/AppConfig';

export const BaseTemplate = (props: {
  leftNav?: React.ReactNode | null;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const t = useTranslations('BaseTemplate');

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-slate-300/80 via-slate-200/60 to-zinc-300/90 text-slate-700 antialiased">
      <a href="#main-content" className="skip-link">
        {t('skip_to_content')}
      </a>
      <div className="mx-auto mt-4 flex w-full max-w-5xl flex-1 flex-col px-4 sm:mt-6 sm:px-6 lg:px-8">
        <header className="shrink-0 rounded-t-2xl border-b border-zinc-300/90 bg-slate-100/95 px-6 py-5 shadow-md shadow-slate-300/40 backdrop-blur-md sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {props.leftNav != null && props.leftNav !== undefined
              ? (
                  <nav aria-label="Main navigation">
                    <ul className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600 sm:gap-8">
                      {props.leftNav}
                    </ul>
                  </nav>
                )
              : (
                  <Link
                    href="/"
                    className="flex items-center rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
                    aria-label={AppConfig.name}
                  >
                    <Image
                      src="/rtec-logo.png"
                      alt="Rtec Tecnologia - Soluções Tecnológicas"
                      width={280}
                      height={80}
                      className="h-14 w-auto object-contain sm:h-16 lg:h-[4.5rem]"
                      priority
                    />
                  </Link>
                )}

            {props.rightNav != null
              ? (
                  <nav>
                    <ul className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600 sm:gap-8">
                      {props.rightNav}
                    </ul>
                  </nav>
                )
              : null}
          </div>
        </header>

        <main id="main-content" className="flex-1" tabIndex={-1}>
          {props.children}
        </main>

        <footer className="shrink-0 rounded-b-2xl border-t border-zinc-300/90 bg-slate-100/90 py-8 shadow-md shadow-slate-300/30 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm text-slate-600">
            <p>
              ©
              {' '}
              {new Date().getFullYear()}
              {' '}
              {AppConfig.name}
              .
              {' '}
              {t('footer_rights')}
            </p>
            <span className="hidden sm:inline" aria-hidden>·</span>
            <Link
              href="/sitemap.xml"
              className="rounded underline decoration-slate-400 underline-offset-2 transition-colors hover:text-emerald-600 hover:decoration-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
            >
              {t('sitemap_link')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
