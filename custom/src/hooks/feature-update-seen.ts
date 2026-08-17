const SEEN_VERSION_KEY = 'pg_feature_update_seen_version';

type SeenListener = () => void;

const seenListeners = new Set<SeenListener>();

const notifyFeatureUpdateSeen = () => {
  for (const listener of seenListeners) {
    listener();
  }
};

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
  notifyFeatureUpdateSeen();
};

export const hasSeenFeatureUpdateVersion = (version: string): boolean =>
  getSeenFeatureUpdateVersion() === version.trim();

/** Pin / UI khác subscribe để ẩn ngay khi user xem hoặc đóng modal. */
export const subscribeFeatureUpdateSeen = (listener: SeenListener): (() => void) => {
  seenListeners.add(listener);
  return () => {
    seenListeners.delete(listener);
  };
};
