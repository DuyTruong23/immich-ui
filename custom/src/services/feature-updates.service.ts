import {
  DEFAULT_FEATURE_UPDATE_ITEMS,
  DEFAULT_FEATURE_UPDATE_RELEASES,
  DEFAULT_FEATURE_UPDATE_VERSION,
  type FeatureUpdatesConfig,
} from '$custom/constants/feature-updates';
import { getStoredAccessToken } from '$custom/hooks/access-token';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
import { FEATURE_UPDATES_MOCK, FEATURE_UPDATES_MOCK_RELEASES } from '$custom/mocks/feature-updates';
import { withFeatureUpdateReleases } from '$custom/utils/feature-update-items';

export const getDefaultFeatureUpdatesConfig = (): FeatureUpdatesConfig =>
  withFeatureUpdateReleases({
    version: DEFAULT_FEATURE_UPDATE_VERSION,
    items: isUiDevMode() ? [...FEATURE_UPDATES_MOCK] : [...DEFAULT_FEATURE_UPDATE_ITEMS],
    releases: isUiDevMode() ? FEATURE_UPDATES_MOCK_RELEASES : DEFAULT_FEATURE_UPDATE_RELEASES,
  });

/** Modal đọc trực tiếp custom/src/data/feature-updates.json (không qua Blob/API). */
export const peekFeatureUpdatesConfig = (): FeatureUpdatesConfig => getDefaultFeatureUpdatesConfig();

export const fetchFeatureUpdatesConfig = async (_options?: { force?: boolean }): Promise<FeatureUpdatesConfig> =>
  getDefaultFeatureUpdatesConfig();

export const invalidateFeatureUpdatesCache = (): void => {
  /* nội dung lấy từ file JSON lúc build — không cache network */
};

export type FeatureUpdateNotifyResult = {
  ok?: boolean;
  sent?: number;
  skipped?: boolean;
  reason?: string;
  version?: string;
  error?: string;
  detail?: string;
};

/** Admin gửi changelog hiện tại tới email đã đăng ký */
export const sendFeatureUpdateNotify = async (options: {
  version: string;
  items: FeatureUpdatesConfig['items'];
  accessToken?: string;
}): Promise<FeatureUpdateNotifyResult> => {
  const token = options.accessToken?.trim() || getStoredAccessToken();
  const response = await fetch('/api/feature-update-notify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: options.version,
      items: options.items,
      force: true,
      ...(token ? { accessToken: token } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as FeatureUpdateNotifyResult;
  if (!response.ok) {
    throw new Error(payload.detail ?? payload.error ?? `Notify failed (${response.status})`);
  }

  return payload;
};
