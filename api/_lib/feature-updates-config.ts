export type FeatureUpdateItem = {
  title: string;
  detail?: string;
};

export type FeatureUpdatesConfig = {
  version: string;
  items: FeatureUpdateItem[];
};

export const DEFAULT_FEATURE_UPDATES: FeatureUpdatesConfig = {
  version: 'v1.0.3',
  items: [
    {
      title: 'Cải thiện tốc độ xem video trên thiết bị di động',
      detail:
        'Video trên điện thoại tải nhanh hơn, khả năng chờ khi loading.',
    },
    {
      title: 'Cho phép đổi avatar, tên',
      detail:
        'Vào Cài đặt → Tài khoản hoặc bấm vào avatar hoặc tên để chỉnh sửa. Bạn có thể tải ảnh đại diện mới thay vì chỉ chọn màu chữ cái.',
    },
    {
      title: 'Giao diện admin dễ đọc hơn trên mobile — bảng, thư viện ngoài, chọn ảnh',
      detail:
        'Trang quản trị hiển thị bảng và thư viện ngoài dễ cuộn hơn trên màn hình nhỏ. Mở /admin trên điện thoại để kiểm tra bố cục mới.',
    },
  ],
};

const normalizeFeatureUpdateItem = (value: unknown): FeatureUpdateItem | null => {
  if (typeof value === 'string') {
    const title = value.trim();
    return title ? { title } : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const detail = typeof record.detail === 'string' ? record.detail.trim() : '';

  if (!title) {
    return null;
  }

  return detail ? { title, detail } : { title };
};

export const normalizeFeatureUpdatesConfig = (value: unknown): FeatureUpdatesConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const version = typeof record.version === 'string' ? record.version.trim() : '';
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems
    .map((item) => normalizeFeatureUpdateItem(item))
    .filter((item): item is FeatureUpdateItem => item !== null);

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
