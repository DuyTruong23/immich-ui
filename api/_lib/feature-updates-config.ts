import release from '../../custom/src/data/feature-updates.json';

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
  releases: FeatureUpdateRelease[];
};

/** So sánh semver modal (v1.0.3). Dương = a mới hơn b. */
export const compareFeatureUpdateVersion = (a: string, b: string): number => {
  const parse = (version: string): readonly [number, number, number] => {
    const [major = 0, minor = 0, patch = 0] = version
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
    return [major, minor, patch];
  };

  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
};

const sortReleasesNewestFirst = (releases: FeatureUpdateRelease[]): FeatureUpdateRelease[] =>
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

const coerceItems = (items: unknown[]): FeatureUpdateItem[] =>
  items
    .map((item) => normalizeFeatureUpdateItem(item))
    .filter((item): item is FeatureUpdateItem => item !== null);

const normalizeFeatureUpdateRelease = (value: unknown): FeatureUpdateRelease | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const version = typeof record.version === 'string' ? record.version.trim() : '';
  const items = coerceItems(Array.isArray(record.items) ? record.items : []);
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
  const items = coerceItems(Array.isArray(record.items) ? record.items : []);
  const releases = Array.isArray(record.releases)
    ? record.releases
        .map((item) => normalizeFeatureUpdateRelease(item))
        .filter((item): item is FeatureUpdateRelease => item !== null)
    : [];

  const merged =
    version && items.length > 0 ? upsertFeatureUpdateRelease(releases, version, items) : sortReleasesNewestFirst(releases);

  if (merged.length === 0) {
    return null;
  }

  return {
    version: merged[0].version,
    items: merged[0].items,
    releases: merged,
  };
};

export const DEFAULT_FEATURE_UPDATES: FeatureUpdatesConfig = normalizeFeatureUpdatesConfig(release) ?? {
  version: release.version,
  items: release.items,
  releases: [{ version: release.version, items: release.items }],
};

const toReleases = (config: FeatureUpdatesConfig): FeatureUpdateRelease[] =>
  config.releases?.length > 0 ? config.releases : [{ version: config.version, items: config.items }];

/** Git defaults < env < blob khi cùng version; gộp lịch sử mọi bản. */
export const resolveFeatureUpdatesConfig = (
  defaults: FeatureUpdatesConfig,
  blob: FeatureUpdatesConfig | null,
  env: FeatureUpdatesConfig | null,
): FeatureUpdatesConfig => {
  const ranked = [
    { config: defaults, rank: 0 },
    ...(env ? [{ config: env, rank: 1 }] : []),
    ...(blob ? [{ config: blob, rank: 2 }] : []),
  ];

  const byVersion = new Map<string, { release: FeatureUpdateRelease; rank: number }>();
  for (const { config, rank } of ranked) {
    for (const item of toReleases(config)) {
      const existing = byVersion.get(item.version);
      if (!existing || rank > existing.rank) {
        byVersion.set(item.version, { release: item, rank });
      }
    }
  }

  const releases = sortReleasesNewestFirst([...byVersion.values()].map(({ release }) => release));
  return {
    version: releases[0].version,
    items: releases[0].items,
    releases,
  };
};

export const parseFeatureUpdatesConfig = (raw: string): FeatureUpdatesConfig | null => {
  try {
    return normalizeFeatureUpdatesConfig(JSON.parse(raw));
  } catch {
    return null;
  }
};
