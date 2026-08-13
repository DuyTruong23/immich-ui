import { getAppConfig } from '@photo-gallery/config';

/** Gửi thông báo email cho admin — fire-and-forget, không chặn luồng login */
export const notifyAdminOnLogin = (accessToken?: string): void => {
  const { publicEnv } = getAppConfig();

  if (!publicEnv.enableLoginNotify) {
    return;
  }

  const token = accessToken?.trim();
  if (!token) {
    console.warn('[login-notify] Missing accessToken, skipping notify');
    return;
  }

  void fetch('/api/notify-login', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: token,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        let parsed: { detail?: string; reason?: string; error?: string } | undefined;
        try {
          parsed = JSON.parse(detail) as { detail?: string; reason?: string; error?: string };
        } catch {
          parsed = undefined;
        }

        console.warn(
          '[login-notify] Notify failed:',
          response.status,
          parsed?.detail ?? parsed?.error ?? detail,
          parsed?.reason ? `(reason: ${parsed.reason})` : '',
        );
      }
    })
    .catch((error) => {
      console.warn('[login-notify] Failed to notify admin:', error);
    });
};
