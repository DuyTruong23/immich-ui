export type FeatureUpdateItem = {
  title: string;
  detail?: string;
};

export type FeatureUpdatesConfig = {
  version: string;
  items: FeatureUpdateItem[];
};

export const normalizeFeatureUpdateItem = (value: unknown): FeatureUpdateItem | null => {
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

export const itemHasDetail = (item: FeatureUpdateItem): boolean => Boolean(item.detail?.trim());

/** Chuẩn hóa mảng items từ API/cache — chấp nhận string hoặc object lẫn lộn */
export const coerceFeatureUpdateItems = (items: readonly unknown[]): FeatureUpdateItem[] =>
  items
    .map((item) => normalizeFeatureUpdateItem(item))
    .filter((item): item is FeatureUpdateItem => item !== null);

export const getFeatureUpdateItemTitle = (item: FeatureUpdateItem | unknown): string => {
  const normalized = normalizeFeatureUpdateItem(item);
  return normalized?.title ?? '';
};

export const getFeatureUpdateItemDetail = (item: FeatureUpdateItem | unknown): string | undefined => {
  const normalized = normalizeFeatureUpdateItem(item);
  return normalized?.detail;
};
