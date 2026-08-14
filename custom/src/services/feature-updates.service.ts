import {
  DEFAULT_FEATURE_UPDATE_ITEMS,
  DEFAULT_FEATURE_UPDATE_RELEASES,
  DEFAULT_FEATURE_UPDATE_VERSION,
  type FeatureUpdatesConfig,
} from '$custom/constants/feature-updates';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK, FEATURE_UPDATES_MOCK_RELEASES } from '$custom/mocks/feature-updates';
import { withFeatureUpdateReleases } from '$custom/utils/feature-update-items';

export const getDefaultFeatureUpdatesConfig = (): FeatureUpdatesConfig =>
  withFeatureUpdateReleases({
    version: DEFAULT_FEATURE_UPDATE_VERSION,
    items: isUiDevMode() ? [...FEATURE_UPDATES_MOCK] : [...DEFAULT_FEATURE_UPDATE_ITEMS],
    releases: isUiDevMode() ? FEATURE_UPDATES_MOCK_RELEASES : DEFAULT_FEATURE_UPDATE_RELEASES,
  });

/** Modal đọc trực tiếp custom/src/data/feature-updates.json (không qua Blob/API). */
export const peekFeatureUpdatesConfig = (): FeatureUpdatesConfig => getDefaultFeatureUpdatesConfig();

export const fetchFeatureUpdatesConfig = async (_options?: { force?: boolean }): Promise<FeatureUpdatesConfig> =>
  getDefaultFeatureUpdatesConfig();

export const invalidateFeatureUpdatesCache = (): void => {
  /* nội dung lấy từ file JSON lúc build — không cache network */
};
