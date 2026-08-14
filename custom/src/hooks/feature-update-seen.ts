const SEEN_VERSION_KEY = 'pg_feature_update_seen_version';

/** Phiên bản modal "Tính năng được cập nhật" user đã xem / đóng / góp ý. */
export const getSeenFeatureUpdateVersion = (): string | undefined => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  return localStorage.getItem(SEEN_VERSION_KEY)?.trim() || undefined;
};

export const markFeatureUpdateSeen = (version: string): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const trimmed = version.trim();
  if (!trimmed) {
    return;
  }

  localStorage.setItem(SEEN_VERSION_KEY, trimmed);
};

export const hasSeenFeatureUpdateVersion = (version: string): boolean =>
  getSeenFeatureUpdateVersion() === version.trim();
