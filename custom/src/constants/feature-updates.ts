import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK } from '$custom/mocks/feature-updates';

export const FEATURE_UPDATES = [
  'Trang thông báo khi hệ thống đang bảo trì hoặc không khả dụng',
  'Giao diện lỗi và trang bảo trì được căn giữa trên mọi thiết bị',
  'Cải thiện trải nghiệm đăng nhập và thông báo cho admin',
] as const;

export const getFeatureUpdatesForDisplay = (): readonly string[] =>
  isUiDevMode() ? FEATURE_UPDATES_MOCK : FEATURE_UPDATES;
