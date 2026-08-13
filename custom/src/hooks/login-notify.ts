/** Gửi thông báo email cho admin — await trước goto() để SPA navigation không hủy fetch.
 *  Server quyết định bật/tắt (LOGIN_NOTIFY_ENABLED); client luôn gọi để tránh lệch PUBLIC_* build-time. */
export const notifyAdminOnLogin = async (accessToken?: string): Promise<void> => {
  const token = accessToken?.trim();
  if (!token) {
    console.warn('[login-notify] Missing accessToken, skipping notify');
    return;
  }

  try {
    const response = await fetch('/api/notify-login', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: token,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });

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
  } catch (error) {
    console.warn('[login-notify] Failed to notify admin:', error);
  }
};
