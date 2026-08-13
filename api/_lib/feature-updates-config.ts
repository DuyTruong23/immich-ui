export type FeatureUpdatesConfig = {
  version: string;
  items: string[];
};

export const DEFAULT_FEATURE_UPDATES: FeatureUpdatesConfig = {
  version: 'v1.0.3',
  items: [
    'Modal thông báo tính năng mới sau đăng nhập — gửi góp ý trực tiếp cho admin',
    'Trang bảo trì thân thiện khi hệ thống không khả dụng (404, lỗi server)',
    'Giao diện lỗi và trang bảo trì được căn giữa trên mọi thiết bị',
    'Form đăng nhập hỗ trợ autofill mật khẩu tốt hơn khi dùng OAuth',
    'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh',
    'Video tải nhanh hơn trên mobile — ưu tiên file đã transcode sẵn',
  ],
};

export const normalizeFeatureUpdatesConfig = (value: unknown): FeatureUpdatesConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const version = typeof record.version === 'string' ? record.version.trim() : '';
  const items = Array.isArray(record.items)
    ? record.items.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!version || items.length === 0) {
    return null;
  }

  return { version, items };
};

export const parseFeatureUpdatesConfig = (raw: string): FeatureUpdatesConfig | null => {
  try {
    return normalizeFeatureUpdatesConfig(JSON.parse(raw));
  } catch {
    return null;
  }
};
