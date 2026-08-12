import { getAppConfig } from '@photo-gallery/config';

/** Gửi thông báo email cho admin — fire-and-forget, không chặn luồng login */
export const notifyAdminOnLogin = (): void => {
  const { publicEnv } = getAppConfig();

  if (!publicEnv.enableLoginNotify) {
    return;
  }

  void fetch('/api/notify-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }),
  }).catch((error) => {
    console.warn('[login-notify] Failed to notify admin:', error);
  });
};
