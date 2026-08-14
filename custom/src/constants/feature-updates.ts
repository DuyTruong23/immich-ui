import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK } from '$custom/mocks/feature-updates';
import { fetchFeatureUpdatesConfig, getDefaultFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
import type { FeatureUpdateItem, FeatureUpdatesConfig } from '$custom/utils/feature-update-items';

export type { FeatureUpdateItem, FeatureUpdatesConfig };

/** Phiên bản mặc định trên modal "Tính năng được cập nhật" */
export const DEFAULT_FEATURE_UPDATE_VERSION = 'v1.0.3';

export const DEFAULT_FEATURE_UPDATE_ITEMS: FeatureUpdateItem[] = [
  {
    title: 'Cải thiện tốc độ xem video trên thiết bị di động',
    detail:
      'Video trên điện thoại tải nhanh hơn nhờ preload thông minh và HLS lazy-load. Mở một video bất kỳ trong thư viện để thử — thời gian chờ buffer ngắn hơn so với trước.',
  },
  {
    title: 'Cho phép đổi avatar, tên',
    detail:
      'Vào Cài đặt → Tài khoản, bấm avatar hoặc tên để chỉnh sửa. Bạn có thể tải ảnh đại diện mới thay vì chỉ chọn màu chữ cái.',
  },
  {
    title: 'Form đăng nhập hỗ trợ chặn autofill mật khẩu tốt hơn khi dùng OAuth',
    detail:
      'Khi đăng nhập bằng OAuth, trình duyệt sẽ không tự điền mật khẩu vào form nữa. Dùng email/mật khẩu hoặc nút OAuth như bình thường.',
  },
  {
    title: 'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh',
    detail:
      'Trang quản trị hiển thị bảng và thư viện ngoài dễ cuộn hơn trên màn hình nhỏ. Mở /admin trên điện thoại để kiểm tra bố cục mới.',
  },
];

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
