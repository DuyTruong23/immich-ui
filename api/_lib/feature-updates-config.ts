import release from '../../custom/src/data/feature-updates.json';

export type FeatureUpdateItem = {
  title: string;
  detail?: string;
};

export type FeatureUpdatesConfig = {
  version: string;
  items: FeatureUpdateItem[];
};

export const DEFAULT_FEATURE_UPDATES: FeatureUpdatesConfig = {
  version: release.version,
  items: release.items,
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

type RankedConfig = {
  config: FeatureUpdatesConfig;
  rank: number;
};

/** Git defaults < env < blob khi cùng version; bản version cao hơn luôn thắng. */
export const resolveFeatureUpdatesConfig = (
  defaults: FeatureUpdatesConfig,
  blob: FeatureUpdatesConfig | null,
  env: FeatureUpdatesConfig | null,
): FeatureUpdatesConfig => {
  const candidates: RankedConfig[] = [
    { config: defaults, rank: 0 },
    ...(env ? [{ config: env, rank: 1 }] : []),
    ...(blob ? [{ config: blob, rank: 2 }] : []),
  ];

  return candidates.reduce((best, current) => {
    const compared = compareFeatureUpdateVersion(current.config.version, best.config.version);
    if (compared > 0 || (compared === 0 && current.rank > best.rank)) {
      return current;
    }

    return best;
  }).config;
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
