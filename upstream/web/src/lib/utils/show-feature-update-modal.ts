import { fetchFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import FeatureUpdateModal from '../../routes/FeatureUpdateModal.svelte';
import { modalManager } from '@immich/ui';

type ShowFeatureUpdateModalOptions = {
  accessToken?: string;
  version?: string;
  updates?: readonly string[];
  originElement?: HTMLElement | null;
};

export const showFeatureUpdateModal = async ({
  accessToken,
  version,
  updates,
  originElement = null,
}: ShowFeatureUpdateModalOptions = {}) => {
  const preview = isUiDevMode();
  const config = updates && version ? { version, items: [...updates] } : await fetchFeatureUpdatesConfig();

  return modalManager.show(FeatureUpdateModal, {
    accessToken: preview ? undefined : accessToken,
    version: config.version,
    updates: config.items,
    preview,
    originElement,
  });
};
