export type FeatureUpdatesConfig = {
  version: string;
  items: string[];
};

export const DEFAULT_FEATURE_UPDATES: FeatureUpdatesConfig = {
  version: 'v1.0.3',
  items: [
   'Cải thiện tốc độ xem video trên thiết bị di động',
  'Form đăng nhập hỗ trợ chặn autofill mật khẩu tốt hơn khi dùng OAuth',
  'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh'
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
