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

/** Config đã cache, hoặc mặc định — không chờ network (dùng khi mở modal). */
export const peekFeatureUpdatesConfig = (): FeatureUpdatesConfig =>
  cachedConfig ?? getDefaultFeatureUpdatesConfig();

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
        items: config.items.map((item) => item.trim()).filter(Boolean),
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

  cachedConfig = {
    version: payload.version,
    items: payload.items,
  };

  return cachedConfig;
};
