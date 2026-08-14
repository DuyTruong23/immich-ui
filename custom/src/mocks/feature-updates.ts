import type { FeatureUpdateItem, FeatureUpdateRelease } from '$custom/utils/feature-update-items';

/** Mock data dùng khi preview modal ở UI dev mode (pnpm dev:local) */
export const FEATURE_UPDATES_MOCK: FeatureUpdateItem[] = [
  {
    title: 'Đăng ký email nhận thông báo tính năng',
    detail: 'Mock — nhập email trên modal để nhận changelog khi có phiên bản mới.',
  },
];

export const FEATURE_UPDATES_MOCK_RELEASES: FeatureUpdateRelease[] = [
  {
    version: 'v1.0.7',
    items: FEATURE_UPDATES_MOCK,
  },
  {
    version: 'v1.0.6',
    items: [
      {
        title: 'Cải thiện tốc độ xem video trên thiết bị di động',
        detail: 'Video trên điện thoại tải nhanh hơn, khả năng chờ khi loading.',
      },
      {
        title: 'Cho phép đổi avatar, tên',
        detail:
          'Vào Cài đặt → Tài khoản hoặc bấm vào avatar hoặc tên để chỉnh sửa. Bạn có thể tải ảnh đại diện mới thay vì chỉ chọn màu chữ cái.',
      },
    ],
  },
];
