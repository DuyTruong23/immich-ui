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

export const hasStoredNotifyEmail = (): boolean => isValidNotifyEmail(getStoredNotifyEmail());

export const hasConfirmedNotifyEmail = (): boolean => readStoredNotifyEmail()?.confirmed === true;

const persistNotifyEmail = (email: string, confirmed: boolean): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORED_EMAIL_KEY, JSON.stringify({ email: email.trim(), confirmed }));
};

/** Đăng ký email nhận changelog — fire-and-forget, không chặn đóng modal */
export const subscribeFeatureUpdateEmail = (email: string, accessToken?: string, version?: string): void => {
  const trimmed = email.trim();
  if (!isValidNotifyEmail(trimmed)) {
    return;
  }

  if (isUiDevMode()) {
    persistNotifyEmail(trimmed, true);
    console.info('[feature-update-subscribe] Dev mode — email nhận thông báo:', trimmed);
    return;
  }

  const token = accessToken?.trim() || getStoredAccessToken();

  void fetch('/api/feature-update-subscribe', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmed,
      ...(token ? { accessToken: token } : {}),
      version,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.warn('[feature-update-subscribe] Subscribe failed:', response.status, detail);
        return;
      }

      persistNotifyEmail(trimmed, true);
    })
    .catch((error) => {
      console.warn('[feature-update-subscribe] Failed to save notification email:', error);
    });
};
