const SEEN_VERSION_KEY = 'pg_feature_update_seen_version';
const HIDE_ON_LOGIN_KEY = 'pg_feature_update_hide_on_login';
const FALLBACK_USER_KEY = '_default';

type SeenListener = () => void;
type HideMap = Record<string, boolean>;

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

const hideUserKey = (userId?: string): string => userId?.trim() || FALLBACK_USER_KEY;

const readHideMap = (): HideMap => {
  if (typeof localStorage === 'undefined') {
    return {};
  }

  const raw = localStorage.getItem(HIDE_ON_LOGIN_KEY)?.trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const result: HideMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === true) {
        result[key] = true;
      }
    }

    return result;
  } catch {
    return {};
  }
};

/** User đã bật "Không hiện modal cho lần đăng nhập sau". Mặc định luôn hiện. */
export const shouldHideFeatureUpdateModal = (userId?: string): boolean =>
  readHideMap()[hideUserKey(userId)] === true;

export const setHideFeatureUpdateModal = (hide: boolean, userId?: string): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const map = readHideMap();
  const key = hideUserKey(userId);
  if (hide) {
    map[key] = true;
  } else {
    delete map[key];
  }

  localStorage.setItem(HIDE_ON_LOGIN_KEY, JSON.stringify(map));
};
