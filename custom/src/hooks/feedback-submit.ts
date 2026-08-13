import { isUiDevMode } from '$custom/hooks/ui-dev-mode';

/** Gửi ý kiến — fire-and-forget, không chặn đóng modal */
export const submitFeedback = (message: string, accessToken?: string): void => {
  if (isUiDevMode()) {
    console.info('[feedback-submit] Dev mode — góp ý:', message);
    return;
  }

  void fetch('/api/feedback', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userAgent: navigator.userAgent,
      accessToken,
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
          '[feedback-submit] Feedback failed:',
          response.status,
          parsed?.detail ?? parsed?.error ?? detail,
          parsed?.reason ? `(reason: ${parsed.reason})` : '',
        );
      }
    })
    .catch((error) => {
      console.warn('[feedback-submit] Failed to send feedback:', error);
    });
};
