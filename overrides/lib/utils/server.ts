import { defaults } from '@immich/sdk';
import { memoize } from 'lodash-es';
import { bootstrapUiDevMode, isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { createUiDevFetch } from '$custom/hooks/ui-dev-fetch';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
import { initLanguage } from '$lib/utils';

type Fetch = typeof fetch;

async function _init(fetch: Fetch) {
  if (isUiDevMode()) {
    defaults.fetch = createUiDevFetch(fetch);
    await initLanguage();
    bootstrapUiDevMode();
    await authManager.load();
    return;
  }

  defaults.fetch = fetch;
  await initLanguage();

  await serverConfigManager.init();
  await authManager.load();

  if (!serverConfigManager.value.maintenanceMode) {
    await featureFlagsManager.init();
  }
}

export const init = memoize(_init, () => 'singlevalue');
