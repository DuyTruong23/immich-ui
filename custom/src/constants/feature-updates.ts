import release from '$custom/data/feature-updates.json';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK } from '$custom/mocks/feature-updates';
import { fetchFeatureUpdatesConfig, getDefaultFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
import type { FeatureUpdateItem, FeatureUpdatesConfig } from '$custom/utils/feature-update-items';

export type { FeatureUpdateItem, FeatureUpdatesConfig };

/** Phiên bản mặc định trên modal "Tính năng được cập nhật" — nguồn: custom/src/data/feature-updates.json */
export const DEFAULT_FEATURE_UPDATE_VERSION = release.version;

export const DEFAULT_FEATURE_UPDATE_ITEMS: FeatureUpdateItem[] = release.items;

/** @deprecated Dùng fetchFeatureUpdatesConfig() */
export const FEATURE_UPDATE_VERSION = DEFAULT_FEATURE_UPDATE_VERSION;

/** @deprecated Dùng fetchFeatureUpdatesConfig() */
export const FEATURE_UPDATES = DEFAULT_FEATURE_UPDATE_ITEMS.map((item) => item.title);

export const getFeatureUpdatesForDisplay = (): readonly FeatureUpdateItem[] =>
  isUiDevMode() ? FEATURE_UPDATES_MOCK : DEFAULT_FEATURE_UPDATE_ITEMS;

export const loadFeatureUpdatesForDisplay = async (): Promise<FeatureUpdatesConfig> => {
  if (isUiDevMode()) {
    return getDefaultFeatureUpdatesConfig();
  }

  return fetchFeatureUpdatesConfig();
};
