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
  const tRoot = useTranslations('RootLayout');
  const email = t('contact_email_value');
  const phone = t('contact_phone_value');
  const phoneHref = '5564999927088';

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0b1121] text-white antialiased">
      <a href="#main-content" className="skip-link">
        {t('skip_to_content')}
      </a>

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0b1121]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {props.leftNav != null && props.leftNav !== undefined
            ? (
                <nav aria-label="Main navigation">
                  <ul className="flex items-center gap-6 text-sm font-medium text-slate-300">
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
                    alt={t('brand_alt')}
                    width={180}
                    height={50}
                    className="h-10 w-auto object-contain brightness-110 sm:h-12"
                    priority
                  />
                </Link>
              )}

          {props.rightNav != null
            ? (
                <nav>
                  <ul className="flex items-center gap-6 text-sm font-medium">
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

      <footer className="border-t border-white/[0.06] bg-[#060a14]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/">
                <Image
                  src="/rtec-logo.png"
                  alt={t('brand_alt')}
                  width={160}
                  height={45}
                  className="h-10 w-auto brightness-110"
                />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                {t('company_description')}
              </p>
              <div className="mt-6 flex gap-4">
                <a
                  href="https://wa.me/5564999927088"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex size-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-500 transition-all hover:border-emerald-500/30 hover:text-emerald-400"
                  aria-label={t('social_whatsapp_label')}
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com/rtectecnologia"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex size-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-500 transition-all hover:border-pink-500/30 hover:text-pink-400"
                  aria-label={t('social_instagram_label')}
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
                {t('company_section_title')}
              </h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/" className="text-slate-500 transition-colors hover:text-emerald-400">{tRoot('home_link')}</Link></li>
                <li><Link prefetch={false} href="/portfolio" className="text-slate-500 transition-colors hover:text-emerald-400">{tRoot('portfolio_link')}</Link></li>
                <li><Link href="/#cta" className="text-slate-500 transition-colors hover:text-emerald-400">{tRoot('contact_link')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
                {t('contact_section_title')}
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <svg className="size-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <a href={`mailto:${email}`} className="transition-colors hover:text-emerald-400">
                    {email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="size-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <a href={`https://wa.me/${phoneHref}`} className="transition-colors hover:text-emerald-400">
                    {phone}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 size-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {t('contact_location_value')}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-xs text-slate-600">
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
            <Link
              href="/sitemap.xml"
              className="text-slate-600 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-emerald-400"
            >
              {t('sitemap_link')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
