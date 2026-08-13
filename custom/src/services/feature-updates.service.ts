import {
  DEFAULT_FEATURE_UPDATE_ITEMS,
  DEFAULT_FEATURE_UPDATE_VERSION,
  type FeatureUpdatesConfig,
} from '$custom/constants/feature-updates';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK } from '$custom/mocks/feature-updates';

const DEFAULT_CONFIG: FeatureUpdatesConfig = {
  version: DEFAULT_FEATURE_UPDATE_VERSION,
  items: [...DEFAULT_FEATURE_UPDATE_ITEMS],
};

let cachedConfig: FeatureUpdatesConfig | null = null;

export const invalidateFeatureUpdatesCache = (): void => {
  cachedConfig = null;
};

export const getDefaultFeatureUpdatesConfig = (): FeatureUpdatesConfig => ({
  version: DEFAULT_FEATURE_UPDATE_VERSION,
  items: isUiDevMode() ? [...FEATURE_UPDATES_MOCK] : [...DEFAULT_FEATURE_UPDATE_ITEMS],
});

export const fetchFeatureUpdatesConfig = async (options?: { force?: boolean }): Promise<FeatureUpdatesConfig> => {
  if (!options?.force && cachedConfig) {
    return cachedConfig;
  }

  if (isUiDevMode()) {
    cachedConfig = getDefaultFeatureUpdatesConfig();
    return cachedConfig;
  }

  try {
    const response = await fetch('/api/feature-updates', { cache: 'no-store' });
    if (response.ok) {
      const data = (await response.json()) as FeatureUpdatesConfig;
      if (data.version && Array.isArray(data.items) && data.items.length > 0) {
        cachedConfig = {
          version: data.version,
          items: data.items.map((item) => String(item).trim()).filter(Boolean),
        };
        return cachedConfig;
      }
    }
  } catch (error) {
    console.warn('[feature-updates] Failed to load config', error);
  }

  cachedConfig = DEFAULT_CONFIG;
  return cachedConfig;
};

export const saveFeatureUpdatesConfig = async (
  config: FeatureUpdatesConfig,
  accessToken: string,
): Promise<FeatureUpdatesConfig> => {
  const response = await fetch('/api/feature-updates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken,
      version: config.version.trim(),
      items: config.items.map((item) => item.trim()).filter(Boolean),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as FeatureUpdatesConfig & {
    error?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(payload.detail ?? payload.error ?? 'Failed to save feature updates');
  }

  cachedConfig = {
    version: payload.version,
    items: payload.items,
  };

  return cachedConfig;
};
