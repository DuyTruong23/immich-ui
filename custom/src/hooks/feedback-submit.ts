import { isUiDevMode } from '$custom/hooks/ui-dev-mode';

/** Gửi ý kiến — fire-and-forget, không chặn đóng modal */
export const submitFeedback = (message: string, accessToken?: string): void => {
  if (isUiDevMode()) {
    console.info('[feedback-submit] Dev mode — góp ý:', message);
    return;
  }

  void fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userAgent: navigator.userAgent,
      accessToken,
    }),
  }).catch((error) => {
    console.warn('[feedback-submit] Failed to send feedback:', error);
  });
};
