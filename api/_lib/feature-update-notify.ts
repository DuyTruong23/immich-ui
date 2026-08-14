import { getEnv, sendViaResend } from './email.js';
import { compareFeatureUpdateVersion, type FeatureUpdatesConfig } from './feature-updates-config.js';
import {
  readFeatureUpdateSubscribers,
  writeFeatureUpdateSubscribers,
} from './feature-update-subscribers.js';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const resolveAppUrl = (): string => {
  const explicit = getEnv('PUBLIC_APP_URL');
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercelHost = getEnv('VERCEL_PROJECT_PRODUCTION_URL');
  return vercelHost ? `https://${vercelHost.replace(/\/$/, '')}` : '';
};

const buildUnsubscribeUrl = (appUrl: string, email: string): string | undefined => {
  if (!appUrl) {
    return undefined;
  }

  const url = new URL('/api/feature-update-subscribe', `${appUrl}/`);
  url.searchParams.set('email', email);
  url.searchParams.set('unsubscribe', '1');
  return url.toString();
};

export const buildFeatureUpdateNotifyHtml = (options: {
  appName: string;
  appUrl: string;
  email: string;
  version: string;
  items: FeatureUpdatesConfig['items'];
}): string => {
  const itemsHtml = options.items
    .map((item) => {
      const detail = item.detail?.trim()
        ? `<div style="margin-top: 0.25rem; color: #555; font-size: 0.9rem;">${escapeHtml(item.detail)}</div>`
        : '';
      return `<li style="margin: 0.75rem 0;"><strong>${escapeHtml(item.title)}</strong>${detail}</li>`;
    })
    .join('');

  const openLink = options.appUrl
    ? `<p style="margin: 1.25rem 0 0;"><a href="${escapeHtml(options.appUrl)}" style="color: #1565c0;">Mở Gallery</a></p>`
    : '';
  const unsubscribeUrl = buildUnsubscribeUrl(options.appUrl, options.email);
  const unsubscribeLink = unsubscribeUrl
    ? `<p style="margin-top: 1.5rem; font-size: 0.8rem; color: #888;"><a href="${escapeHtml(unsubscribeUrl)}" style="color: #888;">Ngừng nhận thông báo</a></p>`
    : '';

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.35rem;">Gallery vừa cập nhật ${escapeHtml(options.version)}</h2>
      <p style="color: #555; margin-top: 0;">Các thay đổi mới trên <strong>${escapeHtml(options.appName)}</strong>:</p>
      <ul style="padding-left: 1.25rem; margin: 1rem 0;">${itemsHtml}</ul>
      ${openLink}
      ${unsubscribeLink}
    </div>
  `.trim();
};

export const notifyFeatureUpdateSubscribers = async (
  config: FeatureUpdatesConfig,
): Promise<{ sent: number; skipped: boolean; reason?: string }> => {
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM') ?? getEnv('FEEDBACK_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'Photo Gallery';
  const appUrl = resolveAppUrl();

  if (!getEnv('RESEND_API_KEY') || !fromEmail) {
    return { sent: 0, skipped: true, reason: 'email_not_configured' };
  }

  const store = await readFeatureUpdateSubscribers();
  if (store.emails.length === 0) {
    return { sent: 0, skipped: true, reason: 'no_subscribers' };
  }

  if (
    store.lastNotifiedVersion &&
    compareFeatureUpdateVersion(config.version, store.lastNotifiedVersion) <= 0
  ) {
    return { sent: 0, skipped: true, reason: 'already_notified' };
  }

  let sent = 0;
  for (const email of store.emails) {
    try {
      await sendViaResend({
        to: email,
        from: fromEmail,
        subject: `[${appName}] Tính năng mới ${config.version}`,
        html: buildFeatureUpdateNotifyHtml({
          appName,
          appUrl,
          email,
          version: config.version,
          items: config.items,
        }),
      });
      sent += 1;
    } catch (error) {
      console.error('[feature-update-notify] send failed', email, error);
    }
  }

  await writeFeatureUpdateSubscribers({
    emails: store.emails,
    lastNotifiedVersion: config.version,
  });

  return { sent, skipped: false };
};
