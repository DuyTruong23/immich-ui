const SESSION_KEY = 'pg_session_active';
const ADMIN_PERSISTENT_SESSION_KEY = 'pg_admin_persistent_session';
const PRESERVE_SESSION_ONCE_KEY = 'pg_preserve_session_once';

declare global {
  // eslint-disable-next-line no-var
  var __pgSessionBootstrapped: boolean | undefined;
}

const consumePreserveSessionOnce = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const keep = sessionStorage.getItem(PRESERVE_SESSION_ONCE_KEY) === '1';
  sessionStorage.removeItem(PRESERVE_SESSION_ONCE_KEY);
  return keep;
};

/** Reload do app (chunk cũ, bảo trì) — giữ phiên user, khác F5 thủ công. */
export const markPreserveSessionOnce = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(PRESERVE_SESSION_ONCE_KEY, '1');
};

export const reloadPreservingSession = (): void => {
  markPreserveSessionOnce();
  location.reload();
};

/** Mỗi lần load/reload trang (F5) — reset session tab, trừ khi app chủ động preserve. */
export const beginBrowserSession = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (globalThis.__pgSessionBootstrapped) {
    return;
  }

  globalThis.__pgSessionBootstrapped = true;
  if (consumePreserveSessionOnce()) {
    return;
  }

  sessionStorage.removeItem(SESSION_KEY);
};

/** Gọi sau login thành công — cho phép restore session trong tab hiện tại */
export const markSessionActive = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(SESSION_KEY, '1');
};

export const isActiveBrowserSession = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return sessionStorage.getItem(SESSION_KEY) === '1';
};

export const clearSessionActive = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(SESSION_KEY);
};

/** Admin — giữ phiên qua đóng tab / F5 khi bật PUBLIC_SESSION_ONLY_AUTH (localStorage, không phải sessionStorage) */
export const markAdminPersistentSession = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ADMIN_PERSISTENT_SESSION_KEY, '1');
  markSessionActive();
};

export const isAdminPersistentSession = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (localStorage.getItem(ADMIN_PERSISTENT_SESSION_KEY) === '1') {
    return true;
  }

  if (sessionStorage.getItem(ADMIN_PERSISTENT_SESSION_KEY) === '1') {
    localStorage.setItem(ADMIN_PERSISTENT_SESSION_KEY, '1');
    sessionStorage.removeItem(ADMIN_PERSISTENT_SESSION_KEY);
    return true;
  }

  return false;
};

export const clearAdminPersistentSession = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ADMIN_PERSISTENT_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_PERSISTENT_SESSION_KEY);
};
