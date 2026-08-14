import { fetchFeatureUpdatesConfig, peekFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import type { FeatureUpdateItem } from '$custom/utils/feature-update-items';
import FeatureUpdateModal from '../../routes/FeatureUpdateModal.svelte';
import { modalManager } from '@immich/ui';

type ShowFeatureUpdateModalOptions = {
  accessToken?: string;
  version?: string;
  updates?: readonly FeatureUpdateItem[];
  originElement?: HTMLElement | null;
};

export const showFeatureUpdateModal = async ({
  accessToken,
  version,
  updates,
  originElement = null,
}: ShowFeatureUpdateModalOptions = {}) => {
  const preview = isUiDevMode();
  const config =
    updates && version ? { version, items: [...updates] } : peekFeatureUpdatesConfig();

  void fetchFeatureUpdatesConfig({ force: true });

  // Yield so the originating click does not dismiss the dialog as an outside click.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

  return modalManager.show(FeatureUpdateModal, {
    accessToken: preview ? undefined : accessToken,
    version: config.version,
    updates: config.items,
    preview,
    originElement,
  });
};
