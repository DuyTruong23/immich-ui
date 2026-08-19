import { getStoredAccessToken } from '$custom/hooks/access-token';
import { fetchFeatureUpdatesConfig, peekFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { isCookRoute } from '$custom/utils/cook-route';
import {
  coerceFeatureUpdateItems,
  upsertFeatureUpdateRelease,
  withFeatureUpdateReleases,
  type FeatureUpdateItem,
  type FeatureUpdateRelease,
} from '$custom/utils/feature-update-items';
import FeatureUpdateModal from '../../routes/FeatureUpdateModal.svelte';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { modalManager } from '@immich/ui';

type ShowFeatureUpdateModalOptions = {
  accessToken?: string;
  version?: string;
  updates?: readonly FeatureUpdateItem[];
  releases?: readonly FeatureUpdateRelease[];
  originElement?: HTMLElement | null;
  userId?: string;
  accountEmail?: string;
};

const getAuthIdentity = (): { userId?: string; accountEmail?: string } => {
  try {
    if (!authManager.authenticated) {
      return {};
    }

    return { userId: authManager.user.id, accountEmail: authManager.user.email };
  } catch {
    return {};
  }
};

export const showFeatureUpdateModal = async ({
  accessToken,
  version,
  updates,
  releases,
  originElement = null,
  userId,
  accountEmail,
}: ShowFeatureUpdateModalOptions = {}) => {
  if (typeof location !== 'undefined' && isCookRoute(location.pathname)) {
    return;
  }

  const preview = isUiDevMode();
  const peeked = peekFeatureUpdatesConfig();
  const identity = getAuthIdentity();
  const config = releases?.length
    ? withFeatureUpdateReleases({
        version: releases[0].version,
        items: releases[0].items,
        releases: [...releases],
      })
    : updates && version
      ? withFeatureUpdateReleases({
          version,
          items: [...updates],
          releases: upsertFeatureUpdateRelease(peeked.releases ?? [], version, [...updates]),
        })
      : peeked;

  void fetchFeatureUpdatesConfig({ force: true });

  // Yield so the originating click does not dismiss the dialog as an outside click.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

  return modalManager.show(FeatureUpdateModal, {
    accessToken: preview ? undefined : accessToken?.trim() || getStoredAccessToken(),
    version: config.version,
    updates: coerceFeatureUpdateItems(config.items),
    releases: config.releases,
    preview,
    originElement,
    userId: userId?.trim() || identity.userId,
    accountEmail: accountEmail?.trim() || identity.accountEmail,
  });
};
