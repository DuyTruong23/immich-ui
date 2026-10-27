import { getFormatter } from '$lib/utils/i18n';

export const load = async () => {
  const $t = await getFormatter();

  return {
    meta: { title: $t('pg_blocked_title') },
  };
};
