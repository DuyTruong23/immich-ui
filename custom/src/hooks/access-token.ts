const ACCESS_TOKEN_KEY = 'pg_access_token';

/** Lưu access token sau login — dùng cho API admin (feature-updates, feedback, …) */
export const storeAccessToken = (token?: string): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, trimmed);
};

export const getStoredAccessToken = (): string | undefined => {
  if (typeof sessionStorage === 'undefined') {
    return undefined;
  }

  return sessionStorage.getItem(ACCESS_TOKEN_KEY)?.trim() || undefined;
};

export const clearStoredAccessToken = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
};
