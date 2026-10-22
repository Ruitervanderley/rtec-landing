'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/libs/I18nNavigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('BaseTemplate');

  return (
    <nav aria-label={t('language_label')} className="flex items-center gap-1 text-sm">
      {[
        { locale: 'pt-BR', label: t('portuguese_label'), short: 'PT' },
        { locale: 'fr', label: t('french_label'), short: 'FR' },
      ].map(language => (
        <Link
          key={language.locale}
          href={pathname}
          locale={language.locale}
          hrefLang={language.locale}
          lang={language.locale}
          aria-label={language.label}
          aria-current={locale === language.locale ? 'page' : undefined}
          className={`rounded-lg px-3 py-3 ${locale === language.locale ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {language.short}
        </Link>
      ))}
    </nav>
  );
}
