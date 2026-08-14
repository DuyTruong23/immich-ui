import { getStoredAccessToken } from '$custom/hooks/access-token';
import { isUiDevMode } from '$custom/hooks/ui-dev-mode';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORED_EMAIL_KEY = 'pg_feature_update_notify_email';

type StoredNotifyEmail = {
  email: string;
  confirmed: boolean;
};

export const isValidNotifyEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

const readStoredNotifyEmail = (): StoredNotifyEmail | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(STORED_EMAIL_KEY)?.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { email?: unknown; confirmed?: unknown };
    if (typeof parsed.email === 'string' && isValidNotifyEmail(parsed.email)) {
      return { email: parsed.email.trim(), confirmed: parsed.confirmed === true };
    }
  } catch {
    // Bản cũ chỉ lưu chuỗi email — chưa chắc đã ghi lên server.
    if (isValidNotifyEmail(raw)) {
      return { email: raw, confirmed: false };
    }
  }

  return null;
};

export const getStoredNotifyEmail = (): string => readStoredNotifyEmail()?.email ?? '';

/** Chỉ điền khi user đã lưu email nhận thông báo — không lấy email tài khoản. */
export const getDefaultNotifyEmail = (): string => getStoredNotifyEmail();

export const hasStoredNotifyEmail = (): boolean => isValidNotifyEmail(getStoredNotifyEmail());

export const hasConfirmedNotifyEmail = (): boolean => readStoredNotifyEmail()?.confirmed === true;

const persistNotifyEmail = (email: string, confirmed: boolean): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORED_EMAIL_KEY, JSON.stringify({ email: email.trim(), confirmed }));
};

export const clearStoredNotifyEmail = (): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(STORED_EMAIL_KEY);
};

/** Đăng ký email nhận changelog — chỉ đánh dấu đã lưu khi server xác nhận */
export const subscribeFeatureUpdateEmail = async (
  email: string,
  accessToken?: string,
  version?: string,
  previousEmail?: string,
): Promise<void> => {
  const trimmed = email.trim();
  if (!isValidNotifyEmail(trimmed)) {
    throw new Error('Valid email is required');
  }

  const previous = previousEmail?.trim() ?? '';

  if (isUiDevMode()) {
    persistNotifyEmail(trimmed, true);
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

  persistNotifyEmail(trimmed, true);
};

/** Hủy đăng ký email nhận changelog — chỉ xóa localStorage khi server xác nhận */
export const unsubscribeFeatureUpdateEmail = async (
  email: string,
  accessToken?: string,
): Promise<void> => {
  const trimmed = email.trim();
  if (!isValidNotifyEmail(trimmed)) {
    throw new Error('Valid email is required');
  }

  if (isUiDevMode()) {
    clearStoredNotifyEmail();
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

  clearStoredNotifyEmail();
};
