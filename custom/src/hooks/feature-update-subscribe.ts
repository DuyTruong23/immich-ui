import { isUiDevMode } from '$custom/hooks/ui-dev-mode';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORED_EMAIL_KEY = 'pg_feature_update_notify_email';

export const isValidNotifyEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export const getStoredNotifyEmail = (): string => {
  if (typeof localStorage === 'undefined') {
    return '';
  }

  return localStorage.getItem(STORED_EMAIL_KEY)?.trim() ?? '';
};

export const hasStoredNotifyEmail = (): boolean => isValidNotifyEmail(getStoredNotifyEmail());

const persistNotifyEmail = (email: string): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORED_EMAIL_KEY, email.trim());
};

/** Đăng ký email nhận changelog — fire-and-forget, không chặn đóng modal */
export const subscribeFeatureUpdateEmail = (email: string, accessToken?: string, version?: string): void => {
  const trimmed = email.trim();
  if (!isValidNotifyEmail(trimmed)) {
    return;
  }

  persistNotifyEmail(trimmed);

  if (isUiDevMode()) {
    console.info('[feature-update-subscribe] Dev mode — email nhận thông báo:', trimmed);
    return;
  }

  void fetch('/api/feature-update-subscribe', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: trimmed,
      accessToken,
      version,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.warn('[feature-update-subscribe] Subscribe failed:', response.status, detail);
      }
    })
    .catch((error) => {
      console.warn('[feature-update-subscribe] Failed to save notification email:', error);
    });
};
