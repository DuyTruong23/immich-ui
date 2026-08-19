import { getFormatter } from '$lib/utils/i18n';
import type { PageLoad } from './$types';

export const load = (async () => {
  const $t = await getFormatter();

  return {
    meta: {
      title: $t('pg_maintenance_title'),
    },
  };
}) satisfies PageLoad;
