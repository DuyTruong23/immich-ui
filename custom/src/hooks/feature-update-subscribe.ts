import { getStoredAccessToken } from '$custom/hooks/access-token';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORED_EMAIL_KEY = 'pg_feature_update_notify_email';
const FALLBACK_ACCOUNT_KEY = '_default';

type StoredNotifyEmail = {
  accountEmail: string;
  notifyEmail: string;
  confirmed: boolean;
};

type StoredNotifyEmailStore = {
  accounts: Record<string, StoredNotifyEmail>;
};

export type NotifyEmailIdentity = {
  accountEmail?: string;
  userId?: string;
};

export const isValidNotifyEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

const normalizeAccountEmail = (value?: string): string => value?.trim().toLowerCase() || FALLBACK_ACCOUNT_KEY;

const parseStoredEntry = (value: unknown, accountEmail = ''): StoredNotifyEmail | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as { email?: unknown; notifyEmail?: unknown; accountEmail?: unknown; confirmed?: unknown };
  const notifyEmail =
    typeof record.notifyEmail === 'string'
      ? record.notifyEmail.trim()
      : typeof record.email === 'string'
        ? record.email.trim()
        : '';
  if (!isValidNotifyEmail(notifyEmail)) {
    return null;
  }

  const storedAccount =
    typeof record.accountEmail === 'string' ? record.accountEmail.trim().toLowerCase() : accountEmail;

  return {
    accountEmail: storedAccount,
    notifyEmail,
    confirmed: record.confirmed === true,
  };
};

const readStoredStore = (): StoredNotifyEmailStore => {
  if (typeof localStorage === 'undefined') {
    return { accounts: {} };
  }

  const raw = localStorage.getItem(STORED_EMAIL_KEY)?.trim();
  if (!raw) {
    return { accounts: {} };
  }

  try {
    const parsed = JSON.parse(raw) as {
      accounts?: unknown;
      users?: unknown;
      email?: unknown;
      notifyEmail?: unknown;
      confirmed?: unknown;
    };

    if (parsed.accounts && typeof parsed.accounts === 'object' && !Array.isArray(parsed.accounts)) {
      const accounts: Record<string, StoredNotifyEmail> = {};
      for (const [key, value] of Object.entries(parsed.accounts as Record<string, unknown>)) {
        const entry = parseStoredEntry(value, key);
        if (key.trim() && entry) {
          accounts[key.trim().toLowerCase()] = entry;
        }
      }
      return { accounts };
    }

    if (parsed.users && typeof parsed.users === 'object' && !Array.isArray(parsed.users)) {
      const accounts: Record<string, StoredNotifyEmail> = {};
      for (const [key, value] of Object.entries(parsed.users as Record<string, unknown>)) {
        const entry = parseStoredEntry(value);
        if (entry) {
          accounts[key.trim() || FALLBACK_ACCOUNT_KEY] = entry;
        }
      }
      return { accounts };
    }

    const legacy = parseStoredEntry(parsed);
    if (legacy) {
      return { accounts: { [FALLBACK_ACCOUNT_KEY]: legacy } };
    }
  } catch {
    if (isValidNotifyEmail(raw)) {
      return {
        accounts: {
          [FALLBACK_ACCOUNT_KEY]: { accountEmail: '', notifyEmail: raw.trim(), confirmed: false },
        },
      };
    }
  }

  return { accounts: {} };
};

const writeStoredStore = (store: StoredNotifyEmailStore): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORED_EMAIL_KEY, JSON.stringify(store));
};

const readStoredNotifyEmail = (identity?: NotifyEmailIdentity): StoredNotifyEmail | null => {
  const store = readStoredStore();
  const accountKey = normalizeAccountEmail(identity?.accountEmail);
  if (accountKey !== FALLBACK_ACCOUNT_KEY && store.accounts[accountKey]) {
    return store.accounts[accountKey];
  }

  if (accountKey !== FALLBACK_ACCOUNT_KEY && store.accounts[FALLBACK_ACCOUNT_KEY] && Object.keys(store.accounts).length === 1) {
    return store.accounts[FALLBACK_ACCOUNT_KEY];
  }

  if (accountKey === FALLBACK_ACCOUNT_KEY) {
    return store.accounts[FALLBACK_ACCOUNT_KEY] ?? null;
  }

  return null;
};

export const getStoredNotifyEmail = (identity?: NotifyEmailIdentity): string =>
  readStoredNotifyEmail(identity)?.notifyEmail ?? '';

/** Chỉ điền khi user đã lưu email nhận thông báo — không lấy email tài khoản. */
export const getDefaultNotifyEmail = (identity?: NotifyEmailIdentity): string => getStoredNotifyEmail(identity);

