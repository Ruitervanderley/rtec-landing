/** Static version for Cloudflare Pages build — no headers(), no db. */
import { getTranslations } from 'next-intl/server';

export const CurrentCount = async () => {
  const t = await getTranslations('CurrentCount');
  return (
    <div>
      {t('count', { count: 0 })}
    </div>
  );
};
