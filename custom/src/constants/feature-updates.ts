import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK } from '$custom/mocks/feature-updates';
import { fetchFeatureUpdatesConfig, getDefaultFeatureUpdatesConfig } from '$custom/services/feature-updates.service';

/** Phiên bản mặc định trên modal "Tính năng được cập nhật" */
export const DEFAULT_FEATURE_UPDATE_VERSION = 'v1.0.3';

export const DEFAULT_FEATURE_UPDATE_ITEMS = [
  'Cải thiện tốc độ xem video trên thiết bị di động',
  'Form đăng nhập hỗ trợ chặn autofill mật khẩu tốt hơn khi dùng OAuth',
  'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh'
,
] as const;

export type FeatureUpdatesConfig = {
  version: string;
  items: string[];
};

/** @deprecated Dùng fetchFeatureUpdatesConfig() */
export const FEATURE_UPDATE_VERSION = DEFAULT_FEATURE_UPDATE_VERSION;

/** @deprecated Dùng fetchFeatureUpdatesConfig() */
export const FEATURE_UPDATES = DEFAULT_FEATURE_UPDATE_ITEMS;

export const getFeatureUpdatesForDisplay = (): readonly string[] =>
  isUiDevMode() ? FEATURE_UPDATES_MOCK : DEFAULT_FEATURE_UPDATE_ITEMS;

export const loadFeatureUpdatesForDisplay = async (): Promise<FeatureUpdatesConfig> => {
  if (isUiDevMode()) {
    return getDefaultFeatureUpdatesConfig();
  }

  return fetchFeatureUpdatesConfig();
};
