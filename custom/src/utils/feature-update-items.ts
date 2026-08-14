export type FeatureUpdateItem = {
  title: string;
  detail?: string;
};

export type FeatureUpdateRelease = {
  version: string;
  items: FeatureUpdateItem[];
};

export type FeatureUpdatesConfig = {
  version: string;
  items: FeatureUpdateItem[];
  releases?: FeatureUpdateRelease[];
};

const parseVersionParts = (version: string): readonly [number, number, number] => {
  const [major = 0, minor = 0, patch = 0] = version
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  return [major, minor, patch];
};

export const compareFeatureUpdateVersion = (a: string, b: string): number => {
  const left = parseVersionParts(a);
  const right = parseVersionParts(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
};

export const sortReleasesNewestFirst = (releases: FeatureUpdateRelease[]): FeatureUpdateRelease[] =>
  [...releases].sort((left, right) => compareFeatureUpdateVersion(right.version, left.version));

export const upsertFeatureUpdateRelease = (
  releases: readonly FeatureUpdateRelease[],
  version: string,
  items: FeatureUpdateItem[],
): FeatureUpdateRelease[] => {
  const nextVersion = version.trim();
  const without = releases.filter((release) => release.version !== nextVersion);
  return sortReleasesNewestFirst([{ version: nextVersion, items }, ...without]);
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

/** Chuẩn hóa mảng items từ API/cache — chấp nhận string hoặc object lẫn lộn */
export const coerceFeatureUpdateItems = (items: readonly unknown[]): FeatureUpdateItem[] =>
  items
    .map((item) => normalizeFeatureUpdateItem(item))
    .filter((item): item is FeatureUpdateItem => item !== null);

const normalizeFeatureUpdateRelease = (value: unknown): FeatureUpdateRelease | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const version = typeof record.version === 'string' ? record.version.trim() : '';
  const items = coerceFeatureUpdateItems(Array.isArray(record.items) ? record.items : []);
  if (!version || items.length === 0) {
    return null;
  }

  return { version, items };
};

export const normalizeFeatureUpdatesConfig = (value: unknown): FeatureUpdatesConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const version = typeof record.version === 'string' ? record.version.trim() : '';
  const items = coerceFeatureUpdateItems(Array.isArray(record.items) ? record.items : []);
  const releases = Array.isArray(record.releases)
    ? record.releases
        .map((release) => normalizeFeatureUpdateRelease(release))
        .filter((release): release is FeatureUpdateRelease => release !== null)
    : [];

  const merged = version && items.length > 0 ? upsertFeatureUpdateRelease(releases, version, items) : sortReleasesNewestFirst(releases);

  if (merged.length === 0) {
    return null;
  }

  return {
    version: merged[0].version,
    items: merged[0].items,
    releases: merged,
  };
};

export const releasesFromConfig = (config: FeatureUpdatesConfig): FeatureUpdateRelease[] => {
  if (config.releases && config.releases.length > 0) {
    return sortReleasesNewestFirst(config.releases);
  }

  return [{ version: config.version, items: coerceFeatureUpdateItems(config.items) }];
};

export const withFeatureUpdateReleases = (
  config: FeatureUpdatesConfig,
): FeatureUpdatesConfig & { releases: FeatureUpdateRelease[] } => {
  const releases = releasesFromConfig(config);
  return {
    version: releases[0]?.version ?? config.version,
    items: releases[0]?.items ?? coerceFeatureUpdateItems(config.items),
    releases,
  };
};

export const itemHasDetail = (item: FeatureUpdateItem): boolean => Boolean(item.detail?.trim());

export const getFeatureUpdateItemTitle = (item: FeatureUpdateItem | unknown): string => {
  const normalized = normalizeFeatureUpdateItem(item);
  return normalized?.title ?? '';
};

export const getFeatureUpdateItemDetail = (item: FeatureUpdateItem | unknown): string | undefined => {
  const normalized = normalizeFeatureUpdateItem(item);
  return normalized?.detail;
};
