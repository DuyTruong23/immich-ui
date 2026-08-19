import { redirect } from '@sveltejs/kit';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { COOK_PATH } from '$custom/utils/cook-route';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
import { Route } from '$lib/route';
import { getFormatter } from '$lib/utils/i18n';
import type { PageLoad } from './$types';

export const load = (async ({ parent, url }) => {
  await parent();

  const continueUrl = Route.continue(url.searchParams.get('continue'), COOK_PATH);
  const uiDevMode = isUiDevMode();

  if (authManager.authenticated) {
    redirect(307, continueUrl);
  }

  if (!uiDevMode && !serverConfigManager.value.isInitialized) {
    redirect(307, Route.register());
  }

  const $t = await getFormatter();

  return {
    meta: {
      title: uiDevMode ? $t('ui_dev_mode_title') : $t('login'),
    },
    continueUrl,
    uiDevMode,
  };
}) satisfies PageLoad;
