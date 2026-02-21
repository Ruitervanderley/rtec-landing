import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { db } from '@/libs/DB';
import { logger } from '@/libs/Logger';
import { counterSchema } from '@/models/Schema';

export const CurrentCount = async () => {
  const t = await getTranslations('CurrentCount');

  const id = Number((await headers()).get('x-e2e-random-id')) || 0;
  const result = await db.query.counterSchema.findFirst({
    where: eq(counterSchema.id, id),
  });
  const count = result?.count ?? 0;

  logger.info('Counter fetched successfully');

  return (
    <div>
      {t('count', { count })}
    </div>
  );
};
