import { markAdminPersistentSession } from '$custom/hooks/session-auth';

const SESSION_EXPIRY_KEY = 'pg_session_expires_at';
const SESSION_NO_EXPIRY_KEY = 'pg_session_no_expiry';

/** Thời gian phiên làm việc — 30 phút kể từ lúc login */
export const SESSION_DURATION_MS = 30 * 60 * 1000;

/** Ghi thời điểm hết hạn sau login thành công */
export const markSessionExpiry = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  clearSessionNoExpiry();
  sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
};

/** Admin — không giới hạn thời gian phiên và giữ session qua reload tab */
export const enableAdminSessionPersistence = (): void => {
  markSessionNoExpiry();
  markAdminPersistentSession();
};

export const markSessionNoExpiry = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(SESSION_NO_EXPIRY_KEY, '1');
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
};

export const clearSessionNoExpiry = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(SESSION_NO_EXPIRY_KEY);
};

export const isSessionNoExpiry = (): boolean => {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  return sessionStorage.getItem(SESSION_NO_EXPIRY_KEY) === '1';
};

export const clearSessionExpiry = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
};

/** Chưa có timestamp hoặc chưa hết hạn → false */
export const isSessionExpired = (): boolean => {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  if (isSessionNoExpiry()) {
    return false;
  }

  const raw = sessionStorage.getItem(SESSION_EXPIRY_KEY);
  if (!raw) {
    return false;
  }

  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return Date.now() >= expiresAt;
};

/** Tự logout khi hết hạn — trả về hàm dọn dẹp timer/listener */
export const watchSessionExpiry = (onExpired: () => void): (() => void) => {
  if (typeof window === 'undefined' || isSessionNoExpiry()) {
    return () => {};
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const triggerIfExpired = (): boolean => {
    if (isSessionExpired()) {
      onExpired();
      return true;
    }

    return false;
  };

  if (triggerIfExpired()) {
    return () => {};
  }

  const raw = sessionStorage.getItem(SESSION_EXPIRY_KEY);
  if (!raw) {
    return () => {};
  }

  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) {
    return () => {};
  }

  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    onExpired();
    return () => {};
  }

  timeoutId = setTimeout(onExpired, remaining);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      triggerIfExpired();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
};
