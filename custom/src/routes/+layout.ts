import { commandPaletteManager } from '@immich/ui';
import { goto } from '$app/navigation';
import '$lib/branding/icloud-logos';
import {
  PUBLIC_APP_NAME,
  PUBLIC_COMPANY_NAME,
  PUBLIC_DEFAULT_LANGUAGE,
  PUBLIC_DEFAULT_THEME,
  PUBLIC_ENABLE_ADMIN,
  PUBLIC_ENABLE_ANALYTICS,
  PUBLIC_ENABLE_LOGIN_NOTIFY,
  PUBLIC_ENABLE_ARCHIVE,
  PUBLIC_ENABLE_DASHBOARD,
  PUBLIC_ENABLE_EXPERIMENTAL,
  PUBLIC_ENABLE_EXPLORE,
  PUBLIC_ENABLE_FOLDERS,
  PUBLIC_ENABLE_MAP,
  PUBLIC_ENABLE_MEMORIES,
  PUBLIC_ENABLE_PARTNER,
  PUBLIC_ENABLE_PEOPLE,
  PUBLIC_ENABLE_SEARCH,
  PUBLIC_ENABLE_SHARED_LINKS,
  PUBLIC_ENABLE_SHARING,
  PUBLIC_ENABLE_TAGS,
  PUBLIC_ENABLE_TRASH,
  PUBLIC_ENABLE_UTILITIES,
  PUBLIC_ENABLE_WORKFLOWS,
  PUBLIC_IMMICH_SERVER_URL,
  PUBLIC_SESSION_ONLY_AUTH,
  PUBLIC_THEME,
} from '$env/static/public';
import { env as publicEnvDynamic } from '$env/dynamic/public';
import { getAppConfig } from '@photo-gallery/config';
import { bootstrapAppConfig } from '$custom/providers/app-config';
import { enforceFeatureRoute } from '$custom/hooks/feature-guard';
import { createServerConnectionError, isServerConnectionError } from '$custom/utils/server-connection-error';
import { languageManager } from '$lib/managers/language-manager.svelte';
import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
import { maintenanceCreateUrl, maintenanceReturnUrl, maintenanceShouldRedirect } from '$lib/utils/maintenance';
import { init } from '$lib/utils/server';
import type { LayoutLoad } from './$types';

export const ssr = false;
export const csr = true;

export const load = (async ({ fetch, url }) => {
  bootstrapAppConfig({
    PUBLIC_IMMICH_SERVER_URL,
    PUBLIC_APP_NAME,
    PUBLIC_COMPANY_NAME,
    PUBLIC_THEME,
    PUBLIC_DEFAULT_THEME,
    PUBLIC_DEFAULT_LANGUAGE,
    PUBLIC_ENABLE_ANALYTICS,
    PUBLIC_ENABLE_ADMIN,
    PUBLIC_ENABLE_EXPERIMENTAL,
    PUBLIC_SESSION_ONLY_AUTH,
    PUBLIC_ENABLE_LOGIN_NOTIFY,
    PUBLIC_UI_DEV_MODE: publicEnvDynamic.PUBLIC_UI_DEV_MODE ?? 'false',
    PUBLIC_ENABLE_MEMORIES,
    PUBLIC_ENABLE_PARTNER,
    PUBLIC_ENABLE_SHARING,
    PUBLIC_ENABLE_MAP,
    PUBLIC_ENABLE_PEOPLE,
    PUBLIC_ENABLE_SEARCH,
    PUBLIC_ENABLE_EXPLORE,
    PUBLIC_ENABLE_TRASH,
    PUBLIC_ENABLE_UTILITIES,
    PUBLIC_ENABLE_WORKFLOWS,
    PUBLIC_ENABLE_SHARED_LINKS,
    PUBLIC_ENABLE_FOLDERS,
    PUBLIC_ENABLE_TAGS,
    PUBLIC_ENABLE_ARCHIVE,
    PUBLIC_ENABLE_DASHBOARD,
  });

  await enforceFeatureRoute(url.pathname);

  const uiDevMode = getAppConfig().publicEnv.uiDevMode;

  let error;
  try {
    await init(fetch);

    if (!uiDevMode && maintenanceShouldRedirect(serverConfigManager.value.maintenanceMode, url)) {
      await goto(
        serverConfigManager.value.maintenanceMode ? maintenanceCreateUrl(url) : maintenanceReturnUrl(url.searchParams),
      );
    }
  } catch (initError) {
    if (uiDevMode) {
      console.warn('[ui-dev-mode] init fallback', initError);
    } else if (isServerConnectionError(initError)) {
      error = createServerConnectionError(initError);
    } else {
      error = initError;
    }
  }

  commandPaletteManager.enable();
  languageManager.init();

  return {
    error,
    meta: {
      title: PUBLIC_APP_NAME || 'Photo Gallery',
    },
  };
}) satisfies LayoutLoad;