export const hasStoredNotifyEmail = (identity?: NotifyEmailIdentity): boolean =>
  isValidNotifyEmail(getStoredNotifyEmail(identity));

export const hasConfirmedNotifyEmail = (identity?: NotifyEmailIdentity): boolean =>
  readStoredNotifyEmail(identity)?.confirmed === true;

const persistNotifyEmail = (email: string, confirmed: boolean, identity?: NotifyEmailIdentity): void => {
  const store = readStoredStore();
  const accountKey = normalizeAccountEmail(identity?.accountEmail);
  const nextAccounts = {
    ...store.accounts,
    [accountKey]: {
      accountEmail: identity?.accountEmail?.trim().toLowerCase() ?? '',
      notifyEmail: email.trim(),
      confirmed,
    },
  };
  if (accountKey !== FALLBACK_ACCOUNT_KEY) {
    delete nextAccounts[FALLBACK_ACCOUNT_KEY];
  }

  writeStoredStore({ accounts: nextAccounts });
};

export const clearStoredNotifyEmail = (identity?: NotifyEmailIdentity): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const accountKey = normalizeAccountEmail(identity?.accountEmail);
  const store = readStoredStore();
  if (!store.accounts[accountKey] && !store.accounts[FALLBACK_ACCOUNT_KEY]) {
    return;
  }

  const nextAccounts = { ...store.accounts };
  delete nextAccounts[accountKey];
  if (accountKey !== FALLBACK_ACCOUNT_KEY) {
    delete nextAccounts[FALLBACK_ACCOUNT_KEY];
  }

  if (Object.keys(nextAccounts).length === 0) {
    localStorage.removeItem(STORED_EMAIL_KEY);
    return;
  }

  writeStoredStore({ accounts: nextAccounts });
};

/** Lấy email nhận thông báo đã lưu khi account email trùng. */
export const fetchMyNotifyEmail = async (
  accessToken?: string,
  identity?: NotifyEmailIdentity,
): Promise<string> => {
  if (isUiDevMode()) {
    return hasConfirmedNotifyEmail(identity) ? getStoredNotifyEmail(identity) : '';
  }

  const token = accessToken?.trim() || getStoredAccessToken();
  const response = await fetch('/api/feature-update-email?mine=1', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
    throw new Error(payload.detail ?? payload.error ?? `Load notify email failed (${response.status})`);
  }

  const payload = (await response.json().catch(() => ({}))) as { email?: string | null };
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (isValidNotifyEmail(email)) {
    persistNotifyEmail(email, true, identity);
    return email;
  }

  return '';
};

/** Đăng ký email nhận changelog — chỉ đánh dấu đã lưu khi server xác nhận */
export const subscribeFeatureUpdateEmail = async (
  email: string,
  accessToken?: string,
  version?: string,
  previousEmail?: string,
  identity?: NotifyEmailIdentity,
): Promise<void> => {
  const trimmed = email.trim();
  if (!isValidNotifyEmail(trimmed)) {
    throw new Error('Valid email is required');
  }

  const previous = previousEmail?.trim() ?? '';

  if (isUiDevMode()) {
    persistNotifyEmail(trimmed, true, identity);
    console.info(
      '[feature-update-subscribe] Dev mode — email nhận thông báo:',
      previous && previous.toLowerCase() !== trimmed.toLowerCase() ? `${previous} → ${trimmed}` : trimmed,
    );
    return;
  }

  const token = accessToken?.trim() || getStoredAccessToken();
  const response = await fetch('/api/feature-update-email', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmed,
      ...(previous && isValidNotifyEmail(previous) ? { previousEmail: previous } : {}),
      ...(token ? { accessToken: token } : {}),
      version,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
    throw new Error(payload.detail ?? payload.error ?? `Subscribe failed (${response.status})`);
  }

  persistNotifyEmail(trimmed, true, identity);
};

/** Hủy đăng ký email nhận changelog — chỉ xóa localStorage khi server xác nhận */
export const unsubscribeFeatureUpdateEmail = async (
  email: string,
  accessToken?: string,
  identity?: NotifyEmailIdentity,
): Promise<void> => {
  const trimmed = email.trim();
  if (!isValidNotifyEmail(trimmed)) {
    throw new Error('Valid email is required');
  }

  if (isUiDevMode()) {
    clearStoredNotifyEmail(identity);
    console.info('[feature-update-subscribe] Dev mode — hủy email nhận thông báo:', trimmed);
    return;
  }

  const token = accessToken?.trim() || getStoredAccessToken();
  const response = await fetch('/api/feature-update-email', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmed,
      unsubscribe: true,
      ...(token ? { accessToken: token } : {}),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string; error?: string };
    throw new Error(payload.detail ?? payload.error ?? `Unsubscribe failed (${response.status})`);
  }

  clearStoredNotifyEmail(identity);
};
