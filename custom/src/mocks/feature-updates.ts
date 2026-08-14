import type { FeatureUpdateItem } from '$custom/utils/feature-update-items';

/** Mock data dùng khi preview modal ở UI dev mode (pnpm dev:local) */
export const FEATURE_UPDATES_MOCK: FeatureUpdateItem[] = [
  {
    title: 'Cải thiện tốc độ xem video trên thiết bị di động',
    detail: 'Mock — video preload nhanh hơn trên mobile.',
  },
  {
    title: 'Cho phép đổi avatar, tên',
    detail: 'Mock — vào Cài đặt → Tài khoản để đổi avatar.',
  },
  {
    title: 'Form đăng nhập hỗ trợ chặn autofill mật khẩu tốt hơn khi dùng OAuth',
    detail: 'Mock — OAuth không còn kích autofill mật khẩu.',
  },
  {
    title: 'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh',
    detail: 'Mock — thử /admin trên điện thoại.',
  },
];
