import { getStoredAccessToken } from '$custom/hooks/access-token';

type NotifyLoginResponse = {
  ok?: boolean;
  skipped?: boolean;
  sent?: boolean;
  reason?: string;
  emailId?: string;
  error?: string;
  detail?: string;
};

/** Gửi thông báo email cho admin — await trước goto() để SPA navigation không hủy fetch.
 *  Server quyết định bật/tắt (LOGIN_NOTIFY_ENABLED); client luôn gọi để tránh lệch PUBLIC_* build-time. */
export const notifyAdminOnLogin = async (accessToken?: string): Promise<void> => {
  const token = accessToken?.trim() || getStoredAccessToken();

  try {
    const response = await fetch('/api/notify-login', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(token ? { accessToken: token } : {}),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });

    const detail = await response.text().catch(() => '');
    let parsed: NotifyLoginResponse | undefined;
    try {
      parsed = JSON.parse(detail) as NotifyLoginResponse;
    } catch {
      parsed = undefined;
    }

    if (!response.ok) {
      console.warn(
        '[login-notify] Notify failed:',
        response.status,
        parsed?.detail ?? parsed?.error ?? detail,
        parsed?.reason ? `(reason: ${parsed.reason})` : '',
      );
      return;
    }

    if (parsed?.skipped) {
      console.warn('[login-notify] Notify skipped:', parsed.reason ?? 'unknown');
      return;
    }

    if (parsed?.sent) {
      console.info('[login-notify] Admin notified', parsed.emailId ? `(id: ${parsed.emailId})` : '');
    }
  } catch (error) {
    console.warn('[login-notify] Failed to notify admin:', error);
  }
};
