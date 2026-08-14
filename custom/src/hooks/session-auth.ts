const SESSION_KEY = 'pg_session_active';
const ADMIN_PERSISTENT_SESSION_KEY = 'pg_admin_persistent_session';

declare global {
  // eslint-disable-next-line no-var
  var __pgSessionBootstrapped: boolean | undefined;
}

/** Mỗi lần load/reload trang (F5) — reset session tab */
export const beginBrowserSession = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (globalThis.__pgSessionBootstrapped) {
    return;
  }

  globalThis.__pgSessionBootstrapped = true;
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
