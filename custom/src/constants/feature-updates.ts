import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK } from '$custom/mocks/feature-updates';

/** Phiên bản hiển thị trên modal "Tính năng được cập nhật" sau đăng nhập */
export const FEATURE_UPDATE_VERSION = 'v1.0.3';

export const FEATURE_UPDATES = [
  'Modal thông báo tính năng mới sau đăng nhập — gửi góp ý trực tiếp cho admin',
  'Trang bảo trì thân thiện khi hệ thống không khả dụng (404, lỗi server)',
  'Giao diện lỗi và trang bảo trì được căn giữa trên mọi thiết bị',
  'Form đăng nhập hỗ trợ autofill mật khẩu tốt hơn khi dùng OAuth',
  'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh',
  'Video tải nhanh hơn trên mobile — ưu tiên file đã transcode sẵn',
] as const;

export const getFeatureUpdatesForDisplay = (): readonly string[] =>
  isUiDevMode() ? FEATURE_UPDATES_MOCK : FEATURE_UPDATES;
