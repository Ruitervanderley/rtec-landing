/** Static version for Cloudflare Pages — no CurrentCount (no headers/db). */
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { CounterForm } from '@/components/CounterForm';
import { AppConfig } from '@/utils/AppConfig';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return AppConfig.locales.map(locale => ({ locale }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Counter',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default function CounterPages() {
  const t = useTranslations('Counter');
  const tCount = useTranslations('CurrentCount');

  return (
    <>
      <CounterForm />

      <div className="mt-3">
        <div>{tCount('count', { count: 0 })}</div>
      </div>

      <div className="mt-5 text-center text-sm">
        {`${t('security_powered_by')} `}
        <a
          className="text-blue-700 hover:border-b-2 hover:border-blue-700"
          href="https://launch.arcjet.com/Q6eLbRE"
        >
          Arcjet
        </a>
      </div>

      <a
        href="https://launch.arcjet.com/Q6eLbRE"
      >
        <Image
          className="mx-auto mt-2"
          src="/assets/images/arcjet-light.svg"
          alt="Arcjet"
          width={128}
          height={38}
        />
      </a>
    </>
  );
}
