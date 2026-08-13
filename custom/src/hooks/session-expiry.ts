const SESSION_EXPIRY_KEY = 'pg_session_expires_at';

/** Thời gian phiên làm việc — 30 phút kể từ lúc login */
export const SESSION_DURATION_MS = 30 * 60 * 1000;

/** Ghi thời điểm hết hạn sau login thành công */
export const markSessionExpiry = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
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
  if (typeof window === 'undefined') {
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
