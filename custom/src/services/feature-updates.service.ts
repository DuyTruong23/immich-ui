import {
  DEFAULT_FEATURE_UPDATE_ITEMS,
  DEFAULT_FEATURE_UPDATE_RELEASES,
  DEFAULT_FEATURE_UPDATE_VERSION,
  type FeatureUpdatesConfig,
} from '$custom/constants/feature-updates';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK, FEATURE_UPDATES_MOCK_RELEASES } from '$custom/mocks/feature-updates';
import {
  coerceFeatureUpdateItems,
  normalizeFeatureUpdatesConfig,
  withFeatureUpdateReleases,
} from '$custom/utils/feature-update-items';

const DEFAULT_CONFIG: FeatureUpdatesConfig = withFeatureUpdateReleases({
  version: DEFAULT_FEATURE_UPDATE_VERSION,
  items: [...DEFAULT_FEATURE_UPDATE_ITEMS],
  releases: DEFAULT_FEATURE_UPDATE_RELEASES,
});

let cachedConfig: FeatureUpdatesConfig | null = null;

export const invalidateFeatureUpdatesCache = (): void => {
  cachedConfig = null;
};

export const getDefaultFeatureUpdatesConfig = (): FeatureUpdatesConfig =>
  withFeatureUpdateReleases({
    version: DEFAULT_FEATURE_UPDATE_VERSION,
    items: isUiDevMode() ? [...FEATURE_UPDATES_MOCK] : [...DEFAULT_FEATURE_UPDATE_ITEMS],
    releases: isUiDevMode() ? FEATURE_UPDATES_MOCK_RELEASES : DEFAULT_FEATURE_UPDATE_RELEASES,
  });

/** Config đã cache, hoặc mặc định — không chờ network (dùng khi mở modal). */
export const peekFeatureUpdatesConfig = (): FeatureUpdatesConfig =>
  withFeatureUpdateReleases(cachedConfig ?? getDefaultFeatureUpdatesConfig());

const FETCH_TIMEOUT_MS = 2500;
const SAVE_TIMEOUT_MS = 15000;

const mapSaveError = (payload: { error?: string; detail?: string }, status: number): string => {
  if (status === 401) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất và đăng nhập lại.';
  }
  if (status === 503 && payload.detail?.includes('BLOB_READ_WRITE_TOKEN')) {
    return 'Chưa cấu hình BLOB_READ_WRITE_TOKEN trên Vercel — không thể lưu cho mọi người dùng.';
  }
  return payload.detail ?? payload.error ?? 'Không thể lưu cấu hình tính năng mới';
};

export const fetchFeatureUpdatesConfig = async (options?: { force?: boolean }): Promise<FeatureUpdatesConfig> => {
  if (!options?.force && cachedConfig) {
    return cachedConfig;
  }

  if (isUiDevMode() && !options?.force) {
    cachedConfig = getDefaultFeatureUpdatesConfig();
    return cachedConfig;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('/api/feature-updates', { cache: 'no-store', signal: controller.signal });
    if (response.ok) {
      const data = (await response.json()) as FeatureUpdatesConfig;
      const normalized = normalizeFeatureUpdatesConfig(data);
      if (normalized) {
        cachedConfig = normalized;
        return cachedConfig;
      }
    }
  } catch (error) {
    console.warn('[feature-updates] Failed to load config', error);
  } finally {
    clearTimeout(timer);
  }

  return cachedConfig ?? DEFAULT_CONFIG;
};

export const saveFeatureUpdatesConfig = async (
  config: FeatureUpdatesConfig,
  accessToken?: string,
): Promise<FeatureUpdatesConfig> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('/api/feature-updates', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        accessToken,
        version: config.version.trim(),
        items: config.items
          .map((item) => ({
            title: item.title.trim(),
            ...(item.detail?.trim() ? { detail: item.detail.trim() } : {}),
          }))
          .filter((item) => item.title.length > 0),
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Máy chủ không phản hồi khi lưu. Kiểm tra deploy Vercel hoặc thử lại sau.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => ({}))) as FeatureUpdatesConfig & {
    error?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(mapSaveError(payload, response.status));
  }

  cachedConfig =
    normalizeFeatureUpdatesConfig(payload) ??
    withFeatureUpdateReleases({
      version: payload.version,
      items: coerceFeatureUpdateItems(Array.isArray(payload.items) ? payload.items : []),
      releases: payload.releases,
    });

  return cachedConfig;
};
